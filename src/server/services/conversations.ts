import "server-only";
import type { AgentAnswer, TurnDTO } from "@/lib/agent/types";
import { prisma } from "@/server/db/prisma";
import { ApiError } from "@/server/http";

/** Every query here is scoped by `userId` — a user can only ever reach their own rows. */

export type ConversationSummary = { id: string; title: string; updatedAt: string };

const TITLE_MAX = 70;

function titleFrom(question: string): string {
  const clean = question.replace(/\s+/g, " ").trim();
  return clean.length > TITLE_MAX ? `${clean.slice(0, TITLE_MAX - 1).trimEnd()}…` : clean;
}

export async function listConversations(userId: string): Promise<ConversationSummary[]> {
  const rows = await prisma.conversation.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: 60,
    select: { id: true, title: true, updatedAt: true },
  });
  return rows.map((row) => ({ id: row.id, title: row.title, updatedAt: row.updatedAt.toISOString() }));
}

export async function getConversation(userId: string, id: string) {
  const conversation = await prisma.conversation.findFirst({
    where: { id, userId },
    include: { turns: { orderBy: { createdAt: "asc" } } },
  });
  if (!conversation) throw new ApiError(404, "Conversation not found.");

  const turns: TurnDTO[] = conversation.turns.map((turn) => ({
    id: turn.id,
    question: turn.question,
    answer: turn.answer as unknown as AgentAnswer,
    createdAt: turn.createdAt.toISOString(),
  }));
  return { id: conversation.id, title: conversation.title, turns };
}

/** Load an existing conversation the user owns, or start a new one titled after the question. */
export async function findOrCreateConversation(userId: string, id: string | undefined, question: string) {
  if (id) {
    const existing = await prisma.conversation.findFirst({
      where: { id, userId },
      include: { turns: { orderBy: { createdAt: "asc" }, select: { question: true, answer: true } } },
    });
    if (!existing) throw new ApiError(404, "Conversation not found.");
    return { id: existing.id, isNew: false, turns: existing.turns };
  }

  const created = await prisma.conversation.create({
    data: { userId, title: titleFrom(question) },
    select: { id: true },
  });
  return { id: created.id, isNew: true, turns: [] };
}

export async function addTurn(conversationId: string, question: string, answer: AgentAnswer): Promise<string> {
  const turn = await prisma.turn.create({
    data: { conversationId, question, answer: answer as unknown as object },
    select: { id: true },
  });
  // Touch the conversation so it moves to the top of the history list. This is
  // cosmetic, so it must never cost the user their saved answer.
  await prisma.conversation
    .update({ where: { id: conversationId }, data: { updatedAt: new Date() } })
    .catch((error) => console.error("[conversations] could not bump updatedAt:", error));
  return turn.id;
}

export async function renameConversation(userId: string, id: string, title: string): Promise<void> {
  const result = await prisma.conversation.updateMany({ where: { id, userId }, data: { title } });
  if (result.count === 0) throw new ApiError(404, "Conversation not found.");
}

export async function deleteConversation(userId: string, id: string): Promise<void> {
  const result = await prisma.conversation.deleteMany({ where: { id, userId } });
  if (result.count === 0) throw new ApiError(404, "Conversation not found.");
}

/** Remove a conversation that never got a turn (its first question failed). */
export async function discardIfEmpty(conversationId: string): Promise<void> {
  await prisma.conversation.deleteMany({ where: { id: conversationId, turns: { none: {} } } });
}

/** Questions a user asked in the last 24 hours — used for the demo account quota. */
export function countRecentQuestions(userId: string): Promise<number> {
  return prisma.turn.count({
    where: {
      conversation: { userId },
      createdAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
  });
}
