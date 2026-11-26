import type { Metadata } from "next";
import { PageFrame } from "@/components/layout/page-frame";
import { Suspense } from "react";
import { ConversationChat } from "@/features/chat/components/chat-entry";

export const metadata: Metadata = { title: "Conversation" };

export default function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <PageFrame>
      <Suspense fallback={<div className="flex-1" />}>
        <ConversationChat params={params} />
      </Suspense>
    </PageFrame>
  );
}
