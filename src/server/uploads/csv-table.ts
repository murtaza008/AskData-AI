import Papa from "papaparse";
import type { PoolClient } from "pg";
import { normalizeValue, tableSlug } from "@/lib/uploads/infer";
import type { UploadColumn, UploadColumnType } from "@/lib/uploads/types";

/**
 * Turning a parsed CSV into a Postgres table. Shared by the upload API and
 * `npm run db:seed` (which preloads the demo account's sample file), so both
 * produce identical tables.
 *
 * Deliberately free of `server-only` and app singletons: callers pass in the
 * database client, which lets plain Node scripts use it too.
 */

/** Schema that holds every uploaded table. */
export const UPLOADS_SCHEMA = "uploads";

const INSERT_CHUNK = 5000;

export const quoteIdent = (identifier: string) => `"${identifier.replace(/"/g, '""')}"`;
export const qualifiedUploadTable = (tableName: string) => `${UPLOADS_SCHEMA}.${quoteIdent(tableName)}`;

/** A cell that does not fit its column type. The message is safe to show to the user. */
export class CsvValueError extends Error {
  readonly name = "CsvValueError";
}

/** Parse CSV text into a header row and data rows (empty lines skipped, BOM removed). */
export function parseCsvText(text: string): { headers: string[]; rows: string[][] } {
  const parsed = Papa.parse<string[]>(text.replace(/^﻿/, ""), { skipEmptyLines: "greedy" });
  const [headerRow = [], ...rows] = parsed.data;
  return { headers: headerRow.map((header) => String(header ?? "")), rows };
}

/** Physical table name for a user's file: `u_<first 8 chars of user id>_<file slug>`. */
export function uploadTableBaseName(userId: string, fileName: string): string {
  return `u_${userId.replace(/[^a-z0-9]/gi, "").slice(0, 8).toLowerCase()}_${tableSlug(fileName)}`;
}

/** Normalise every cell, column by column. Throws `CsvValueError` on the first misfit. */
export function buildColumnData(columns: UploadColumn[], rows: string[][]): (string | null)[][] {
  return columns.map((column, columnIndex) =>
    rows.map((row, rowIndex) => {
      const value = normalizeValue(row[columnIndex], column.type);
      if (value === undefined) {
        throw new CsvValueError(
          `Row ${rowIndex + 2}, column "${column.originalName}": "${String(row[columnIndex]).slice(0, 40)}" is not a valid ${column.type}. Change the column type to text or fix the file.`,
        );
      }
      return value;
    }),
  );
}

function postgresType(type: UploadColumnType, values: (string | null)[]): string {
  if (type === "number") return "numeric";
  if (type === "boolean") return "boolean";
  if (type === "date") return values.some((value) => value?.includes("T")) ? "timestamp" : "date";
  return "text";
}

/**
 * Create `uploads.<tableName>`, load the rows and grant the read-only role
 * SELECT on it. Run it inside the caller's transaction.
 *
 * Only identifiers rebuilt by `toIdentifier` (a–z, 0–9, _) reach the SQL text,
 * and they are quoted; every cell value travels as a bind parameter.
 */
export async function createUploadTable(
  client: PoolClient | { query: PoolClient["query"] },
  input: { tableName: string; columns: UploadColumn[]; data: (string | null)[][]; readonlyRole: string },
): Promise<void> {
  const { tableName, columns, data, readonlyRole } = input;
  const table = qualifiedUploadTable(tableName);
  const pgTypes = columns.map((column, index) => postgresType(column.type, data[index]));
  const rowCount = data[0]?.length ?? 0;

  await client.query(
    `CREATE TABLE ${table} (${columns.map((column, index) => `${quoteIdent(column.name)} ${pgTypes[index]}`).join(", ")})`,
  );

  // One unnest() insert per chunk: every column arrives as a text[] bind
  // parameter and is cast to its real type inside Postgres.
  const names = columns.map((column) => quoteIdent(column.name)).join(", ");
  const casts = columns.map((_, index) => `c${index}::${pgTypes[index]}`).join(", ");
  const sources = columns.map((_, index) => `$${index + 1}::text[]`).join(", ");
  const aliases = columns.map((_, index) => `c${index}`).join(", ");
  const insert = `INSERT INTO ${table} (${names}) SELECT ${casts} FROM unnest(${sources}) AS source(${aliases})`;

  for (let start = 0; start < rowCount; start += INSERT_CHUNK) {
    await client.query(insert, data.map((values) => values.slice(start, start + INSERT_CHUNK)));
  }

  await client.query(`GRANT SELECT ON ${table} TO ${readonlyRole}`);
}
