"use client";

import { Trash2 } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { type ConversationSummary, useConversations, useDeleteConversation } from "@/features/chat/hooks/use-conversations";
import { messageOf } from "@/lib/api-client";
import { cn } from "@/lib/utils";

/** Split conversations into "Today" and "Earlier" by last activity. */
function groupByRecency(conversations: ConversationSummary[]) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const today = conversations.filter((item) => new Date(item.updatedAt) >= startOfToday);
  const earlier = conversations.filter((item) => new Date(item.updatedAt) < startOfToday);
  return [
    { label: "Today", items: today },
    { label: "Earlier", items: earlier },
  ].filter((group) => group.items.length > 0);
}

/** Conversation history in the sidebar, with delete on hover/focus. */
export function ConversationList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: conversations, isLoading, isError } = useConversations();
  const deleteConversation = useDeleteConversation();

  const remove = (conversation: ConversationSummary) => {
    deleteConversation.mutate(conversation.id, {
      onSuccess: () => {
        toast.success("Conversation deleted");
        // If the open conversation was deleted, leave its (now dead) page.
        if (pathname === `/app/c/${conversation.id}`) router.push("/app");
      },
      onError: (error) => toast.error(messageOf(error)),
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-2 px-2.5" aria-hidden>
        {[70, 85, 60].map((width) => (
          <div key={width} className="h-3 animate-pulse rounded-sm bg-muted" style={{ width: `${width}%` }} />
        ))}
      </div>
    );
  }

  if (isError) return <p className="px-2.5 text-[13px] text-muted-foreground">History is unavailable right now.</p>;

  if (!conversations || conversations.length === 0) {
    return <p className="px-2.5 text-[13px] text-muted-foreground">Your questions will appear here.</p>;
  }

  return (
    <div className="space-y-4">
      {groupByRecency(conversations).map((group) => (
        <section key={group.label}>
          <h2 className="label-caps px-2.5 pb-1.5 font-sans">{group.label}</h2>
          <ul>
            {group.items.map((conversation) => {
              const active = pathname === `/app/c/${conversation.id}`;
              return (
                <li key={conversation.id} className="group relative">
                  <Link
                    href={`/app/c/${conversation.id}`}
                    onClick={onNavigate}
                    title={conversation.title}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "block truncate rounded-md py-1.5 pl-2.5 pr-8 text-[13px] transition-colors hover:bg-muted",
                      active ? "bg-muted text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {conversation.title}
                  </Link>
                  <button
                    type="button"
                    onClick={() => remove(conversation)}
                    disabled={deleteConversation.isPending}
                    aria-label={`Delete conversation: ${conversation.title}`}
                    title="Delete"
                    className="absolute right-1 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-sm text-muted-foreground opacity-0 transition-opacity hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100 max-md:opacity-100"
                  >
                    <Trash2 className="size-3.5" strokeWidth={1.5} />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
