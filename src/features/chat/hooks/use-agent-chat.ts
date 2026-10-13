"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AgentAnswer, AgentStep, TurnDTO } from "@/lib/agent/types";
import { errorMessageFrom } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { readChatStream } from "../lib/stream";
import type { ConversationDetail } from "./use-conversations";

/** The question currently being answered, with its live step trace. */
export type PendingTurn = { question: string; steps: AgentStep[] };

/** A question that failed for a reason outside the data (provider error, network, quota). */
export type FailedTurn = { question: string; message: string };

type AskOptions = {
  conversationId: string | null;
  modelId: string | null;
  /** Called once the answer is stored, with the (possibly new) conversation id. */
  onAnswered?: (conversationId: string) => void;
};

function upsertStep(steps: AgentStep[], step: AgentStep): AgentStep[] {
  const index = steps.findIndex((existing) => existing.id === step.id);
  if (index === -1) return [...steps, step];
  const next = steps.slice();
  next[index] = step;
  return next;
}

/**
 * Sends a question to POST /api/chat and consumes the streamed events:
 * step updates drive the live trace, and the final answer is written straight
 * into the TanStack Query cache so the conversation re-renders without a refetch.
 */
export function useAgentChat() {
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<PendingTurn | null>(null);
  const [failed, setFailed] = useState<FailedTurn | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Abandon an in-flight request if the chat unmounts.
  useEffect(() => () => abortRef.current?.abort(), []);

  const stop = useCallback(() => abortRef.current?.abort(), []);

  const ask = useCallback(
    async (rawQuestion: string, options: AskOptions) => {
      const question = rawQuestion.trim();
      if (!question || abortRef.current) return;

      const controller = new AbortController();
      abortRef.current = controller;
      setFailed(null);
      setPending({ question, steps: [] });

      let conversationId = options.conversationId;

      const store = (turnId: string, answer: AgentAnswer) => {
        if (!conversationId) return;
        const turn: TurnDTO = { id: turnId, question, answer, createdAt: new Date().toISOString() };
        queryClient.setQueryData<ConversationDetail>(queryKeys.conversation(conversationId), (current) => ({
          id: conversationId as string,
          title: current?.title ?? question,
          turns: [...(current?.turns ?? []), turn],
        }));
        void queryClient.invalidateQueries({ queryKey: queryKeys.conversations });
      };

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question,
            conversationId: options.conversationId ?? undefined,
            modelId: options.modelId ?? undefined,
          }),
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          setFailed({ question, message: await errorMessageFrom(response) });
          return;
        }

        let answered = false;
        for await (const event of readChatStream(response.body)) {
          if (event.type === "start") {
            conversationId = event.conversationId;
          } else if (event.type === "step") {
            setPending((current) => (current ? { ...current, steps: upsertStep(current.steps, event.step) } : current));
          } else if (event.type === "answer") {
            answered = true;
            if (event.answer.status === "error") {
              // Not stored server-side; show it as a retryable failure.
              setFailed({ question, message: event.answer.insight });
            } else {
              store(event.turnId, event.answer);
              if (conversationId) options.onAnswered?.(conversationId);
            }
          } else if (event.type === "error") {
            answered = true;
            setFailed({ question, message: event.message });
          }
        }

        if (!answered) {
          setFailed({ question, message: "The connection closed before the answer arrived. Please try again." });
        }
      } catch (error) {
        const aborted = error instanceof DOMException && error.name === "AbortError";
        setFailed(
          aborted
            ? { question, message: "Stopped." }
            : { question, message: "Couldn't reach the server. Check your connection and try again." },
        );
      } finally {
        abortRef.current = null;
        setPending(null);
      }
    },
    [queryClient],
  );

  return { ask, stop, pending, failed, dismissFailure: () => setFailed(null), isBusy: pending !== null };
}
