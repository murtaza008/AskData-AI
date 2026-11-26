"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { PeriodDays } from "@/lib/overview";
import { q } from "@/lib/queries";

export type { Kpi, Overview } from "@/lib/queries";

/** Dashboard figures for the last `days` days of data, compared with the days before. */
export function useOverview(days: PeriodDays = 30) {
  // Keep showing the previous period's numbers while a new period loads, so they count to the new values.
  return useQuery({ ...q.overview(days), placeholderData: keepPreviousData });
}
