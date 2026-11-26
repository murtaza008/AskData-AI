"use client";

import * as D from "@radix-ui/react-dialog";
import { LogOut, Menu as MenuIcon, Settings, X } from "lucide-react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Wordmark } from "@/components/brand/wordmark";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { IconButton } from "@/components/ui/icon-button";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, type NavItem } from "../nav";

const GROUPS: NavItem["group"][] = ["Analyze", "Monitor", "Sources"];

/** Touch navigation: a sheet from the left with grouped links. No hover cards in here. */
export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <D.Root open={open} onOpenChange={setOpen}>
      <D.Trigger asChild>
        <IconButton label="Open menu" className="md:hidden">
          <MenuIcon aria-hidden className="size-5" strokeWidth={1.75} />
        </IconButton>
      </D.Trigger>
      <D.Portal>
        <D.Overlay className="animate-fade fixed inset-0 z-50 bg-[var(--overlay)]" />
        <D.Content
          aria-describedby={undefined}
          className="animate-sheet fixed inset-y-0 left-0 z-50 flex w-[300px] max-w-[86vw] flex-col border-r bg-surface shadow-[var(--shadow-lg)] outline-none"
        >
          <D.Title className="sr-only">Menu</D.Title>
          <div className="flex h-14 items-center justify-between border-b px-4">
            <Wordmark href="/app" />
            <D.Close asChild>
              <IconButton label="Close menu">
                <X aria-hidden className="size-4" />
              </IconButton>
            </D.Close>
          </div>
          <nav aria-label="Main" className="flex-1 overflow-y-auto p-3">
            {GROUPS.map((group) => (
              <div key={group} className="mb-4">
                <p className="eyebrow px-2.5 pb-1.5">{group}</p>
                <ul>
                  {NAV_ITEMS.filter((item) => item.group === group).map((item) => {
                    const active = item.match(pathname);
                    const Icon = item.icon;
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={() => setOpen(false)}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "flex items-start gap-3 rounded-md px-2.5 py-2.5",
                            active ? "bg-accent-soft text-fg" : "text-fg-muted hover:bg-sunken hover:text-fg",
                          )}
                        >
                          <Icon aria-hidden className={cn("mt-0.5 size-4 shrink-0", active && "text-accent-text")} strokeWidth={1.75} />
                          <span>
                            <span className="block text-[15px] font-medium text-fg">{item.label}</span>
                            <span className="block text-[13px] leading-snug text-fg-muted">{item.description}</span>
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
          <div className="flex items-center justify-between gap-2 border-t p-3">
            <ThemeToggle />
            <Link
              href="/app/settings"
              onClick={() => setOpen(false)}
              className="inline-flex h-8 items-center gap-2 rounded-sm px-2.5 text-[13px] text-fg-muted hover:bg-sunken hover:text-fg"
            >
              <Settings aria-hidden className="size-4" strokeWidth={1.75} />
              Settings
            </Link>
            <button
              type="button"
              onClick={() => void signOut({ redirectTo: "/" })}
              className="inline-flex h-8 items-center gap-2 rounded-sm px-2.5 text-[13px] text-fg-muted hover:bg-sunken hover:text-fg"
            >
              <LogOut aria-hidden className="size-4" strokeWidth={1.75} />
              Sign out
            </button>
          </div>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
