/**
 * npm run db:seed
 *
 * (Re)creates the demo e-commerce dataset in the `analytics` schema, makes
 * sure the public demo account exists, and loads the sample upload
 * (scripts/demo-data/marketing_spend.csv) into that account. Safe to run
 * repeatedly — the analytics tables and the sample upload are rebuilt, other
 * app data is left alone. Dates are anchored to today, so re-running it keeps
 * questions like "last month" or "last quarter" meaningful.
 */
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import bcrypt from "bcryptjs";
import type { Client } from "pg";
import { DEMO_ACCOUNT } from "../src/lib/demo";
import { inferColumns } from "../src/lib/uploads/infer";
import {
  buildColumnData,
  createUploadTable,
  parseCsvText,
  qualifiedUploadTable,
  uploadTableBaseName,
} from "../src/server/uploads/csv-table";
import { generateDataset } from "./lib/dataset";
import { connect, ownerUrl, READONLY_ROLE } from "./lib/db";

/** Sample upload preloaded into the demo account. */
const SAMPLE_UPLOAD_FILE = path.join(process.cwd(), "scripts", "demo-data", "marketing_spend.csv");
/** "Never expires" for the sample (the clean-up job also skips samples explicitly). */
const SAMPLE_EXPIRES_AT = "9999-12-31T00:00:00Z";
const DAY_MS = 86_400_000;

/**
 * Bulk insert by sending each column as one array and expanding it with
 * unnest() — a single round trip per table instead of one per row.
 */
async function insertColumns(
  client: Client,
  table: string,
  columns: { name: string; type: string; values: unknown[] }[],
) {
  const names = columns.map((column) => column.name).join(", ");
  const sources = columns.map((column, index) => `$${index + 1}::${column.type}[]`).join(", ");
  await client.query(
    `INSERT INTO analytics.${table} (${names}) SELECT * FROM unnest(${sources})`,
    columns.map((column) => column.values),
  );
  console.log(`✔ ${table.padEnd(12)} ${columns[0].values.length.toLocaleString("en-US")} rows`);
}

