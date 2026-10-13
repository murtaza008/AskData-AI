"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ChartSpec, QueryResult } from "@/lib/agent/types";
import { api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export type Pin = {
  id: string;
  title: string;
  question: string;
  sql: string;
  chart: ChartSpec;
  createdAt: string;
};

export type PinData = QueryResult & { chart: ChartSpec; refreshedAt: string };

export type NewPin = Pick<Pin, "title" | "question" | "sql" | "chart">;

export function usePins() {
  return useQuery({
    queryKey: queryKeys.pins,
    queryFn: () => api<{ pins: Pin[] }>("/api/pins"),
    select: (data) => data.pins,
  });
}

/**
 * Live data for one pinned chart. Each load re-runs the pin's stored SQL on
 * the server, so the dashboard always reflects the current data.
 */
export function usePinData(id: string) {
  return useQuery({
    queryKey: queryKeys.pinData(id),
    queryFn: () => api<PinData>(`/api/pins/${id}/data`),
    staleTime: 60_000,
    retry: false,
  });
}

export function useCreatePin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (pin: NewPin) => api<{ pin: Pin }>("/api/pins", { method: "POST", json: pin }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.pins }),
  });
}

export function useDeletePin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<{ ok: true }>(`/api/pins/${id}`, { method: "DELETE" }),
    onSuccess: (_result, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.pinData(id) });
      return queryClient.invalidateQueries({ queryKey: queryKeys.pins });
    },
  });
}
