import { Parser } from "node-sql-parser";

/**
 * Static SQL validation — safety layer 2 (layer 1 is the read-only DB role).
 *
 * The model's SQL is parsed into an AST with a real Postgres grammar and must
 * pass every rule below before it is allowed anywhere near the database:
 *
 *   1. It parses, and is exactly ONE statement.
 *   2. That statement is a SELECT (WITH … SELECT is fine). No INSERT / UPDATE /
 *      DELETE / DROP / ALTER / TRUNCATE / GRANT / SET / COPY, no SELECT … INTO.
 *   3. Every table it reads is on the allow-list for this request. That rules
 *      out the app's own tables, other users' uploads, `information_schema`
 *      and `pg_catalog`.
 *   4. It calls no function that can reach outside the data (pg_sleep,
 *      pg_read_file, dblink, set_config, …).
 *
 * This module is pure (no I/O) so it can be unit-tested in isolation.
 */

export type AllowedTable = { schema: string; name: string };

export type ValidationOptions = {
  /** Tables the current request may read. */
  allowed: AllowedTable[];
  /** Schema used to resolve unqualified table names (the connection's search_path). */
  defaultSchema: string;
};

export type ValidationResult =
  | { ok: true; sql: string }
  | { ok: false; reason: string };

const MAX_SQL_LENGTH = 8000;

/** Functions that leak server state, touch the filesystem/network, or stall the connection. */
const BLOCKED_FUNCTIONS = new Set([
  "set_config",
  "current_setting",
  "version",
  "current_database",
  "current_user",
  "session_user",
  "inet_server_addr",
  "inet_server_port",
  "inet_client_addr",
  "inet_client_port",
  "nextval",
  "setval",
  "currval",
  "lastval",
  "query_to_xml",
  "query_to_xmlschema",
  "query_to_xml_and_xmlschema",
  "table_to_xml",
  "table_to_xmlschema",
  "schema_to_xml",
  "database_to_xml",
  "cursor_to_xml",
  "txid_current",
  "copy",
]);

const BLOCKED_FUNCTION_PREFIXES = ["pg_", "dblink", "lo_", "has_", "binary_upgrade"];

const SYSTEM_SCHEMAS = new Set(["pg_catalog", "information_schema", "pg_toast"]);

const parser = new Parser();

type AstNode = Record<string, unknown>;

function isNode(value: unknown): value is AstNode {
  return typeof value === "object" && value !== null;
}

/** Depth-first walk over every object in the AST. */
function walk(value: unknown, visit: (node: AstNode) => void): void {
  if (Array.isArray(value)) {
    for (const item of value) walk(item, visit);
    return;
  }
  if (!isNode(value)) return;
  visit(value);
  for (const child of Object.values(value)) walk(child, visit);
}

/** `{ name: { name: [{ value }], schema?: { value } } }` → `["pg_catalog", "version"]`. */
function functionName(node: AstNode): { schema: string | null; name: string } | null {
  if (node.type === "aggr_func") {
    return typeof node.name === "string" ? { schema: null, name: node.name.toLowerCase() } : null;
  }
  if (node.type !== "function") return null;

  const ref = node.name;
  if (typeof ref === "string") return { schema: null, name: ref.toLowerCase() };
  if (!isNode(ref)) return null;

  const parts = Array.isArray(ref.name) ? ref.name : [];
  const name = parts
    .map((part) => (isNode(part) && typeof part.value === "string" ? part.value : ""))
    .filter(Boolean)
    .join(".")
    .toLowerCase();
  const schema =
    isNode(ref.schema) && typeof ref.schema.value === "string" ? ref.schema.value.toLowerCase() : null;

  return name ? { schema, name } : null;
}

function isBlockedFunction(fn: { schema: string | null; name: string }): boolean {
  // Schema-qualified calls are never needed for analytics and are how you reach
  // the dangerous corners of pg_catalog — reject them outright.
  if (fn.schema) return true;
  if (BLOCKED_FUNCTIONS.has(fn.name)) return true;
  return BLOCKED_FUNCTION_PREFIXES.some((prefix) => fn.name.startsWith(prefix));
}

