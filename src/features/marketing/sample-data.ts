import type { ChartSpec, Row } from "@/lib/agent/types";
import snapshot from "./landing-data.json";

/**
 * Real figures for public pages that must render without a database: monthly
 * revenue from the read-only snapshot of the demo dataset (landing-data.json).
 */
export const SAMPLE_TREND: { spec: ChartSpec; rows: Row[] } = {
  spec: { type: "line", x: "month", y: "revenue", title: "Monthly revenue", yFormat: "currency" },
  rows: snapshot.monthlyRevenue.map((m) => ({ month: m.month, revenue: m.revenue })),
};
