import { describe, expect, it } from "vitest";
import { validateSelect, withRowLimit, type AllowedTable } from "@/server/sql/validate";

const allowed: AllowedTable[] = [
  { schema: "analytics", name: "customers" },
  { schema: "analytics", name: "products" },
  { schema: "analytics", name: "orders" },
  { schema: "analytics", name: "order_items" },
  { schema: "analytics", name: "refunds" },
  { schema: "uploads", name: "u_abc12345_sales" },
];

const check = (sql: string) => validateSelect(sql, { allowed, defaultSchema: "analytics" });

describe("validateSelect — accepts ordinary analytics queries", () => {
  const good: Record<string, string> = {
    "simple aggregate": "SELECT status, count(*) FROM orders GROUP BY status",
    "schema-qualified": "SELECT * FROM analytics.orders LIMIT 5",
    "trailing semicolon": "SELECT 1 FROM orders;",
    "joins": `SELECT p.name, sum(oi.quantity * oi.unit_price) AS revenue
              FROM order_items oi
              JOIN products p ON p.id = oi.product_id
              JOIN orders o ON o.id = oi.order_id
              WHERE o.status = 'completed'
              GROUP BY p.name ORDER BY revenue DESC LIMIT 5`,
    "CTE": `WITH monthly AS (
              SELECT date_trunc('month', order_date) AS month, sum(total_amount) AS revenue
              FROM orders GROUP BY 1)
            SELECT month, revenue FROM monthly ORDER BY month`,
    "subqueries": `SELECT c.name, (SELECT count(*) FROM orders o WHERE o.customer_id = c.id) AS n
                   FROM customers c WHERE EXISTS (SELECT 1 FROM refunds r)`,
    "window + filter + casts": `SELECT status,
              count(*) FILTER (WHERE total_amount > 100) AS big,
              round(avg(total_amount)::numeric, 2) AS avg_total,
              row_number() OVER (PARTITION BY status ORDER BY order_date) AS rn,
              CURRENT_DATE - INTERVAL '30 days' AS since
            FROM orders GROUP BY status, order_date, total_amount`,
    "union": "SELECT city FROM customers UNION SELECT name FROM products",
    "user upload table": "SELECT * FROM uploads.u_abc12345_sales",
    "unquoted mixed case folds like Postgres": "SELECT * FROM Orders",
    "trailing line comment": "SELECT 1 FROM orders -- note",
  };

  for (const [name, sql] of Object.entries(good)) {
    it(name, () => expect(check(sql)).toMatchObject({ ok: true }));
  }

  it("returns the SQL without its trailing semicolon", () => {
    expect(check("SELECT 1 FROM orders ;  ")).toEqual({ ok: true, sql: "SELECT 1 FROM orders" });
  });
});

describe("validateSelect — rejects anything that is not a safe single SELECT", () => {
  const bad: Record<string, string> = {
    "empty": "   ",
    "INSERT": "INSERT INTO orders (id) VALUES (1)",
    "UPDATE": "UPDATE orders SET status = 'x'",
    "DELETE": "DELETE FROM orders",
    "DROP": "DROP TABLE orders",
    "ALTER": "ALTER TABLE orders ADD COLUMN x int",
    "TRUNCATE": "TRUNCATE orders",
    "GRANT": "GRANT ALL ON orders TO public",
    "SET": "SET statement_timeout = 0",
    "COPY": "COPY orders TO STDOUT",
    "EXPLAIN": "EXPLAIN ANALYZE SELECT 1",
    "multiple statements": "SELECT 1 FROM orders; DROP TABLE orders",
    "stacked selects": "SELECT 1 FROM orders; SELECT 2 FROM orders",
    "SELECT INTO": "SELECT * INTO stolen FROM orders",
    "FOR UPDATE": "SELECT * FROM orders FOR UPDATE",
    "data-modifying CTE": "WITH gone AS (DELETE FROM orders RETURNING *) SELECT * FROM gone",
    "app auth table": 'SELECT * FROM app."User"',
    "app table in subquery": 'SELECT * FROM (SELECT email, "passwordHash" FROM app."User") u',
    "public schema": "SELECT * FROM public.secrets",
    "unknown table": "SELECT * FROM marketing_spend",
    "information_schema": "SELECT * FROM information_schema.tables",
    "pg_catalog qualified": "SELECT * FROM pg_catalog.pg_user",
    "pg_catalog unqualified": "SELECT * FROM pg_user",
    "catalog via union": "SELECT city FROM customers UNION SELECT usename FROM pg_user",
    "catalog shadowed by CTE name": "WITH pg_user AS (SELECT 1) SELECT * FROM pg_user",
    "another user's upload": "SELECT * FROM uploads.u_ffff0000_payroll",
    "upload without schema": "SELECT * FROM u_abc12345_sales",
    "pg_sleep": "SELECT pg_sleep(10) FROM orders",
    "pg_read_file in FROM": "SELECT * FROM pg_read_file('/etc/passwd') AS t",
    "schema-qualified function": "SELECT pg_catalog.version()",
    "set_config": "SELECT set_config('statement_timeout', '0', false) FROM orders",
    "current_setting": "SELECT current_setting('server_version') FROM orders",
    "dblink": "SELECT * FROM dblink('host=evil', 'select 1') AS t(x int)",
    "large objects": "SELECT lo_import('/etc/passwd') FROM orders",
    "privilege probing": "SELECT has_table_privilege('orders', 'insert') FROM orders",
    "query_to_xml": "SELECT query_to_xml('select 1', true, true, '') FROM orders",
    "nested blocked function": "SELECT count(*) FROM orders WHERE id > (SELECT length(version()))",
    "garbage": "this is not sql",
  };

  for (const [name, sql] of Object.entries(bad)) {
    it(name, () => {
      const result = check(sql);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason.length).toBeGreaterThan(5);
    });
  }

  it("rejects oversized queries", () => {
    const sql = `SELECT ${"1,".repeat(5000)}1 FROM orders`;
    expect(check(sql).ok).toBe(false);
  });
});

describe("withRowLimit", () => {
  it("wraps the query and asks for one extra row to detect truncation", () => {
    expect(withRowLimit("SELECT * FROM orders", 500)).toBe(
      "SELECT * FROM (\nSELECT * FROM orders\n) AS askdata_result LIMIT 501",
    );
  });

  it("is not defeated by a trailing comment", () => {
    const wrapped = withRowLimit("SELECT * FROM orders -- ) LIMIT 999999", 10);
    expect(wrapped.endsWith("\n) AS askdata_result LIMIT 11")).toBe(true);
  });
});
