"use client";

import { Check, MessageSquareText, Pencil, Search, Trash2, X } from "lucide-react";
import Link from "next/link";
import { type FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";
import { buttonClass } from "@/components/ui/button";
import { HoverCard, HoverTitle } from "@/components/ui/hover-card";
import { IconButton } from "@/components/ui/icon-button";
import { Notice } from "@/components/ui/notice";
import {
  type ConversationSummary,
  useConversations,
  useDeleteConversation,
  useRenameConversation,
} from "@/features/chat/hooks/use-conversations";
import { messageOf } from "@/lib/api-client";
import { formatRelative } from "@/lib/format";
import { useAccount } from "@/lib/hooks/use-account";
import { cn } from "@/lib/utils";

/** Group conversations by last activity: Today, This week, Earlier. */
function groupByRecency(conversations: ConversationSummary[], now: number) {
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const today = startOfToday.getTime();
  const week = today - 6 * 86_400_000;
  const groups = [
    { label: "Today", items: [] as ConversationSummary[] },
    { label: "This week", items: [] as ConversationSummary[] },
    { label: "Earlier", items: [] as ConversationSummary[] },
  ];
  for (const item of conversations) {
    const at = Date.parse(item.updatedAt);
    groups[at >= today ? 0 : at >= week ? 1 : 2].items.push(item);
  }
  return groups.filter((group) => group.items.length > 0);
}

function Row({ conversation, index, canEdit }: { conversation: ConversationSummary; index: number; canEdit: boolean }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(conversation.title);
  const rename = useRenameConversation();
  const remove = useDeleteConversation();

  const save = (event: FormEvent) => {
    event.preventDefault();
    const next = title.trim();
    if (!next || next === conversation.title) return setEditing(false);
    setEditing(false);
    rename.mutate(
      { id: conversation.id, title: next },
      { onError: (error) => toast.error(messageOf(error)), onSuccess: () => toast.success("Renamed") },
    );
  };

  return (
    <li className="stagger-item group flex items-center gap-3 px-4 py-3" style={{ ["--i" as string]: index }}>
      <MessageSquareText aria-hidden className="size-4 shrink-0 text-fg-subtle" strokeWidth={1.75} />
      {editing ? (
        <form onSubmit={save} className="flex min-w-0 flex-1 items-center gap-2">
          <input
            autoFocus
            value={title}
            maxLength={120}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => event.key === "Escape" && setEditing(false)}
            aria-label="Conversation title"
            className="h-8 min-w-0 flex-1 rounded-sm border bg-surface px-2 text-[14px] focus:border-accent focus:outline-none"
          />
          <IconButton label="Save title" type="submit">
            <Check aria-hidden className="size-4" />
          </IconButton>
          <IconButton label="Cancel rename" onClick={() => setEditing(false)}>
            <X aria-hidden className="size-4" />
          </IconButton>
        </form>
      ) : (
        <>
          <HoverCard
            delay="long"
            width={340}
            trigger={
              <Link href={`/app/c/${conversation.id}`} className="min-w-0 flex-1 truncate text-[14.5px] text-fg hover:text-accent-text">
                {rename.isPending ? title : conversation.title}
              </Link>
            }
          >
            <HoverTitle meta={`${conversation.turns} ${conversation.turns === 1 ? "question" : "questions"}`}>
              {conversation.title}
            </HoverTitle>
            {conversation.lastInsight ? (
              <p className="mt-2 line-clamp-4 text-fg-muted">{conversation.lastInsight.replace(/\*\*/g, "")}</p>
            ) : (
              <p className="mt-2 text-fg-muted">No answer stored yet.</p>
            )}
            {conversation.lastChartType && (
              <p className="mt-2 text-[12px] text-fg-muted">
                Latest result: {conversation.lastChartType === "table" ? "a table" : `a ${conversation.lastChartType} chart`}
              </p>
            )}
          </HoverCard>
          <span className="num shrink-0 text-[12px] text-fg-muted">{formatRelative(conversation.updatedAt)}</span>
          {canEdit && (
            <span className="flex shrink-0 gap-0.5 opacity-100 transition-opacity md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100">
              <IconButton label={`Rename: ${conversation.title}`} onClick={() => setEditing(true)}>
                <Pencil aria-hidden className="size-3.5" />
              </IconButton>
              <IconButton
                label={`Delete: ${conversation.title}`}
                className="hover:text-danger-text"
                disabled={remove.isPending}
                onClick={() =>
                  remove.mutate(conversation.id, {
                    onSuccess: () => toast.success("Conversation deleted"),
                    onError: (error) => toast.error(messageOf(error)),
                  })
                }
              >
                <Trash2 aria-hidden className="size-3.5" />
              </IconButton>
            </span>
          )}
        </>
      )}
    </li>
  );
}

/** The full conversation history with search, rename and delete. */
export function ConversationList() {
  const { data: conversations, isLoading, isError, error, dataUpdatedAt } = useConversations();
  const { isDemo, isLoading: accountLoading } = useAccount();
  const [filter, setFilter] = useState("");
  // Grouping needs "now": when the list was fetched (pure, and only known in the browser).
  const now = dataUpdatedAt;

  const visible = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    return (conversations ?? []).filter((c) => !needle || c.title.toLowerCase().includes(needle));
  }, [conversations, filter]);

  if (isLoading) {
    return (
      <div className="panel divide-y" role="status" aria-busy="true" aria-label="Loading conversations">
        {[70, 52, 84, 61].map((width) => (
          <div key={width} className="flex items-center gap-3 px-4 py-3.5">
            <div className="size-4 rounded-xs bg-sunken" />
            <div className="h-3 animate-pulse rounded-xs bg-sunken" style={{ width: `${width}%` }} />
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <Notice tone="error" title="History couldn't be loaded">
        {messageOf(error)}
      </Notice>
    );
  }

  if (!conversations || conversations.length === 0) {
    return (
      <div className="panel px-6 py-12 text-center">
        <p className="font-medium text-fg">No conversations yet</p>
        <p className="mt-1 text-[14px] text-fg-muted">Each question you ask is saved here with its answer, chart and SQL.</p>
        <Link href="/app" className={buttonClass("primary", "md", "mt-5")}>
          Ask a question
        </Link>
      </div>
    );
  }

  const canEdit = !accountLoading && !isDemo;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="relative min-w-0 flex-1 sm:max-w-sm">
          <span className="sr-only">Filter conversations</span>
          <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" />
          <input
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder="Filter by title"
            className="h-9 w-full rounded-sm border bg-surface pl-9 pr-3 text-[14px] placeholder:text-fg-subtle focus:border-accent focus:outline-none"
          />
        </label>
        <span className="num text-[12.5px] text-fg-muted">
          {visible.length} of {conversations.length}
        </span>
      </div>

      {isDemo && !accountLoading && (
        <p className="text-[13px] text-fg-muted">
          This is the shared demo account, so conversations can&apos;t be renamed or deleted here: the examples stay for the
          next visitor.
        </p>
      )}

      {visible.length === 0 ? (
        <p className="panel px-4 py-8 text-center text-[14px] text-fg-muted">No conversation titles match “{filter}”.</p>
      ) : (
        groupByRecency(visible, now).map((group) => (
          <section key={group.label} aria-labelledby={`history-${group.label}`}>
            <h2 id={`history-${group.label}`} className="eyebrow mb-2">
              {group.label}
            </h2>
            <ul className={cn("panel divide-y overflow-hidden")}>
              {group.items.map((conversation, index) => (
                <Row key={conversation.id} conversation={conversation} index={index} canEdit={canEdit} />
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
