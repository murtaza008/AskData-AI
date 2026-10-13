"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export type Kpi = {
  key: string;
  label: string;
  value: number;
  previous: number;
  format: "currency" | "number" | "percent";
};

export type Overview = { kpis: Kpi[]; periodLabel: string };

/** Headline KPIs for the dashboard (last 30 days vs the 30 before). */
export function useOverview() {
  return useQuery({
    queryKey: queryKeys.overview,
    queryFn: () => api<Overview>("/api/overview"),
    staleTime: 60_000,
  });
}
