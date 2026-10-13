import "server-only";
import { analyticsPool } from "@/server/db/pools";
import { getDataSource } from "@/server/sql/schema";

export type Kpi = {
  key: "revenue" | "orders" | "aov" | "repeat";
  label: string;
  value: number;
  /** Same metric for the preceding 30 days. */
  previous: number;
  format: "currency" | "number" | "percent";
};

export type OverviewDTO = { kpis: Kpi[]; periodLabel: string };

export type DataSourceSummary = {
  tables: { name: string; rowCount: number; columnCount: number; isUpload: boolean }[];
};

// Hand-written, parameter-free SQL: trusted code, but it still runs on the
// read-only connection like everything else that touches analytics data.
const KPI_SQL = `
WITH periods AS (
  SELECT
    CASE WHEN o.order_date >= now() - interval '30 days' THEN 'current' ELSE 'previous' END AS period,
    o.customer_id,
    o.total_amount
  FROM analytics.orders o
  WHERE o.order_date >= now() - interval '60 days'
    AND o.status NOT IN ('cancelled', 'refunded')
),
per_customer AS (
  SELECT period, customer_id, count(*) AS orders
  FROM periods
  GROUP BY period, customer_id
)
SELECT
  p.period,
  coalesce(sum(p.total_amount), 0)::float AS revenue,
  count(*)::int AS orders,
  coalesce(avg(p.total_amount), 0)::float AS aov,
  (SELECT coalesce(100.0 * count(*) FILTER (WHERE c.orders > 1) / nullif(count(*), 0), 0)::float
     FROM per_customer c WHERE c.period = p.period) AS repeat_rate
FROM periods p
GROUP BY p.period`;

type KpiRow = { period: string; revenue: number; orders: number; aov: number; repeat_rate: number };

export async function getOverview(): Promise<OverviewDTO> {
  const result = await analyticsPool().query<KpiRow>(KPI_SQL);
  const blank: KpiRow = { period: "", revenue: 0, orders: 0, aov: 0, repeat_rate: 0 };
  const current = result.rows.find((row) => row.period === "current") ?? blank;
  const previous = result.rows.find((row) => row.period === "previous") ?? blank;

  return {
    periodLabel: "Last 30 days",
    kpis: [
      { key: "revenue", label: "Revenue", value: current.revenue, previous: previous.revenue, format: "currency" },
      { key: "orders", label: "Orders", value: current.orders, previous: previous.orders, format: "number" },
      { key: "aov", label: "Avg order value", value: current.aov, previous: previous.aov, format: "currency" },
      { key: "repeat", label: "Repeat customers", value: current.repeat_rate, previous: previous.repeat_rate, format: "percent" },
    ],
  };
}

/** Table names and sizes for the "what can I ask about" chip in the chat. */
export async function getDataSourceSummary(userId: string): Promise<DataSourceSummary> {
  const { tables } = await getDataSource(userId);
  return {
    tables: tables.map((table) => ({
      name: table.schema === "analytics" ? table.name : `${table.schema}.${table.name}`,
      rowCount: table.rowCount,
      columnCount: table.columns.length,
      isUpload: table.schema !== "analytics",
    })),
  };
}