/** Friendlier version of the parser's very long "Expected … but found" errors. */
function parseErrorReason(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const found = message.match(/but (".*?"|end of input) found/);
  const where =
    isNode(error) && isNode(error.location) && isNode(error.location.start)
      ? ` at line ${String(error.location.start.line)}, column ${String(error.location.start.column)}`
      : "";
  return `SQL could not be parsed${where}${found ? ` (unexpected ${found[1]})` : ""}. Only a single PostgreSQL SELECT statement is allowed.`;
}

export function validateSelect(rawSql: string, options: ValidationOptions): ValidationResult {
  // Trailing semicolons are harmless; strip them so the query can be wrapped.
  const sql = rawSql.trim().replace(/;+\s*$/, "").trim();

  if (!sql) return { ok: false, reason: "The query is empty." };
  if (sql.length > MAX_SQL_LENGTH) {
    return { ok: false, reason: `The query is too long (max ${MAX_SQL_LENGTH} characters).` };
  }

  let parsed: ReturnType<Parser["parse"]>;
  try {
    parsed = parser.parse(sql, { database: "postgresql" });
  } catch (error) {
    return { ok: false, reason: parseErrorReason(error) };
  }

  const statements = Array.isArray(parsed.ast) ? parsed.ast : [parsed.ast];
  if (statements.length !== 1) {
    return { ok: false, reason: "Only a single statement is allowed, but several were sent." };
  }

  const statement = statements[0] as unknown as AstNode;
  if (statement.type !== "select") {
    return {
      ok: false,
      reason: `Only SELECT statements are allowed (got ${String(statement.type).toUpperCase()}). This connection is read-only.`,
    };
  }

  const cteNames = new Set<string>();
  let violation: string | null = null;

  walk(statement, (node) => {
    if (violation) return;

    // SELECT … INTO new_table would create a table.
    if (isNode(node.into) && node.into.expr != null) {
      violation = "SELECT … INTO is not allowed.";
      return;
    }
    if (node.locking_read != null) {
      violation = "Row locking clauses (FOR UPDATE / FOR SHARE) are not allowed.";
      return;
    }

    if (Array.isArray(node.with)) {
      for (const cte of node.with) {
        const name = isNode(cte) && isNode(cte.name) ? cte.name.value : null;
        if (typeof name !== "string") continue;
        // A CTE must never be able to shadow a system catalog name.
        if (name.toLowerCase().startsWith("pg_")) {
          violation = `CTE name "${name}" is not allowed.`;
          return;
        }
        cteNames.add(name.toLowerCase());
      }
    }

    const fn = functionName(node);
    if (fn && isBlockedFunction(fn)) {
      violation = `The function ${fn.schema ? `${fn.schema}.` : ""}${fn.name}() is not allowed.`;
    }
  });

  if (violation) return { ok: false, reason: violation };

  const allowedKeys = new Set(
    options.allowed.map((table) => `${table.schema.toLowerCase()}.${table.name.toLowerCase()}`),
  );
  const defaultSchema = options.defaultSchema.toLowerCase();

  // tableList entries look like "select::analytics::orders" / "select::null::orders".
  for (const entry of parsed.tableList) {
    const [operation, schemaPart, ...nameParts] = entry.split("::");
    const name = nameParts.join("::").toLowerCase();
    const schema = schemaPart === "null" || !schemaPart ? null : schemaPart.toLowerCase();

    if (operation !== "select") {
      return { ok: false, reason: `Only reading data is allowed (found ${operation.toUpperCase()}).` };
    }
    if (schema && SYSTEM_SCHEMAS.has(schema)) {
      return { ok: false, reason: `System catalogs (${schema}) are not accessible.` };
    }
    if (!schema && cteNames.has(name)) continue;

    const key = `${schema ?? defaultSchema}.${name}`;
    if (!allowedKeys.has(key)) {
      return {
        ok: false,
        reason: `Table "${schema ? `${schema}.` : ""}${name}" does not exist or is not accessible. Use only the tables returned by getSchema.`,
      };
    }
  }

  return { ok: true, sql };
}

/**
 * Wrap a validated SELECT so the database itself enforces the row cap,
 * whatever LIMIT the model did or did not write. We ask for one extra row to
 * learn whether the result was truncated.
 */
export function withRowLimit(sql: string, limit: number): string {
  // The newlines keep a trailing `-- comment` from swallowing the closing paren.
  return `SELECT * FROM (\n${sql}\n) AS askdata_result LIMIT ${Math.trunc(limit) + 1}`;
}
