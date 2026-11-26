"use client";

import { Pin as PinIcon } from "lucide-react";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { buttonClass } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { messageOf } from "@/lib/api-client";
import { useAccount } from "@/lib/hooks/use-account";
import { PERIOD_DAYS, type PeriodDays, periodLabel } from "@/lib/overview";
import { cn } from "@/lib/utils";
import { useOverview } from "../hooks/use-overview";
import { usePins } from "../hooks/use-pins";
import { AttentionList, ComparedPanel, MetricList, RevenuePanel } from "./overview-parts";
import { PinnedChartCard } from "./pinned-chart-card";

const noop = () => () => {};
/** The visitor's local hour; null while server-rendering, so the greeting never mismatches. */
function useHour(): number | null {
  return useSyncExternalStore(noop, () => new Date().getHours(), () => null);
}

function Greeting() {
  const hour = useHour();
  const { account } = useAccount();
  const first = account?.name.split(" ")[0];
  const part = hour === null ? "Hello" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  return (
    <h1 className="text-[26px] sm:text-[30px]">
      {part}
      {first ? `, ${first}` : ""}
    </h1>
  );
}

function PeriodSwitch({ value, onChange }: { value: PeriodDays; onChange: (days: PeriodDays) => void }) {
  return (
    <div role="radiogroup" aria-label="Period" className="inline-flex rounded-md border bg-surface p-0.5">
      {PERIOD_DAYS.map((days) => (
        <button
          key={days}
          type="button"
          role="radio"
          aria-checked={value === days}
          data-press=""
          onClick={() => onChange(days)}
          className={cn(
            "rounded-[6px] px-3 py-1 text-[13px] transition-colors",
            value === days ? "bg-inverse text-inverse-fg" : "text-fg-muted hover:text-fg",
          )}
        >
          {days} days
        </button>
      ))}
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-3" role="status" aria-label="Loading metrics">
      <div className="panel h-[400px] animate-pulse lg:col-span-2" />
      <div className="panel h-[400px] animate-pulse" />
    </div>
  );
}

function PinnedSection() {
  const pins = usePins();
  return (
    <section aria-labelledby="pinned-title" className="mt-12">
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <div>
          <h2 id="pinned-title" className="text-[20px]">
            Pinned charts
          </h2>
          <p className="mt-0.5 text-[13px] text-fg-muted">Each one re-runs its SQL, read-only, every time this page loads.</p>
        </div>
        {pins.data && pins.data.length > 0 && <span className="num text-[12px] text-fg-muted">{pins.data.length} pinned</span>}
      </div>
      {pins.isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2" role="status" aria-label="Loading pinned charts">
          {[0, 1].map((index) => (
            <div key={index} className="panel h-[340px] animate-pulse" />
          ))}
        </div>
      ) : pins.isError ? (
        <Notice tone="error" title="Pinned charts couldn't be loaded">
          {messageOf(pins.error)}
        </Notice>
      ) : pins.data && pins.data.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {pins.data.map((pin, index) => (
            <div
              key={pin.id}
              className={cn("stagger-item min-w-0", index === 0 && pins.data.length % 2 === 1 && "lg:col-span-2")}
              style={{ ["--i" as string]: index }}
            >
              <PinnedChartCard pin={pin} />
            </div>
          ))}
        </div>
      ) : (
        <div className="panel px-6 py-12 text-center">
          <PinIcon aria-hidden className="mx-auto size-5 text-fg-subtle" />
          <p className="mt-3 font-medium text-fg">No pinned charts yet</p>
          <p className="mx-auto mt-1 max-w-[46ch] text-[14px] text-fg-muted">
            Pin any answer&apos;s chart and it appears here, re-run with fresh data on every visit.
          </p>
          <Link href="/app" className={buttonClass("primary", "md", "mt-5")}>
            Ask a question
          </Link>
        </div>
      )}
    </section>
  );
}

/** Dashboard: greeting, period switch, the store's key metrics, what moved, and pinned charts. */
export function DashboardView() {
  const [days, setDays] = useState<PeriodDays>(30);
  const overview = useOverview(days);
  const data = overview.data;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Greeting />
            <p className="mt-1.5 text-[14px] text-fg-muted">
              {data ? (
                <>
                  Demo store, {periodLabel(data.period)}: the last {data.period.days} days of data, compared with the{" "}
                  {data.period.days} days before.
                </>
              ) : (
                "Demo store figures, compared with the period before."
              )}
            </p>
          </div>
          <PeriodSwitch value={days} onChange={setDays} />
        </div>

        <div className={cn("mt-6 transition-opacity", overview.isPlaceholderData && "opacity-60")} aria-busy={overview.isFetching}>
          {overview.isLoading ? (
            <OverviewSkeleton />
          ) : overview.isError || !data ? (
            <Notice tone="error" title="Key metrics couldn't be loaded">
              {messageOf(overview.error)}
            </Notice>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <RevenuePanel overview={data} />
                <div className="flex min-w-0 flex-col gap-4">
                  <MetricList overview={data} />
                  <AttentionList items={data.attention} days={data.period.days} />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <ComparedPanel
                  title="Top products"
                  rows={data.topProducts}
                  days={data.period.days}
                  extra={(row) => data.topProducts.find((p) => p.label === row.label)?.category ?? ""}
                />
                <ComparedPanel title="Categories by revenue" rows={data.categories} days={data.period.days} />
                <ComparedPanel title="Regions by revenue" rows={data.regions} days={data.period.days} />
              </div>
            </div>
          )}
        </div>

        <PinnedSection />
      </div>
    </div>
  );
}
