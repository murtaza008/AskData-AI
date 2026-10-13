import type { ReactNode } from "react";
import { Wordmark } from "@/components/brand/wordmark";
import { DataChart } from "@/components/charts/data-chart";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Reveal } from "@/components/motion/reveal";
import { SAMPLE_TREND } from "@/features/marketing/sample-data";

/** Two-column frame for the login and sign-up pages. */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col px-6 py-6 sm:px-12 sm:py-8">
        <div className="flex items-center justify-between">
          <Wordmark />
          <ThemeToggle />
        </div>
        <div className="mx-auto flex w-full max-w-[380px] flex-1 flex-col justify-center py-10">
          <Reveal y={10}>{children}</Reveal>
        </div>
      </div>

      <aside className="hidden border-l bg-muted lg:flex lg:flex-col lg:justify-center lg:px-16">
        <div className="label-caps">Sample answer · monthly revenue</div>
        <p className="mt-3 max-w-[40ch] font-display text-[26px] leading-[1.2]">
          “How has monthly revenue trended over the last 12 months?”
        </p>
        <Reveal delay={0.15} y={18} className="mt-8 rounded-lg border bg-card p-4 shadow-pop">
          <DataChart spec={SAMPLE_TREND.spec} rows={SAMPLE_TREND.rows} height={260} />
        </Reveal>
        <p className="mt-4 max-w-[46ch] text-[13px] text-muted-foreground">
          Every answer comes with the chart, the rows behind it, and the exact read-only SQL that produced them.
        </p>
      </aside>
    </div>
  );
}
