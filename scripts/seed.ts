/**
 * npm run db:seed
 *
 * (Re)creates the demo e-commerce dataset in the `analytics` schema and makes
 * sure the public demo account exists. Safe to run repeatedly — the analytics
 * tables are dropped and rebuilt, app data is left alone.
 */
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import bcrypt from "bcryptjs";
import type { Client } from "pg";
import { DEMO_ACCOUNT } from "../src/lib/demo";
import { generateDataset } from "./lib/dataset";
import { connect, ownerUrl, READONLY_ROLE } from "./lib/db";

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

async function seedDemoUser(client: Client) {
  const table = await client.query("SELECT to_regclass('app.\"User\"') AS found");
  if (!table.rows[0].found) {
    console.log("! app tables not found — run `npm run db:migrate` first, then seed again for the demo user");
    return;
  }

  const passwordHash = await bcrypt.hash(DEMO_ACCOUNT.password, 10);
  await client.query(
    `INSERT INTO app."User" (id, email, name, "passwordHash", "isDemo")
     VALUES ($1, $2, $3, $4, true)
     ON CONFLICT (email) DO UPDATE
       SET "passwordHash" = EXCLUDED."passwordHash", name = EXCLUDED.name, "isDemo" = true`,
    [randomUUID(), DEMO_ACCOUNT.email, DEMO_ACCOUNT.name, passwordHash],
  );
  console.log(`✔ demo account   ${DEMO_ACCOUNT.email} / ${DEMO_ACCOUNT.password}`);
}

async function main() {
  const client = await connect(ownerUrl());
  try {
    await seedAnalytics(client);
    await seedDemoUser(client);
    console.log("\nSeed complete.");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("\n✖ db:seed failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
