import { z } from "zod";
import type { AgentAnswer, ChatStreamEvent } from "@/lib/agent/types";
import { type HistoryTurn, runAgent } from "@/server/agent/run-agent";
import { env } from "@/server/env";
import { ApiError, parseJson, requireUser, route } from "@/server/http";
import {
  addTurn,
  countRecentQuestions,
  discardIfEmpty,
  findOrCreateConversation,
} from "@/server/services/conversations";
import { getDataSource } from "@/server/sql/schema";

// The agent makes several model round-trips; give it room on Vercel.
export const maxDuration = 60;

const bodySchema = z.object({
  question: z.string().trim().min(2, "Ask a question first.").max(500, "Keep questions under 500 characters."),
  conversationId: z.uuid().optional(),
  modelId: z.string().max(80).optional(),
});

/**
 * POST /api/chat — run the agent for one question.
 *
 * The response is newline-delimited JSON (`ChatStreamEvent`), flushed as the
 * agent works: a `start` event, one `step` event per trace update ("Reading
 * schema…", "Running query…", "Fixing query…"), then the final `answer`.
 */
export const POST = route(async (request: Request) => {
  const user = await requireUser();
  const body = await parseJson(request, bodySchema);

  if (user.isDemo) {
    const used = await countRecentQuestions(user.id);
    if (used >= env.demoDailyQuestions) {
      throw new ApiError(429, "The shared demo account has reached today's question limit. Create a free account to keep going.");
    }
  }

  const conversation = await findOrCreateConversation(user.id, body.conversationId, body.question);
  const history: HistoryTurn[] = conversation.turns.map((turn) => {
    const answer = turn.answer as unknown as AgentAnswer;
    return { question: turn.question, insight: answer.insight, sql: answer.sql };
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let open = true;
      const send = (event: ChatStreamEvent) => {
        if (!open) return;
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        } catch {
          open = false; // the client went away
        }
      };

      send({ type: "start", conversationId: conversation.id });

      try {
        const dataSource = await getDataSource(user.id);
        const answer = await runAgent({
          question: body.question,
          history,
          dataSource,
          modelId: body.modelId,
          onStep: (step) => send({ type: "step", step }),
          abortSignal: request.signal,
        });

        if (answer.status === "error") {
          // Provider/infra failures are not part of the conversation: don't store them.
          if (conversation.isNew) await discardIfEmpty(conversation.id);
          send({ type: "answer", turnId: crypto.randomUUID(), answer });
        } else {
          const turnId = await addTurn(conversation.id, body.question, answer);
          send({ type: "answer", turnId, answer });
        }
      } catch (error) {
        console.error("[chat]", error);
        if (conversation.isNew) await discardIfEmpty(conversation.id).catch(() => undefined);
        send({ type: "error", message: "Something went wrong while answering. Please try again." });
      } finally {
        if (open) controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      // Ask reverse proxies not to buffer, so steps appear live.
      "X-Accel-Buffering": "no",
    },
  });
});
