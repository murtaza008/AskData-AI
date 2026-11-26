"use client";

import { useQuery } from "@tanstack/react-query";
import { q } from "@/lib/queries";

export type { Kpi, Overview } from "@/lib/queries";

/** Headline KPIs for the dashboard (last 30 days vs the 30 before). */
export function useOverview() {
  return useQuery(q.overview());
}
