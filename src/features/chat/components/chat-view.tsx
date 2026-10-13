"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { buttonClass } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { Spinner } from "@/components/ui/spinner";
import { messageOf } from "@/lib/api-client";
import { useAgentChat } from "../hooks/use-agent-chat";
import { useConversation } from "../hooks/use-conversations";
import { useModels } from "../hooks/use-models";
import { AnswerTurn } from "./answer-turn";
import { ChatComposer } from "./chat-composer";
import { EmptyChat } from "./empty-chat";
import { FailedTurn } from "./failed-turn";
import { PendingTurn } from "./pending-turn";

type ChatViewProps = {
  /** null for a brand-new chat. */
  conversationId: string | null;
  /** A question to ask immediately (from a landing-page link). */
  initialQuestion?: string | null;
};

/** The chat page: conversation so far, the live turn, and the composer. */
export function ChatView({ conversationId, initialQuestion }: ChatViewProps) {
  const router = useRouter();
  // A new chat learns its id when the first answer is stored; track it locally
  // so the answer shows immediately, before the URL change has finished.
  const [createdId, setCreatedId] = useState<string | null>(null);
  const activeId = conversationId ?? createdId;
  const conversation = useConversation(activeId);
  const { selected: modelId, isConfigured } = useModels();
  const { ask, stop, pending, failed, dismissFailure, isBusy } = useAgentChat();
  const endRef = useRef<HTMLDivElement>(null);

  const turns = conversation.data?.turns ?? [];

  const handleAsk = useCallback(
    (question: string) => {
      void ask(question, {
        conversationId: activeId,
        modelId,
        // A new chat gets its permanent URL once the first answer is stored.
        // The answer is already in the query cache, so the new page renders instantly.
        onAnswered: (id) => {
          if (conversationId) return;
          setCreatedId(id);
          router.replace(`/app/c/${id}`);
        },
      });
    },
    [ask, activeId, conversationId, modelId, router],
  );

  // Auto-ask a question passed in the URL, exactly once.
  const autoAsked = useRef(false);
  useEffect(() => {
    if (!initialQuestion || autoAsked.current) return;
    autoAsked.current = true;
    window.history.replaceState(null, "", "/app");
    handleAsk(initialQuestion);
  }, [initialQuestion, handleAsk]);

  // Keep the newest content in view as steps and answers arrive.
  const stepCount = pending?.steps.length ?? 0;
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns.length, stepCount, pending?.question, failed]);

  const isEmpty = turns.length === 0 && !pending && !failed;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[860px] px-4 py-8 sm:px-6">
          {!isConfigured && (
            <Notice tone="error" title="No AI provider is configured" className="mb-8">
              Add a free <span className="num">GOOGLE_GENERATIVE_AI_API_KEY</span> to the environment and restart the
              server.
            </Notice>
          )}

          {conversationId && conversation.isLoading ? (
            <div className="flex items-center gap-2.5 pt-10 text-[14px] text-muted-foreground">
              <Spinner /> Loading conversation…
            </div>
          ) : conversationId && conversation.isError ? (
            <Notice
              tone="error"
              title="This conversation couldn't be loaded"
              action={
                <Link href="/app" className={buttonClass("outline", "sm")}>
                  Start a new question
                </Link>
              }
            >
              {messageOf(conversation.error)}
            </Notice>
          ) : isEmpty ? (
            <EmptyChat onAsk={handleAsk} disabled={isBusy || !isConfigured} />
          ) : (
            <div className="space-y-12">
              {turns.map((turn, index) => (
                <AnswerTurn
                  key={turn.id}
                  turn={turn}
                  isLatest={index === turns.length - 1 && !pending && !failed}
                  onAsk={handleAsk}
                  disabled={isBusy}
                />
              ))}
              {pending && <PendingTurn turn={pending} />}
              {failed && !pending && (
                <FailedTurn turn={failed} onRetry={() => handleAsk(failed.question)} onDismiss={dismissFailure} />
              )}
            </div>
          )}
          <div ref={endRef} className="h-px" />
        </div>
      </div>

      <ChatComposer onAsk={handleAsk} onStop={stop} isBusy={isBusy} disabled={!isConfigured} />
    </div>
  );
}
