"use client";

import { Pin as PinIcon } from "lucide-react";
import Link from "next/link";
import { Stagger, StaggerItem } from "@/components/motion/reveal";
import { buttonClass } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { messageOf } from "@/lib/api-client";
import { usePins } from "../hooks/use-pins";
import { KpiStrip } from "./kpi-strip";
import { PinnedChartCard } from "./pinned-chart-card";

function EmptyDashboard() {
  return (
    <div className="rounded-lg border border-dashed px-6 py-14 text-center">
      <PinIcon className="mx-auto size-5 text-muted-foreground" strokeWidth={1.5} />
      <h2 className="mt-3 text-[20px]">Nothing pinned yet</h2>
      <p className="mx-auto mt-2 max-w-[46ch] text-[14px] text-muted-foreground">
        Ask a question, then use <span className="font-medium text-foreground">Pin</span> on the answer to keep its
        chart here. Pinned charts re-run their query every time you open the dashboard.
      </p>
      <Link href="/app" className={buttonClass("primary", "md", "mt-5")}>
        Ask a question
      </Link>
    </div>
  );
}

/** Dashboard page: KPI strip plus the user's pinned charts. */
export function DashboardView() {
  const pins = usePins();

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-[28px]">Dashboard</h1>
          <span className="label-caps">Demo store · last 30 days</span>
        </div>

        <div className="mt-6">
          <KpiStrip />
        </div>

        <div className="mt-10 flex items-baseline justify-between">
          <h2 className="text-[20px]">Pinned charts</h2>
          {pins.data && pins.data.length > 0 && (
            <span className="num text-[12px] text-muted-foreground">{pins.data.length} pinned</span>
          )}
        </div>

        <div className="mt-4">
          {pins.isLoading ? (
            <div className="grid gap-4 lg:grid-cols-2" aria-hidden>
              {[0, 1].map((index) => (
                <div key={index} className="h-[340px] animate-pulse rounded-lg border bg-card" />
              ))}
            </div>
          ) : pins.isError ? (
            <Notice tone="error" title="Pinned charts couldn't be loaded">
              {messageOf(pins.error)}
            </Notice>
          ) : pins.data && pins.data.length > 0 ? (
            <Stagger once step={0.08} className="grid gap-4 lg:grid-cols-2">
              {pins.data.map((pin, index) => (
                // An odd first tile spans the full width so the grid never ends ragged.
                <StaggerItem
                  key={pin.id}
                  className={index === 0 && pins.data.length % 2 === 1 ? "lg:col-span-2" : undefined}
                >
                  <PinnedChartCard pin={pin} />
                </StaggerItem>
              ))}
            </Stagger>
          ) : (
            <EmptyDashboard />
          )}
        </div>
      </div>
    </div>
  );
}
