"use client";

import { useQuery } from "@tanstack/react-query";
import { q } from "@/lib/queries";

export type { DataSourceTable } from "@/lib/queries";

/** The tables the signed-in user can ask about. */
export function useDataSource() {
  return useQuery(q.dataSource());
}
