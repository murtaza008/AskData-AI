import type { Metadata } from "next";
import { PageFrame, PageHeader } from "@/components/layout/page-frame";
import { ConversationList } from "@/features/workspace/components/conversation-list";

export const metadata: Metadata = { title: "History" };

export default function HistoryPage() {
  return (
    <PageFrame>
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[920px] px-4 py-8 sm:px-6">
          <PageHeader
            title="History"
            description="Every question you've asked, with its answer, chart and SQL. Open one to keep going."
            className="mb-6"
          />
          <ConversationList />
        </div>
      </div>
    </PageFrame>
  );
}
