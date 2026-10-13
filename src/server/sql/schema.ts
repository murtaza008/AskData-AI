import "server-only";
import type { PoolClient } from "pg";
import { analyticsPool } from "@/server/db/pools";
import { prisma } from "@/server/db/prisma";
import { ANALYTICS_SCHEMA, UPLOADS_SCHEMA } from "./execute";
import type { AllowedTable } from "./validate";

/**
 * Schema introspection for the agent's getSchema tool.
 *
 * Besides names and types we collect what a human analyst would look at before
 * writing a query: primary/foreign keys, column comments (business rules),
 * the distinct values of low-cardinality columns ("what are the statuses?"),
 * and the range of numeric/date columns ("how far back does the data go?").
 *
 * Results are cached in memory: the demo schema changes only on re-seed, and
 * a user's uploads only when they add or remove a file (which invalidates).
 */

export type SchemaColumn = {
  name: string;
  dataType: string;
  nullable: boolean;
  isPrimaryKey: boolean;
  /** `table.column` this column points at, if it is a foreign key. */
  references: string | null;
  comment: string | null;
  /** Sample (or complete) distinct values, for text-like columns. */
  samples: string[];
  /** True when `samples` lists every distinct value in the column. */
  samplesComplete: boolean;
  min: string | null;
  max: string | null;
};

export type SchemaTable = {
  schema: string;
  name: string;
  comment: string | null;
  rowCount: number;
  columns: SchemaColumn[];
};

export type DataSource = {
  tables: SchemaTable[];
  /** Allow-list handed to the SQL validator for this request. */
  allowed: AllowedTable[];
};

const ANALYTICS_TTL_MS = 10 * 60_000;
const UPLOADS_TTL_MS = 5 * 60_000;
/** A column with at most this many distinct values is shown in full. */
const ENUM_LIMIT = 12;

type CacheEntry = { expires: number; tables: Promise<SchemaTable[]> };
const globalForCache = globalThis as unknown as { schemaCache?: Map<string, CacheEntry> };
const cache = (globalForCache.schemaCache ??= new Map<string, CacheEntry>());

function cached(key: string, ttlMs: number, load: () => Promise<SchemaTable[]>): Promise<SchemaTable[]> {
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.tables;

  // Keep the map from growing: forget everything that has expired.
  for (const [existingKey, entry] of cache) {
    if (entry.expires <= Date.now()) cache.delete(existingKey);
  }

  const tables = load();
  cache.set(key, { expires: Date.now() + ttlMs, tables });
  // Never cache a failure (e.g. the database was still waking up).
  tables.catch(() => cache.delete(key));
  return tables;
}

const quoteIdent = (identifier: string) => `"${identifier.replace(/"/g, '""')}"`;

const NUMERIC_TYPES = new Set(["smallint", "integer", "bigint", "numeric", "real", "double precision"]);
const DATE_TYPES = new Set(["date", "timestamp without time zone", "timestamp with time zone"]);
const TEXT_TYPES = new Set(["text", "character varying", "character"]);

/** SQL for one table's stats: row count, distinct samples, and min/max. */
function tableStatsSql(table: SchemaTable): string {
  const qualified = `${quoteIdent(table.schema)}.${quoteIdent(table.name)}`;
  const selections = ["count(*)::int AS row_count"];

  table.columns.forEach((column, index) => {
    const ident = quoteIdent(column.name);
    if (TEXT_TYPES.has(column.dataType)) {
      selections.push(
        `(SELECT array_agg(v) FROM (SELECT DISTINCT left(${ident}::text, 60) AS v FROM ${qualified} WHERE ${ident} IS NOT NULL LIMIT ${ENUM_LIMIT + 1}) d) AS s_${index}`,
      );
    } else if (NUMERIC_TYPES.has(column.dataType) || DATE_TYPES.has(column.dataType)) {
      const cast = column.dataType.startsWith("timestamp") ? "::date::text" : "::text";
      selections.push(`min(${ident})${cast} AS min_${index}`, `max(${ident})${cast} AS max_${index}`);
    }
  });

  return `SELECT ${selections.join(", ")} FROM ${qualified}`;
}

