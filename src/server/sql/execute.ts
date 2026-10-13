import "server-only";
import type { FieldDef } from "pg";
import type { Cell, ColumnKind, QueryResult, ResultColumn, Row } from "@/lib/agent/types";
import { analyticsPool } from "@/server/db/pools";
import { env } from "@/server/env";
import { type AllowedTable, validateSelect, withRowLimit } from "./validate";

/** Schema holding the demo e-commerce dataset. */
export const ANALYTICS_SCHEMA = "analytics";
/** Schema holding per-user CSV uploads. */
export const UPLOADS_SCHEMA = "uploads";

/** The query was refused before reaching the database. */
export class QueryRejectedError extends Error {
  readonly kind = "rejected";
}

/** Postgres refused or aborted the query (bad column, timeout, …). */
export class QueryExecutionError extends Error {
  readonly kind = "execution";
}

// Postgres type OIDs → the coarse kinds the UI cares about.
const NUMBER_OIDS = new Set([20, 21, 23, 26, 700, 701, 790, 1700]);
const DATE_OIDS = new Set([1082, 1114, 1184]);
const BOOLEAN_OID = 16;

function kindOf(field: FieldDef): ColumnKind {
  if (NUMBER_OIDS.has(field.dataTypeID)) return "number";
  if (DATE_OIDS.has(field.dataTypeID)) return "date";
  if (field.dataTypeID === BOOLEAN_OID) return "boolean";
  return "text";
}

/** Make any value pg hands back safe to JSON-encode and render. */
function toCell(value: unknown, kind: ColumnKind): Cell {
  if (value === null || value === undefined) return null;
  if (kind === "number") {
    // numeric / bigint arrive as strings to avoid precision loss; analytics
    // figures comfortably fit in a double.
    const parsed = typeof value === "number" ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : String(value);
  }
  if (value instanceof Date) {
    const iso = value.toISOString();
    // Midnight UTC timestamps are almost always truncated dates — show them as such.
    return iso.endsWith("T00:00:00.000Z") ? iso.slice(0, 10) : iso;
  }
  if (typeof value === "boolean" || typeof value === "string" || typeof value === "number") return value;
  return JSON.stringify(value);
}

/** Two result columns may share a name (`a.id, b.id`); keep both, renamed. */
function uniqueColumns(fields: FieldDef[]): ResultColumn[] {
  const seen = new Map<string, number>();
  return fields.map((field) => {
    const count = seen.get(field.name) ?? 0;
    seen.set(field.name, count + 1);
    return { name: count === 0 ? field.name : `${field.name}_${count + 1}`, kind: kindOf(field) };
  });
}

function describePgError(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  const pg = error as Error & { code?: string; hint?: string };
  if (pg.code === "57014") {
    return `Query cancelled: it ran longer than the ${env.queryTimeoutMs / 1000}s limit. Simplify it or aggregate less data.`;
  }
  if (pg.code === "25006") return "This connection is read-only; data cannot be modified.";
  if (pg.code === "42501") return "Permission denied: that table is not accessible.";
  return pg.hint ? `${pg.message} (hint: ${pg.hint})` : pg.message;
}

/**
 * Validate and run one model-written (or stored) SELECT.
 *
 * Safety layers applied here, in order:
 *   - parser validation against the per-request table allow-list (validate.ts)
 *   - automatic row LIMIT enforced by wrapping the query
 *   - READ ONLY transaction on the read-only role's connection
 *   - `statement_timeout` so a slow query is cancelled by Postgres
 *   - `search_path` pinned to the analytics schema
 */
export async function runGuardedQuery(rawSql: string, allowed: AllowedTable[]): Promise<QueryResult> {
  const checked = validateSelect(rawSql, { allowed, defaultSchema: ANALYTICS_SCHEMA });
  if (!checked.ok) throw new QueryRejectedError(checked.reason);

  const limit = env.queryRowLimit;
  const started = Date.now();
  const client = await analyticsPool().connect();

  try {
    // One round trip opens the read-only transaction and applies its limits.
    // SET LOCAL only lasts for this transaction, which keeps it correct behind
    // Neon's transaction-mode connection pooler. (All three values are
    // server-side constants, never user input.)
    await client.query(
      `BEGIN TRANSACTION READ ONLY; SET LOCAL statement_timeout = ${env.queryTimeoutMs}; SET LOCAL search_path = ${ANALYTICS_SCHEMA}`,
    );

    const result = await client.query({ text: withRowLimit(checked.sql, limit), rowMode: "array" });
    const columns = uniqueColumns(result.fields);
    const truncated = result.rows.length > limit;

    const rows: Row[] = (result.rows as unknown[][]).slice(0, limit).map((values) => {
      const row: Row = {};
      columns.forEach((column, index) => {
        row[column.name] = toCell(values[index], column.kind);
      });
      return row;
    });

    return { columns, rows, rowCount: rows.length, truncated, durationMs: Date.now() - started };
  } catch (error) {
    throw new QueryExecutionError(describePgError(error));
  } finally {
    // Nothing to commit — always roll back, and never let cleanup mask the real error.
    await client.query("ROLLBACK").catch(() => undefined);
    client.release();
  }
}
