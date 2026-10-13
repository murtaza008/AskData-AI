"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";
import { ConversationList } from "./conversation-list";
import { ModelPicker } from "./model-picker";
import { SidebarNav } from "./sidebar-nav";
import { UserMenu } from "./user-menu";

/** Workspace sidebar: navigation, conversation history, model picker, account. */
export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 shrink-0 items-center px-4">
        <Wordmark href="/app" />
      </div>

      <div className="px-3">
        <Link
          href="/app"
          onClick={onNavigate}
          className="flex w-full items-center gap-2 rounded-md border bg-card px-3 py-2 text-[14px] font-medium transition-colors hover:border-primary"
        >
          <Plus className="size-4" strokeWidth={1.5} />
          New question
        </Link>
      </div>

      <div className="mt-4 px-3">
        <SidebarNav onNavigate={onNavigate} />
      </div>

      <div className="mt-6 min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        <ConversationList onNavigate={onNavigate} />
      </div>

      <div className="shrink-0 space-y-3 border-t p-3">
        <ModelPicker />
        <UserMenu />
      </div>
    </div>
  );
}
