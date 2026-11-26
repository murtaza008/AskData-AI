import "server-only";
import {
  type Breakdown,
  type Compared,
  findAttention,
  type OverviewDTO,
  type OverviewKpi,
  type PeriodDays,
} from "@/lib/overview";
import { analyticsPool } from "@/server/db/pools";

/*
 * Dashboard figures. Hand-written, trusted SQL, but it still runs on the
 * read-only analytics connection like everything else that reads the data.
 *
 * Periods are anchored to the newest order in the data (see lib/overview.ts):
 * "current" = the last N days up to and including that day, "previous" = the
 * N days before. Revenue follows the dataset's rule: cancelled and refunded
 * orders don't count.
 */

const PERIOD = `
  bounds AS (SELECT max(order_date)::date AS e FROM analytics.orders),
  scoped AS (
    SELECT o.*, (b.e - o.order_date::date) AS ago,
           CASE WHEN (b.e - o.order_date::date) < $1 THEN 'current' ELSE 'previous' END AS period
    FROM analytics.orders o, bounds b
    WHERE o.order_date::date > b.e - 2 * $1 AND o.order_date::date <= b.e
  )`;
const VALID = "status NOT IN ('cancelled', 'refunded')";

type Period = "current" | "previous";
type Pair = Record<Period, number>;
const pair = (): Pair => ({ current: 0, previous: 0 });

async function q<T extends Record<string, unknown>>(sql: string, params: unknown[]): Promise<T[]> {
  const result = await analyticsPool().query<T>(sql, params);
  return result.rows;
}

function addDays(iso: string, delta: number): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
}

function compared(rows: { label: string; period: Period; value: number }[]): Compared[] {
  const byLabel = new Map<string, Pair>();
  for (const row of rows) {
    const entry = byLabel.get(row.label) ?? pair();
    entry[row.period] = row.value;
    byLabel.set(row.label, entry);
  }
  return [...byLabel]
    .map(([label, values]) => ({ label, value: values.current, previous: values.previous }))
    .sort((a, b) => b.value - a.value);
}