function applyTableStats(table: SchemaTable, stats: Record<string, unknown>): void {
  table.rowCount = Number(stats.row_count ?? 0);
  table.columns.forEach((column, index) => {
    const samples = stats[`s_${index}`];
    if (Array.isArray(samples)) {
      column.samplesComplete = samples.length <= ENUM_LIMIT;
      column.samples = (column.samplesComplete ? samples : samples.slice(0, 4)).map(String).sort();
    }
    column.min = (stats[`min_${index}`] as string | null | undefined) ?? null;
    column.max = (stats[`max_${index}`] as string | null | undefined) ?? null;
  });
}

/** Introspect every table in `schema`, or only `tableNames` when given. */
async function loadTables(schema: string, tableNames?: string[]): Promise<SchemaTable[]> {
  if (tableNames && tableNames.length === 0) return [];
  const filter = tableNames ?? null;
  // Everything runs on ONE connection: opening several in parallel is far
  // slower than a few sequential round trips when the database is remote.
  const client = await analyticsPool().connect();
  try {
    return await introspect(client, schema, filter);
  } finally {
    client.release();
  }
}

async function introspect(client: PoolClient, schema: string, filter: string[] | null): Promise<SchemaTable[]> {
  const [columns, constraints] = await Promise.all([
    client.query(
      `SELECT c.table_name, c.column_name, c.data_type, (c.is_nullable = 'YES') AS nullable,
              col_description(cls.oid, c.ordinal_position) AS column_comment,
              obj_description(cls.oid, 'pg_class') AS table_comment
       FROM information_schema.columns c
       JOIN pg_namespace ns ON ns.nspname = c.table_schema
       JOIN pg_class cls ON cls.relnamespace = ns.oid AND cls.relname = c.table_name
       WHERE c.table_schema = $1 AND ($2::text[] IS NULL OR c.table_name = ANY($2))
       ORDER BY c.table_name, c.ordinal_position`,
      [schema, filter],
    ),
    client.query(
      `SELECT con.contype, rel.relname AS table_name, att.attname AS column_name,
              frel.relname AS foreign_table, fatt.attname AS foreign_column
       FROM pg_constraint con
       JOIN pg_class rel ON rel.oid = con.conrelid
       JOIN pg_namespace ns ON ns.oid = rel.relnamespace
       JOIN LATERAL unnest(con.conkey) WITH ORDINALITY AS k(attnum, ord) ON true
       JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = k.attnum
       LEFT JOIN pg_class frel ON frel.oid = con.confrelid
       LEFT JOIN pg_attribute fatt ON fatt.attrelid = con.confrelid AND fatt.attnum = con.confkey[k.ord]
       WHERE ns.nspname = $1 AND con.contype IN ('p', 'f')`,
      [schema],
    ),
  ]);

  const keys = new Map<string, { primary: boolean; references: string | null }>();
  for (const row of constraints.rows) {
    const id = `${row.table_name}.${row.column_name}`;
    const entry = keys.get(id) ?? { primary: false, references: null };
    if (row.contype === "p") entry.primary = true;
    if (row.contype === "f") entry.references = `${row.foreign_table}.${row.foreign_column}`;
    keys.set(id, entry);
  }

  const tables = new Map<string, SchemaTable>();
  for (const row of columns.rows) {
    let table = tables.get(row.table_name);
    if (!table) {
      table = { schema, name: row.table_name, comment: row.table_comment, rowCount: 0, columns: [] };
      tables.set(row.table_name, table);
    }
    const key = keys.get(`${row.table_name}.${row.column_name}`);
    table.columns.push({
      name: row.column_name,
      dataType: row.data_type,
      nullable: row.nullable,
      isPrimaryKey: key?.primary ?? false,
      references: key?.references ?? null,
      comment: row.column_comment,
      samples: [],
      samplesComplete: false,
      min: null,
      max: null,
    });
  }

  const list = [...tables.values()];
  if (list.length === 0) return list;

  // All tables' stats in a single round trip (one statement per table).
  // The SQL is built only from identifiers the database itself just returned.
  const raw: unknown = await client.query(list.map(tableStatsSql).join("; "));
  const results = (Array.isArray(raw) ? raw : [raw]) as { rows: Record<string, unknown>[] }[];
  list.forEach((table, index) => applyTableStats(table, results[index]?.rows[0] ?? {}));
  return list;
}

