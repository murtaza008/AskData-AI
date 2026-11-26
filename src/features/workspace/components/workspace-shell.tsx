"use client";

import { Search } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { type ReactNode, Suspense, useEffect, useState } from "react";
import { Wordmark } from "@/components/brand/wordmark";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { IconButton } from "@/components/ui/icon-button";
import { useIdle } from "@/lib/hooks/use-idle";
import { installPressFeedback } from "@/lib/press";
import { NAV_ITEMS } from "../nav";
import { MobileNav } from "./mobile-nav";
import { NavTabs, NavTabsFallback } from "./nav-tabs";
import { Notifications } from "./notifications";
import { UserMenu } from "./user-menu";

// The palette is only needed once someone presses Ctrl/Cmd+K; keep it out of first load.
const loadPalette = () => import("./command-palette");
const CommandPalette = dynamic(loadPalette, { ssr: false });

function useIsMac() {
  const [mac, setMac] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- platform is only known in the browser
    setMac(/Mac|iPhone|iPad/.test(navigator.platform));
  }, []);
  return mac;
}

/**
 * Signed-in frame: one top bar (brand, grouped tabs, search, notifications,
 * theme, account) over a full-height main area. No sidebar: every page gets
 * the full width, and the chat keeps its composer pinned to the bottom.
 */
export function WorkspaceShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const idle = useIdle();
  const isMac = useIsMac();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteUsed, setPaletteUsed] = useState(false);

  useEffect(() => {
    const uninstall = installPressFeedback();
    // Marks the shell as interactive (keyboard shortcuts are live); e2e tests wait for it.
    document.documentElement.dataset.shellReady = "";
    return () => {
      uninstall();
      delete document.documentElement.dataset.shellReady;
    };
  }, []);

  // After sign-in, once the browser is idle: warm every page's code and the palette chunk.
  useEffect(() => {
    if (!idle) return;
    for (const item of NAV_ITEMS) router.prefetch(item.href);
    void loadPalette();
  }, [idle, router]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteUsed(true);
        setPaletteOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const openPalette = () => {
    setPaletteUsed(true);
    setPaletteOpen(true);
  };

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <header className="no-print relative z-30 shrink-0 border-b bg-surface shadow-[inset_0_-1px_0_var(--border),inset_0_1px_0_var(--highlight)]">
        <div className="mx-auto flex h-14 max-w-[1440px] items-center gap-2 px-3 sm:px-5">
          <Suspense fallback={null}>
            <MobileNav />
          </Suspense>
          <Wordmark href="/app" className="mr-3 md:mr-5" />
          <div className="h-full min-w-0 flex-1">
            <Suspense fallback={<NavTabsFallback />}>
              <NavTabs />
            </Suspense>
          </div>

          <button
            type="button"
            onClick={openPalette}
            onPointerEnter={() => void loadPalette()}
            aria-keyshortcuts="Control+K Meta+K"
            data-press=""
            className="hidden h-8 w-[230px] items-center gap-2 rounded-sm border bg-surface-2 px-2.5 text-[13px] text-fg-muted transition-colors hover:border-border-strong hover:text-fg lg:inline-flex"
          >
            <Search aria-hidden className="size-3.5" strokeWidth={1.75} />
            <span className="flex-1 text-left">Search or jump to…</span>
            <kbd className="num rounded-xs border bg-surface px-1.5 text-[11px]">{isMac ? "⌘K" : "Ctrl K"}</kbd>
          </button>
          <IconButton label="Search and commands" className="lg:hidden" onClick={openPalette}>
            <Search aria-hidden className="size-4" strokeWidth={1.75} />
          </IconButton>
          <Notifications />
          <ThemeToggle className="hidden sm:inline-flex" />
          <UserMenu />
        </div>
      </header>

      <main id="main" className="flex min-h-0 flex-1 flex-col">
        {children}
      </main>

      {paletteUsed && <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />}
    </div>
  );
}
