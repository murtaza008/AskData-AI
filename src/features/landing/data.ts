import snapshot from "@/features/marketing/landing-data.json";

/**
 * Real figures from the demo dataset, captured read-only by
 * scripts/gen-landing-data.ts. The public page renders without a database,
 * so it uses this snapshot; every number shown on the landing page comes from
 * here (or from running the app's own code in the browser).
 */
export const LANDING = snapshot;

export type TableStat = (typeof snapshot.tables)[number];
export type ProductStat = (typeof snapshot.topProducts)[number];

export const STORY_QUESTION = "What were our top 5 products by revenue last month?";

export const totalOrders = snapshot.tables.find((table) => table.name === "orders")?.rows ?? 0;
export const totalLines = snapshot.tables.find((table) => table.name === "order_items")?.rows ?? 0;

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
export const formatMoney = (value: number) => money.format(value);
export const formatInt = (value: number) => value.toLocaleString("en-US");

/** The insight sentence the story ends on, built from the snapshot's real numbers. */
export function storyInsight() {
  const [first, second] = snapshot.topProducts;
  const lead = first.revenue / second.revenue - 1;
  return {
    first,
    second,
    leadPercent: Math.round(lead * 100),
    month: snapshot.lastMonth.label,
  };
}

/** The query the story shows; it is the SQL that produced `topProducts` in the snapshot script. */
export const STORY_SQL = [
  "SELECT p.name AS product,",
  "       sum(oi.quantity * oi.unit_price) AS revenue",
  "FROM order_items oi",
  "JOIN orders o   ON o.id = oi.order_id",
  "JOIN products p ON p.id = oi.product_id",
  "WHERE o.status NOT IN ('cancelled', 'refunded')",
  `  AND o.order_date >= '${snapshot.lastMonth.start}'`,
  "  AND o.order_date <  date '" + snapshot.lastMonth.start + "' + interval '1 month'",
  "GROUP BY p.name",
  "ORDER BY revenue DESC",
  "LIMIT 5",
];
