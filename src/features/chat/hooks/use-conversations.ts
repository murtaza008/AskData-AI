"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { type ConversationDetail, q } from "@/lib/queries";
import { queryKeys } from "@/lib/query-keys";

export type { ConversationDetail, ConversationSummary } from "@/lib/queries";

/** Conversation history, newest first. */
export function useConversations() {
  return useQuery(q.conversations());
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
