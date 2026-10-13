"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { TurnDTO } from "@/lib/agent/types";
import { api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export type ConversationSummary = { id: string; title: string; updatedAt: string };
export type ConversationDetail = { id: string; title: string; turns: TurnDTO[] };

/** Sidebar history list. */
export function useConversations() {
  return useQuery({
    queryKey: queryKeys.conversations,
    queryFn: () => api<{ conversations: ConversationSummary[] }>("/api/conversations"),
    select: (data) => data.conversations,
  });
}

/** One conversation with all of its turns. Disabled for a brand-new chat. */
export function useConversation(id: string | null) {
  return useQuery({
    queryKey: queryKeys.conversation(id ?? "new"),
    queryFn: () => api<ConversationDetail>(`/api/conversations/${id}`),
    enabled: id !== null,
    // Turns are immutable and the cache is updated as answers stream in.
    staleTime: 5 * 60_000,
  });
}

export function useDeleteConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<{ ok: true }>(`/api/conversations/${id}`, { method: "DELETE" }),
    onSuccess: (_result, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.conversation(id) });
      return queryClient.invalidateQueries({ queryKey: queryKeys.conversations });
    },
  });
}

export function useRenameConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      api<{ ok: true }>(`/api/conversations/${id}`, { method: "PATCH", json: { title } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.conversations }),
  });
}
