"use client";

import { useSearchParams } from "next/navigation";
import { use } from "react";
import { ChatView } from "./chat-view";

/** New chat. Reads an optional `?q=` question to ask immediately. */
export function NewChat() {
  const searchParams = useSearchParams();
  return <ChatView conversationId={null} initialQuestion={searchParams.get("q")} />;
}

/** Existing conversation. `key` gives each conversation its own state. */
export function ConversationChat({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <ChatView key={id} conversationId={id} />;
}
