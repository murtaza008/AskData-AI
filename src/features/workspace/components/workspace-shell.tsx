"use client";

import { Menu, X } from "lucide-react";
import { type ReactNode, Suspense, useEffect, useState } from "react";
import { Wordmark } from "@/components/brand/wordmark";
import { IconButton } from "@/components/ui/icon-button";
import { Sidebar } from "./sidebar";

/**
 * App frame: fixed sidebar on desktop, slide-over drawer on mobile.
 * The sidebar reads the current path, so it sits in a Suspense boundary and
 * streams in after the static shell.
 */
export function WorkspaceShell({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close the drawer with Escape.
  useEffect(() => {
    if (!drawerOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen]);

  return (
    <div className="flex h-dvh overflow-hidden">
      <aside className="hidden w-[250px] shrink-0 border-r md:block">
        <Suspense fallback={null}>
          <Sidebar />
        </Suspense>
      </aside>

      {drawerOpen && (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-foreground/30" onClick={() => setDrawerOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-[280px] max-w-[85vw] border-r bg-background shadow-pop">
            <IconButton label="Close menu" className="absolute right-2 top-3" onClick={() => setDrawerOpen(false)}>
              <X className="size-4" />
            </IconButton>
            <Suspense fallback={null}>
              <Sidebar onNavigate={() => setDrawerOpen(false)} />
            </Suspense>
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b px-4 md:hidden">
          <IconButton label="Open menu" onClick={() => setDrawerOpen(true)}>
            <Menu className="size-5" strokeWidth={1.5} />
          </IconButton>
          <Wordmark href="/app" />
        </header>
        <main className="flex min-h-0 flex-1 flex-col">{children}</main>
      </div>
    </div>
  );
}