export function getAnalyticsTables(): Promise<SchemaTable[]> {
  return cached("analytics", ANALYTICS_TTL_MS, () => loadTables(ANALYTICS_SCHEMA));
}

/** Tables this user uploaded (and that have not expired). */
export async function getUploadTables(userId: string): Promise<SchemaTable[]> {
  // Which uploads exist is read from the database on EVERY request. On
  // serverless hosts each route runs in its own instance, so an in-memory
  // "this user's uploads" cache cleared by the upload route would stay stale
  // everywhere else. Only the expensive part (introspecting the tables) is
  // cached, keyed by the exact set of tables — a new or deleted upload changes
  // the key, so no instance can serve an outdated list.
  const uploads = await prisma.upload.findMany({
    where: { userId, expiresAt: { gt: new Date() } },
    select: { id: true, tableName: true, originalName: true },
    orderBy: { tableName: "asc" },
  });
  if (uploads.length === 0) return [];

  // Upload ids (not table names) so a re-uploaded file with the same name is a new key.
  const key = `uploads:${userId}:${uploads.map((upload) => upload.id).join(",")}`;
  return cached(key, UPLOADS_TTL_MS, async () => {
    const tables = await loadTables(
      UPLOADS_SCHEMA,
      uploads.map((upload) => upload.tableName),
    );
    for (const table of tables) {
      const upload = uploads.find((candidate) => candidate.tableName === table.name);
      table.comment = `CSV uploaded by the user (file "${upload?.originalName ?? table.name}").`;
    }
    return tables;
  });
}

/** Drop this instance's cached introspection for a user (other instances rely on the cache key). */
export function invalidateUploadTables(userId: string): void {
  for (const key of cache.keys()) {
    if (key.startsWith(`uploads:${userId}:`)) cache.delete(key);
  }
}

/** Everything a given user may query: the demo dataset plus their own uploads. */
export async function getDataSource(userId: string): Promise<DataSource> {
  const [analytics, uploads] = await Promise.all([getAnalyticsTables(), getUploadTables(userId)]);
  const tables = [...analytics, ...uploads];
  return {
    tables,
    allowed: tables.map((table) => ({ schema: table.schema, name: table.name })),
  };
}

function describeColumn(column: SchemaColumn): string {
  const parts = [`  ${column.name} ${column.dataType}`];
  if (column.isPrimaryKey) parts.push("[PK]");
  if (column.references) parts.push(`→ ${column.references}`);
  if (column.nullable) parts.push("(nullable)");

  const notes: string[] = [];
  if (column.comment) notes.push(column.comment);
  if (column.samples.length > 0) {
    const values = column.samples.map((value) => `'${value}'`).join(", ");
    notes.push(column.samplesComplete ? `all values: ${values}` : `e.g. ${values}`);
  } else if (column.min !== null && column.max !== null && !column.isPrimaryKey && !column.references) {
    notes.push(`range ${column.min} … ${column.max}`);
  }
  return notes.length > 0 ? `${parts.join(" ")} — ${notes.join(" | ")}` : parts.join(" ");
}

/** Compact, token-efficient description of the data source for the model. */
export function renderSchemaForModel(tables: SchemaTable[]): string {
  const blocks = tables.map((table) => {
    // Demo tables resolve unqualified; uploads must carry their schema prefix.
    const name = table.schema === ANALYTICS_SCHEMA ? table.name : `${table.schema}.${table.name}`;
    const header = `${name} (${table.rowCount.toLocaleString("en-US")} rows)${table.comment ? ` — ${table.comment}` : ""}`;
    return [header, ...table.columns.map(describeColumn)].join("\n");
  });

  return [
    `Database: PostgreSQL. Today's date is ${new Date().toISOString().slice(0, 10)} (UTC).`,
    `Tables without a prefix are in schema "${ANALYTICS_SCHEMA}". Tables shown with the "${UPLOADS_SCHEMA}." prefix are CSV files the user uploaded and MUST be written with that prefix.`,
    "",
    blocks.join("\n\n"),
  ].join("\n");
}
