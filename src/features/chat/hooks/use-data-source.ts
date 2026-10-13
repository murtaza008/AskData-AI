"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export type DataSourceTable = { name: string; rowCount: number; columnCount: number; isUpload: boolean };

/** The tables the signed-in user can ask about. */
export function useDataSource() {
  return useQuery({
    queryKey: queryKeys.dataSource,
    queryFn: () => api<{ tables: DataSourceTable[] }>("/api/datasource"),
    select: (data) => data.tables,
    staleTime: 5 * 60_000,
  });
}
