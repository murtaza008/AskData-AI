"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { type Pin, type PinData, q } from "@/lib/queries";
import { queryKeys } from "@/lib/query-keys";

export type { Pin, PinData } from "@/lib/queries";
export type NewPin = Pick<Pin, "title" | "question" | "sql" | "chart">;

export function usePins() {
  return useQuery(q.pins());
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
    // An optimistic pin has no server id yet.
    enabled: !id.startsWith("pending-"),
  });
}

/**
 * Pin an answer's chart. Optimistic: the dashboard's list gains the chart at
 * once and drops it again if the server refuses (e.g. the 24-chart limit).
 */
export function useCreatePin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (pin: NewPin) => api<{ pin: Pin }>("/api/pins", { method: "POST", json: pin }),
    onMutate: async (pin) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.pins });
      const previous = queryClient.getQueryData<{ pins: Pin[] }>(queryKeys.pins);
      if (previous) {
        const draft: Pin = { ...pin, id: `pending-${Date.now()}`, createdAt: new Date().toISOString() };
        queryClient.setQueryData<{ pins: Pin[] }>(queryKeys.pins, { pins: [draft, ...previous.pins] });
      }
      return { previous };
    },
    onError: (_error, _pin, context) => {
      if (context?.previous) queryClient.setQueryData(queryKeys.pins, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.pins }),
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
