"use client";

import * as D from "@radix-ui/react-dialog";
import { useQuery } from "@tanstack/react-query";
import {
  CornerDownLeft,
  FileUp,
  LogOut,
  MessageSquareText,
  Monitor,
  Moon,
  Pin,
  Plus,
  Search,
  Sun,
  Table2,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { switchTheme } from "@/components/layout/theme-toggle";
import { SUGGESTED_QUESTIONS } from "@/lib/demo";
import { formatCount, formatRelative } from "@/lib/format";
import { q } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "../nav";


type Group = "Pages" | "Conversations" | "Pinned charts" | "Tables" | "Questions to try" | "Actions";
const ORDER: Group[] = ["Pages", "Conversations", "Pinned charts", "Tables", "Questions to try", "Actions"];

type Command = {
  id: string;
  group: Group;
  label: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  keywords?: string;
  run: () => void;
};

function score(command: Command, needle: string): number {
  if (!needle) return 1;
  const label = command.label.toLowerCase();
  if (label.startsWith(needle)) return 4;
  if (label.split(/\W+/).some((word) => word.startsWith(needle))) return 3;
  if (label.includes(needle)) return 2;
  const extra = `${command.keywords ?? ""} ${command.hint ?? ""}`.toLowerCase();
  return extra.includes(needle) ? 1 : 0;
}

/** Ctrl/Cmd+K: jump to pages and records, or run an action. Loaded lazily on first use. */
export default function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const { setTheme } = useTheme();
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const conversations = useQuery({ ...q.conversations(), enabled: open });
  const pins = useQuery({ ...q.pins(), enabled: open });
  const tables = useQuery({ ...q.dataSource(), enabled: open });

  const commands = useMemo<Command[]>(() => {
    const go = (href: string) => () => router.push(href);
    return [
      ...NAV_ITEMS.map((item) => ({
        id: `page-${item.href}`,
        group: "Pages" as const,
        label: item.label,
        hint: item.description,
        icon: item.icon,
        keywords: item.keywords,
        run: go(item.href),
      })),
      ...(conversations.data ?? []).map((c) => ({
        id: `conv-${c.id}`,
        group: "Conversations" as const,
        label: c.title,
        hint: formatRelative(c.updatedAt),
        icon: MessageSquareText,
        run: go(`/app/c/${c.id}`),
      })),
      ...(pins.data ?? []).map((p) => ({
        id: `pin-${p.id}`,
        group: "Pinned charts" as const,
        label: p.title,
        hint: p.question,
        icon: Pin,
        keywords: p.question,
        run: go("/app/dashboard"),
      })),
      ...(tables.data ?? []).map((t) => ({
        id: `table-${t.name}`,
        group: "Tables" as const,
        label: t.name,
        hint: `${formatCount(t.rowCount)} rows · ${t.columnCount} columns${t.isUpload ? " · uploaded" : ""}`,
        icon: Table2,
        keywords: "table schema data",
        run: go("/app/upload"),
      })),
      ...SUGGESTED_QUESTIONS.map((question) => ({
        id: `ask-${question}`,
        group: "Questions to try" as const,
        label: question,
        hint: "Asks it now",
        icon: MessageSquareText,
        run: go(`/app?q=${encodeURIComponent(question)}`),
      })),
      { id: "new", group: "Actions", label: "New question", icon: Plus, keywords: "ask chat start", run: go("/app") },
      { id: "upload", group: "Actions", label: "Upload a CSV", icon: FileUp, keywords: "import file data", run: go("/app/upload") },
      { id: "light", group: "Actions", label: "Use light theme", icon: Sun, keywords: "appearance", run: () => switchTheme("light", setTheme) },
      { id: "dark", group: "Actions", label: "Use dark theme", icon: Moon, keywords: "appearance", run: () => switchTheme("dark", setTheme) },
      { id: "system", group: "Actions", label: "Use system theme", icon: Monitor, keywords: "appearance", run: () => switchTheme("system", setTheme) },
      { id: "signout", group: "Actions", label: "Sign out", icon: LogOut, keywords: "logout", run: () => void signOut({ redirectTo: "/" }) },
    ];
  }, [router, setTheme, conversations.data, pins.data, tables.data]);

  const needle = query.trim().toLowerCase();
  const grouped = useMemo(() => {
    const scored = commands
      .map((command) => ({ command, s: score(command, needle) }))
      .filter((entry) => entry.s > 0)
      .sort((a, b) => b.s - a.s);
    const perGroup = needle ? 8 : 4;
    return ORDER.map((group) => ({
      group,
      items: scored
        .filter((entry) => entry.command.group === group)
        .slice(0, perGroup)
        .map((entry) => entry.command),
    })).filter((entry) => entry.items.length > 0);
  }, [commands, needle]);

  const flat = grouped.flatMap((entry) => entry.items);
  const activeIndex = Math.min(index, Math.max(flat.length - 1, 0));
  const active = flat[activeIndex];

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const run = (command: Command | undefined) => {
    if (!command) return;
    onOpenChange(false);
    command.run();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setIndex((activeIndex + 1) % Math.max(flat.length, 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setIndex((activeIndex - 1 + flat.length) % Math.max(flat.length, 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      run(active);
    }
  };

  let position = -1;
  return (
    <D.Root
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) {
          setQuery("");
          setIndex(0);
        }
      }}
    >
      <D.Portal>
        <D.Overlay className="animate-fade fixed inset-0 z-50 bg-[var(--overlay)]" />
        <D.Content
          aria-describedby={undefined}
          className="panel-raised animate-pop fixed left-1/2 top-[12vh] z-50 flex max-h-[72vh] w-[calc(100vw-2rem)] max-w-[620px] -translate-x-1/2 flex-col overflow-hidden outline-none"
        >
          <D.Title className="sr-only">Search and commands</D.Title>
          <div className="flex items-center gap-3 border-b px-4">
            <Search aria-hidden className="size-4 shrink-0 text-fg-subtle" />
            <input
              autoFocus
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setIndex(0);
              }}
              onKeyDown={onKeyDown}
              placeholder="Search pages, conversations, charts, tables…"
              aria-label="Search pages, conversations, charts and tables"
              role="combobox"
              aria-expanded="true"
              aria-controls="palette-list"
              aria-activedescendant={active ? `palette-${active.id}` : undefined}
              className="h-12 min-w-0 flex-1 bg-transparent text-[15px] text-fg placeholder:text-fg-subtle focus:outline-none"
            />
            <kbd className="num hidden rounded-xs border bg-sunken px-1.5 py-0.5 text-[11px] text-fg-muted sm:block">Esc</kbd>
          </div>
          <div ref={listRef} id="palette-list" role="listbox" aria-label="Results" className="flex-1 overflow-y-auto p-1.5">
            {flat.length === 0 ? (
              <p className="px-3 py-8 text-center text-[14px] text-fg-muted">No matches for “{query}”.</p>
            ) : (
              grouped.map((entry) => (
                <div key={entry.group} role="group" aria-labelledby={`palette-group-${entry.group}`} className="mb-1">
                  <p id={`palette-group-${entry.group}`} className="eyebrow px-2.5 pb-1 pt-2.5">
                    {entry.group}
                  </p>
                  {entry.items.map((command) => {
                    position += 1;
                    const mine = position;
                    const Icon = command.icon;
                    const selected = mine === activeIndex;
                    return (
                      <div
                        key={command.id}
                        id={`palette-${command.id}`}
                        role="option"
                        aria-selected={selected}
                        data-index={mine}
                        onPointerMove={() => setIndex(mine)}
                        onClick={() => run(command)}
                        className={cn(
                          "flex cursor-pointer items-center gap-3 rounded-sm px-2.5 py-2 text-[14px]",
                          selected ? "bg-sunken text-fg" : "text-fg",
                        )}
                      >
                        <Icon aria-hidden className={cn("size-4 shrink-0", selected ? "text-accent-text" : "text-fg-subtle")} />
                        <span className="min-w-0 flex-1 truncate">{command.label}</span>
                        {command.hint && (
                          <span className="hidden max-w-[45%] truncate text-[12.5px] text-fg-muted sm:block">{command.hint}</span>
                        )}
                        {selected && <CornerDownLeft aria-hidden className="size-3.5 shrink-0 text-fg-subtle" />}
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
          <div className="flex items-center gap-4 border-t bg-surface-2 px-4 py-2 text-[12px] text-fg-muted">
            <span>
              <kbd className="num">↑↓</kbd> to move
            </span>
            <span>
              <kbd className="num">Enter</kbd> to open
            </span>
          </div>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
