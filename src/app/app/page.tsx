import type { Metadata } from "next";
import { PageFrame } from "@/components/layout/page-frame";
import { Suspense } from "react";
import { NewChat } from "@/features/chat/components/chat-entry";

export const metadata: Metadata = { title: "Ask" };

export default function AskPage() {
  return (
    <PageFrame>
      <Suspense fallback={<div className="flex-1" />}>
        <NewChat />
      </Suspense>
    </PageFrame>
  );
}
