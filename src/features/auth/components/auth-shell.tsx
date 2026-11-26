import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Wordmark } from "@/components/brand/wordmark";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { formatInt, LANDING, totalOrders } from "@/features/landing/data";

/**
 * Frame for the login and sign-up pages: a top bar, one centred column, and
 * underneath it the three facts a visitor most needs before trying a data
 * tool with an AI in it. All three are true as implemented.
 */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b bg-surface">
        <div className="mx-auto flex h-14 max-w-[1120px] items-center justify-between gap-4 px-4 sm:px-6">
          <Wordmark />
          <div className="flex items-center gap-2">
            <Link href="/" className="hidden items-center gap-1.5 rounded-sm px-2 py-1 text-[13px] text-fg-muted hover:text-fg sm:inline-flex">
              <ArrowLeft aria-hidden className="size-3.5" />
              Back to the site
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="relative flex flex-1 justify-center overflow-hidden px-4 py-10 sm:py-16">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(var(--border)_1px,transparent_1px)] bg-[size:100%_44px] opacity-35 [mask-image:linear-gradient(to_bottom,black,transparent_70%)]"
        />
        <div className="animate-rise relative w-full max-w-[440px]">{children}</div>
      </main>

      <footer className="border-t bg-surface-2">
        <dl className="mx-auto grid max-w-[1120px] grid-cols-1 gap-4 px-4 py-6 text-[13px] sm:grid-cols-3 sm:px-6">
          <div>
            <dt className="eyebrow">What it can reach</dt>
            <dd className="mt-1 text-fg-muted">
              A read-only role on the demo store ({LANDING.tables.length} tables, {formatInt(totalOrders)} orders) and your own CSV
              uploads.
            </dd>
          </div>
          <div>
            <dt className="eyebrow">What it can run</dt>
            <dd className="mt-1 text-fg-muted">One parsed and checked SELECT at a time, stopped after 5 seconds, capped at 500 rows.</dd>
          </div>
          <div>
            <dt className="eyebrow">What you see</dt>
            <dd className="mt-1 text-fg-muted">The answer, the chart, the rows and the exact SQL behind every number.</dd>
          </div>
        </dl>
      </footer>
    </div>
  );
}