async function seedAnalytics(client: Client) {
  const ddl = await readFile(path.join(process.cwd(), "sql", "02-analytics-schema.sql"), "utf8");
  const data = generateDataset();

  await client.query("BEGIN");
  try {
    await client.query(ddl);

    await insertColumns(client, "customers", [
      { name: "id", type: "int", values: data.customers.map((row) => row.id) },
      { name: "name", type: "text", values: data.customers.map((row) => row.name) },
      { name: "email", type: "text", values: data.customers.map((row) => row.email) },
      { name: "segment", type: "text", values: data.customers.map((row) => row.segment) },
      { name: "region", type: "text", values: data.customers.map((row) => row.region) },
      { name: "country", type: "text", values: data.customers.map((row) => row.country) },
      { name: "city", type: "text", values: data.customers.map((row) => row.city) },
      { name: "signup_date", type: "date", values: data.customers.map((row) => row.signupDate) },
    ]);

    await insertColumns(client, "products", [
      { name: "id", type: "int", values: data.products.map((row) => row.id) },
      { name: "name", type: "text", values: data.products.map((row) => row.name) },
      { name: "category", type: "text", values: data.products.map((row) => row.category) },
      { name: "price", type: "numeric", values: data.products.map((row) => row.price) },
      { name: "cost", type: "numeric", values: data.products.map((row) => row.cost) },
      { name: "is_active", type: "boolean", values: data.products.map((row) => row.isActive) },
      { name: "launched_at", type: "date", values: data.products.map((row) => row.launchedAt) },
    ]);

    await insertColumns(client, "orders", [
      { name: "id", type: "int", values: data.orders.map((row) => row.id) },
      { name: "customer_id", type: "int", values: data.orders.map((row) => row.customerId) },
      { name: "order_date", type: "timestamptz", values: data.orders.map((row) => row.orderDate) },
      { name: "status", type: "text", values: data.orders.map((row) => row.status) },
      { name: "channel", type: "text", values: data.orders.map((row) => row.channel) },
      { name: "total_amount", type: "numeric", values: data.orders.map((row) => row.totalAmount) },
    ]);

    await insertColumns(client, "order_items", [
      { name: "id", type: "int", values: data.orderItems.map((row) => row.id) },
      { name: "order_id", type: "int", values: data.orderItems.map((row) => row.orderId) },
      { name: "product_id", type: "int", values: data.orderItems.map((row) => row.productId) },
      { name: "quantity", type: "int", values: data.orderItems.map((row) => row.quantity) },
      { name: "unit_price", type: "numeric", values: data.orderItems.map((row) => row.unitPrice) },
    ]);

    await insertColumns(client, "refunds", [
      { name: "id", type: "int", values: data.refunds.map((row) => row.id) },
      { name: "order_id", type: "int", values: data.refunds.map((row) => row.orderId) },
      { name: "amount", type: "numeric", values: data.refunds.map((row) => row.amount) },
      { name: "reason", type: "text", values: data.refunds.map((row) => row.reason) },
      { name: "refunded_at", type: "timestamptz", values: data.refunds.map((row) => row.refundedAt) },
    ]);

    // The tables were just recreated, so re-grant in case db:setup ran earlier
    // (default privileges cover this too; the explicit grant keeps it obvious).
    const role = await client.query("SELECT 1 FROM pg_roles WHERE rolname = $1", [READONLY_ROLE]);
    if (role.rowCount) {
      await client.query(`GRANT SELECT ON ALL TABLES IN SCHEMA analytics TO ${READONLY_ROLE}`);
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }

  await client.query("ANALYZE analytics.customers, analytics.products, analytics.orders, analytics.order_items, analytics.refunds");
}

/** Ensure the demo account exists. Returns its id, or null when the app tables are missing. */
async function seedDemoUser(client: Client): Promise<string | null> {
  const table = await client.query("SELECT to_regclass('app.\"User\"') AS found");
  if (!table.rows[0].found) {
    console.log("! app tables not found — run `npm run db:migrate` first, then seed again for the demo user");
    return null;
  }

  const passwordHash = await bcrypt.hash(DEMO_ACCOUNT.password, 10);
  const result = await client.query<{ id: string }>(
    `INSERT INTO app."User" (id, email, name, "passwordHash", "isDemo")
     VALUES ($1, $2, $3, $4, true)
     ON CONFLICT (email) DO UPDATE
       SET "passwordHash" = EXCLUDED."passwordHash", name = EXCLUDED.name, "isDemo" = true
     RETURNING id`,
    [randomUUID(), DEMO_ACCOUNT.email, DEMO_ACCOUNT.name, passwordHash],
  );
  console.log(`✔ demo account   ${DEMO_ACCOUNT.email} / ${DEMO_ACCOUNT.password}`);
  return result.rows[0].id;
}

/** Monday 00:00 UTC of the week containing `date`. */
function mondayOf(date: Date): Date {
  const day = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  return new Date(day.getTime() - ((day.getUTCDay() + 6) % 7) * DAY_MS);
}

/**
 * Shift every date column by whole weeks so the file's latest week is the
 * most recent complete week. The CSV in the repo has fixed dates; without
 * this the demo's "last quarter" would drift out of range over time.
 */
function shiftDatesToRecent(columns: { type: string }[], data: (string | null)[][]): number {
  const dateColumns = columns.flatMap((column, index) => (column.type === "date" ? [index] : []));
  const latest = Math.max(
    ...dateColumns.flatMap((index) => data[index].map((value) => (value ? Date.parse(`${value.slice(0, 10)}T00:00:00Z`) : NaN))).filter(Number.isFinite),
  );
  if (!Number.isFinite(latest)) return 0;

  const target = mondayOf(new Date()).getTime() - 7 * DAY_MS;
  const weeks = Math.round((target - mondayOf(new Date(latest)).getTime()) / (7 * DAY_MS));
  if (weeks === 0) return 0;

  for (const index of dateColumns) {
    data[index] = data[index].map((value) => {
      if (!value) return value;
      const shifted = new Date(Date.parse(`${value.slice(0, 10)}T00:00:00Z`) + weeks * 7 * DAY_MS);
      return `${shifted.toISOString().slice(0, 10)}${value.slice(10)}`;
    });
  }
  return weeks;
}

/**
 * Load marketing_spend.csv into the demo account as a permanent sample upload,
 * through the same code path the upload API uses. Rebuilt on every seed.
 */
async function seedSampleUpload(client: Client, demoUserId: string) {
  const role = await client.query("SELECT 1 FROM pg_roles WHERE rolname = $1", [READONLY_ROLE]);
  if (!role.rowCount) {
    console.log("! read-only role missing — run `npm run db:setup`, then seed again for the sample upload");
    return;
  }

  const fileName = path.basename(SAMPLE_UPLOAD_FILE);
  const text = await readFile(SAMPLE_UPLOAD_FILE, "utf8");
  const { headers, rows } = parseCsvText(text);
  const columns = inferColumns(headers, rows);
  const data = buildColumnData(columns, rows);
  const weeks = shiftDatesToRecent(columns, data);
  const tableName = uploadTableBaseName(demoUserId, fileName);

  await client.query("BEGIN");
  try {
    // Remove the previous sample, plus any copy of the same file a demo visitor uploaded.
    const previous = await client.query<{ tableName: string }>(
      `SELECT "tableName" FROM app."Upload" WHERE ("userId" = $1 AND "isSample") OR "tableName" = $2`,
      [demoUserId, tableName],
    );
    for (const { tableName: name } of [...previous.rows, { tableName }]) {
      await client.query(`DROP TABLE IF EXISTS ${qualifiedUploadTable(name)}`);
    }
    await client.query(`DELETE FROM app."Upload" WHERE ("userId" = $1 AND "isSample") OR "tableName" = $2`, [
      demoUserId,
      tableName,
    ]);

    await createUploadTable(client, { tableName, columns, data, readonlyRole: READONLY_ROLE });
    await client.query(
      `INSERT INTO app."Upload" (id, "userId", "tableName", "originalName", columns, "rowCount", "sizeBytes", "expiresAt", "isSample")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)`,
      [randomUUID(), demoUserId, tableName, fileName, JSON.stringify(columns), rows.length, Buffer.byteLength(text), SAMPLE_EXPIRES_AT],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }

  const shifted = weeks === 0 ? "" : ` · dates moved ${weeks > 0 ? "+" : ""}${weeks} weeks`;
  console.log(`✔ sample upload  uploads.${tableName} (${rows.length} rows${shifted})`);
}

async function main() {
  const client = await connect(ownerUrl());
  try {
    await seedAnalytics(client);
    const demoUserId = await seedDemoUser(client);
    if (demoUserId) await seedSampleUpload(client, demoUserId);
    console.log("\nSeed complete.");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("\n✖ db:seed failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
