"use client";

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { CountUp } from "@/components/motion/reveal";
import { formatValue } from "@/lib/format";
import { cn } from "@/lib/utils";
import { type Kpi, useOverview } from "../hooks/use-overview";

/** Change vs the previous period: relative % for amounts, points for a rate. */
function describeChange(kpi: Kpi): { text: string; direction: "up" | "down" | "flat" } {
  if (kpi.format === "percent") {
    const points = kpi.value - kpi.previous;
    const direction = Math.abs(points) < 0.05 ? "flat" : points > 0 ? "up" : "down";
    return { text: `${points > 0 ? "+" : ""}${points.toFixed(1)} pts`, direction };
  }
  if (kpi.previous === 0) return { text: "no prior data", direction: "flat" };
  const change = ((kpi.value - kpi.previous) / kpi.previous) * 100;
  const direction = Math.abs(change) < 0.05 ? "flat" : change > 0 ? "up" : "down";
  return { text: `${change > 0 ? "+" : ""}${change.toFixed(1)}%`, direction };
}

function KpiTile({ kpi, className }: { kpi: Kpi; className?: string }) {
  const change = describeChange(kpi);
  // The arrow carries direction as well as the colour does.
  const Icon = change.direction === "up" ? ArrowUpRight : change.direction === "down" ? ArrowDownRight : Minus;
  return (
    <div className={cn("animate-rise px-4 py-5", className)}>
      <div className="label-caps">{kpi.label}</div>
      <CountUp
        value={kpi.value}
        format={(value) => formatValue(kpi.format === "number" ? Math.round(value) : value, kpi.format)}
        className="num mt-2 block text-[26px] leading-none sm:text-[28px]"
      />
      <div className="mt-2 flex items-center gap-1 text-[12px]">
        <Icon
          className={cn(
            "size-3.5",
            change.direction === "up" && "text-success",
            change.direction === "down" && "text-destructive",
            change.direction === "flat" && "text-muted-foreground",
          )}
          strokeWidth={2}
        />
        <span className="num">{change.text}</span>
        <span className="text-muted-foreground">vs prior 30 days</span>
      </div>
    </div>
  );
}

/** Four headline numbers across the top of the dashboard. */
export function KpiStrip() {
  const { data, isLoading, isError } = useOverview();

  if (isError) {
    return <p className="border-y py-5 text-[14px] text-muted-foreground">Key metrics are unavailable right now.</p>;
  }

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-2 border-y lg:grid-cols-4" aria-hidden>
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className="space-y-3 px-4 py-5">
            <div className="h-2.5 w-20 animate-pulse rounded-sm bg-muted" />
            <div className="h-7 w-28 animate-pulse rounded-sm bg-muted" />
            <div className="h-2.5 w-32 animate-pulse rounded-sm bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 border-y lg:grid-cols-4">
      {data.kpis.map((kpi, index) => (
        <KpiTile
          key={kpi.key}
          kpi={kpi}
          className={cn(
            index % 2 === 1 && "border-l",
            index >= 2 && "max-lg:border-t",
            index === 2 && "lg:border-l",
          )}
        />
      ))}
    </div>
  );
}
