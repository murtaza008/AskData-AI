import type { ChartSpec, Row } from "@/lib/agent/types";

/**
 * Static illustration data for the landing and login pages, which are public
 * and must render without a database. Everything inside the app is live.
 */

export const SAMPLE_QUESTION = "What were our top 5 products by revenue last month?";

export const SAMPLE_PRODUCTS: { spec: ChartSpec; rows: Row[] } = {
  spec: { type: "bar", x: "product", y: "revenue", title: "Revenue by product", yFormat: "currency" },
  rows: [
    { product: "Merino Crew Sweater", revenue: 14190 },
    { product: "Linen Overshirt", revenue: 12371 },
    { product: "Wireless Earbuds Pro", revenue: 10877 },
    { product: "Ceramic Pour-Over Set", revenue: 9856 },
    { product: "Waxed Canvas Tote", revenue: 8930 },
  ],
};

export const SAMPLE_TREND: { spec: ChartSpec; rows: Row[] } = {
  spec: { type: "line", x: "month", y: "revenue", title: "Monthly revenue", yFormat: "currency" },
  rows: [
    { month: "Nov", revenue: 182400 },
    { month: "Dec", revenue: 201900 },
    { month: "Jan", revenue: 121300 },
    { month: "Feb", revenue: 113800 },
    { month: "Mar", revenue: 149200 },
    { month: "Apr", revenue: 158600 },
    { month: "May", revenue: 176900 },
    { month: "Jun", revenue: 162400 },
    { month: "Jul", revenue: 170100 },
    { month: "Aug", revenue: 184700 },
    { month: "Sep", revenue: 196300 },
  ],
};

export const SAFETY_LAYERS: { title: string; body: string }[] = [
  {
    title: "Read-only database role",
    body: "The agent connects with its own Postgres role that has SELECT on the analytics schema and nothing else. It cannot write, and cannot see user accounts.",
  },
  {
    title: "Every query is parsed first",
    body: "A real SQL parser checks each statement: one SELECT only, known tables only, no system catalogs, no dangerous functions. Anything else is rejected before it runs.",
  },
  {
    title: "5-second timeout",
    body: "Postgres cancels any query that runs too long, so a bad question can never tie up your database.",
  },
  {
    title: "Automatic row limit",
    body: "Results are capped by the server regardless of what the model wrote, keeping responses fast and bounded.",
  },
  {
    title: "Fixes its mistakes, never invents numbers",
    body: "When a query fails it reads the error and retries. If the data isn't there, it says so instead of guessing.",
  },
];