export async function getDashboard(days: PeriodDays): Promise<OverviewDTO> {
  const [bounds, daily, channels, repeat, categories, regions, products, refunds] = await Promise.all([
    q<{ e: string | null }>(`SELECT max(order_date)::date::text AS e FROM analytics.orders`, []),
    q<{ ago: number; orders: number; revenue: number; customers: number }>(
      `WITH ${PERIOD}
       SELECT ago, count(*)::int AS orders, coalesce(sum(total_amount), 0)::float AS revenue
       FROM scoped WHERE ${VALID} GROUP BY ago`,
      [days],
    ),
    q<{ period: Period; channel: string; orders: number; revenue: number }>(
      `WITH ${PERIOD}
       SELECT period, channel, count(*)::int AS orders, coalesce(sum(total_amount), 0)::float AS revenue
       FROM scoped WHERE ${VALID} GROUP BY period, channel`,
      [days],
    ),
    q<{ period: Period; customers: number; repeaters: number }>(
      `WITH ${PERIOD},
       per_customer AS (SELECT period, customer_id, count(*) AS n FROM scoped WHERE ${VALID} GROUP BY period, customer_id)
       SELECT period, count(*)::int AS customers, (count(*) FILTER (WHERE n > 1))::int AS repeaters
       FROM per_customer GROUP BY period`,
      [days],
    ),
    q<{ period: Period; label: string; value: number }>(
      `WITH ${PERIOD}
       SELECT s.period, p.category AS label, sum(oi.quantity * oi.unit_price)::float AS value
       FROM scoped s JOIN analytics.order_items oi ON oi.order_id = s.id JOIN analytics.products p ON p.id = oi.product_id
       WHERE s.${VALID} GROUP BY s.period, p.category`,
      [days],
    ),
    q<{ period: Period; label: string; value: number }>(
      `WITH ${PERIOD}
       SELECT s.period, c.region AS label, sum(s.total_amount)::float AS value
       FROM scoped s JOIN analytics.customers c ON c.id = s.customer_id
       WHERE s.${VALID} GROUP BY s.period, c.region`,
      [days],
    ),
    q<{ period: Period; label: string; category: string; value: number; units: number }>(
      `WITH ${PERIOD}
       SELECT s.period, p.name AS label, p.category, sum(oi.quantity * oi.unit_price)::float AS value,
              sum(oi.quantity)::int AS units
       FROM scoped s JOIN analytics.order_items oi ON oi.order_id = s.id JOIN analytics.products p ON p.id = oi.product_id
       WHERE s.${VALID} GROUP BY s.period, p.name, p.category`,
      [days],
    ),
    // Share of each category's order-line revenue that was on refunded orders.
    q<{ period: Period; label: string; rate: number }>(
      `WITH ${PERIOD}
       SELECT s.period, p.category AS label,
              coalesce(100.0 * sum(oi.quantity * oi.unit_price) FILTER (WHERE s.status = 'refunded')
                / nullif(sum(oi.quantity * oi.unit_price), 0), 0)::float AS rate
       FROM scoped s JOIN analytics.order_items oi ON oi.order_id = s.id JOIN analytics.products p ON p.id = oi.product_id
       WHERE s.status <> 'cancelled' GROUP BY s.period, p.category`,
      [days],
    ),
  ]);

  const end = bounds[0]?.e;
  if (!end) throw new Error("The demo dataset has no orders. Run `npm run db:seed`.");
  const period = {
    days,
    start: addDays(end, -(days - 1)),
    end,
    previousStart: addDays(end, -(2 * days - 1)),
    previousEnd: addDays(end, -days),
  };

  // Daily series, oldest first: index i of the current period is `days - 1 - i` days before the end.
  const revenueCurrent = Array<number>(days).fill(0);
  const revenuePrevious = Array<number>(days).fill(0);
  const ordersCurrent = Array<number>(days).fill(0);
  for (const row of daily) {
    if (row.ago < days) {
      revenueCurrent[days - 1 - row.ago] = row.revenue;
      ordersCurrent[days - 1 - row.ago] = row.orders;
    } else revenuePrevious[2 * days - 1 - row.ago] = row.revenue;
  }

  const totals = { revenue: pair(), orders: pair() };
  const byChannel = new Map<string, { orders: number; revenue: number }>();
  for (const row of channels) {
    totals.revenue[row.period] += row.revenue;
    totals.orders[row.period] += row.orders;
    if (row.period === "current") byChannel.set(row.channel, { orders: row.orders, revenue: row.revenue });
  }
  const channelList = [...byChannel].sort((a, b) => b[1].revenue - a[1].revenue);
  const aov = (p: Period) => (totals.orders[p] ? totals.revenue[p] / totals.orders[p] : 0);
  const repeatOf = (p: Period) => {
    const row = repeat.find((r) => r.period === p);
    return row && row.customers ? (100 * row.repeaters) / row.customers : 0;
  };
  const repeatCurrent = repeat.find((r) => r.period === "current");

  const breakdown = (pick: (v: { orders: number; revenue: number }) => number): Breakdown[] =>
    channelList.map(([label, v]) => ({ label, value: pick(v) }));

  const kpis: OverviewKpi[] = [
    {
      key: "revenue",
      label: "Revenue",
      value: totals.revenue.current,
      previous: totals.revenue.previous,
      format: "currency",
      breakdown: breakdown((v) => v.revenue),
      daily: revenueCurrent,
    },
    {
      key: "orders",
      label: "Orders",
      value: totals.orders.current,
      previous: totals.orders.previous,
      format: "number",
      breakdown: breakdown((v) => v.orders),
      daily: ordersCurrent,
    },
    {
      key: "aov",
      label: "Avg order value",
      value: aov("current"),
      previous: aov("previous"),
      format: "currency",
      breakdown: breakdown((v) => (v.orders ? v.revenue / v.orders : 0)),
      daily: revenueCurrent.map((revenue, i) => (ordersCurrent[i] ? revenue / ordersCurrent[i] : 0)),
    },
    {
      key: "repeat",
      label: "Repeat customers",
      value: repeatOf("current"),
      previous: repeatOf("previous"),
      format: "percent",
      breakdown: repeatCurrent
        ? [
            { label: "Ordered more than once", value: repeatCurrent.repeaters },
            { label: "Ordered once", value: repeatCurrent.customers - repeatCurrent.repeaters },
          ]
        : [],
      daily: [],
    },
  ];

  const categoryList = compared(categories);
  const regionList = compared(regions);
  const productTotals = compared(products);
  const productMeta = new Map(products.map((row) => [row.label, row]));
  const topProducts = productTotals.slice(0, 5).map((p) => ({
    ...p,
    category: productMeta.get(p.label)?.category ?? "",
    units: products.find((row) => row.label === p.label && row.period === "current")?.units ?? 0,
  }));

  const refundRates = compared(refunds.map((r) => ({ label: r.label, period: r.period, value: r.rate }))).map((r) => ({
    label: r.label,
    current: r.value,
    previous: r.previous,
  }));

  const labels = revenueCurrent.map((_, i) => addDays(period.start, i));

  return {
    period,
    kpis,
    trend: { labels, current: revenueCurrent, previous: revenuePrevious },
    categories: categoryList,
    regions: regionList,
    topProducts,
    attention: findAttention(categoryList, regionList, refundRates, days),
  };
}
