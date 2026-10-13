import type { Metadata } from "next";
import { Suspense } from "react";
import { ConversationChat } from "@/features/chat/components/chat-entry";

export const metadata: Metadata = { title: "Conversation" };

export default function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="flex-1" />}>
      <ConversationChat params={params} />
    </Suspense>
  );
}
