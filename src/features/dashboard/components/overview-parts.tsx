"use client";

import { ArrowDownRight, ArrowUpRight, MessageSquareText, Minus, ReceiptText, TrendingDown, TrendingUp } from "lucide-react";
import Link from "next/link";
import { BarChart } from "@/components/charts/bar-chart";
import { ChartPanel } from "@/components/charts/chart-panel";
import { LineChart } from "@/components/charts/line-chart";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { HoverCard, HoverStats, HoverTitle } from "@/components/ui/hover-card";
import { formatCount, formatValue } from "@/lib/format";
import {
  type AttentionItem,
  type Compared,
  describeChange,
  formatDay,
  type OverviewDTO,
  type OverviewKpi,
  periodLabel,
} from "@/lib/overview";
import { cn } from "@/lib/utils";

/** Up / down / flat with an arrow, so direction never relies on colour alone. */
export function Delta({ kpi, className }: { kpi: Pick<OverviewKpi, "value" | "previous" | "format">; className?: string }) {
  const change = describeChange(kpi.value, kpi.previous, kpi.format);
  const Icon = change.direction === "up" ? ArrowUpRight : change.direction === "down" ? ArrowDownRight : Minus;
  return (
    <span
      className={cn(
        "num inline-flex items-center gap-0.5 rounded-xs px-1 text-[12px] font-medium",
        change.direction === "up" && "bg-success-soft text-success-text",
        change.direction === "down" && "bg-danger-soft text-danger-text",
        change.direction === "flat" && "bg-sunken text-fg-muted",
        className,
      )}
    >
      <Icon aria-hidden className="size-3.5" strokeWidth={2} />
      {change.text}
    </span>
  );
}

const fmt = (format: OverviewKpi["format"]) => (value: number) =>
  formatValue(format === "number" ? Math.round(value) : value, format);

/** Breakdown behind a KPI, shown in its hover card (and on keyboard focus). */
function KpiBreakdown({ kpi, period }: { kpi: OverviewKpi; period: OverviewDTO["period"] }) {
  const total = kpi.breakdown.reduce((sum, b) => sum + b.value, 0);
  const share = kpi.key === "revenue" || kpi.key === "orders";
  return (
    <div>
      <HoverTitle meta={`${period.days} days`}>{kpi.label}</HoverTitle>
      <p className="mt-1 text-fg-muted">
        {periodLabel(period)}, against {formatDay(period.previousStart, false)} to {formatDay(period.previousEnd)}:{" "}
        <span className="num text-fg">{fmt(kpi.format)(kpi.previous)}</span>.
      </p>
      <HoverStats
        rows={kpi.breakdown.map((b) => ({
          label: kpi.key === "repeat" ? b.label : `${b.label[0].toUpperCase()}${b.label.slice(1)}`,
          value:
            kpi.key === "repeat"
              ? `${formatCount(b.value)} customers`
              : `${fmt(kpi.format)(b.value)}${share && total ? ` · ${Math.round((b.value / total) * 100)}%` : ""}`,
        }))}
      />
      {kpi.key !== "repeat" && <p className="mt-2 text-[11.5px] text-fg-muted">By sales channel.</p>}
    </div>
  );
}

/** Tiny daily trend under a metric (decorative; the numbers are in the hover card and tables). */
function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const points = values.map((v, i) => `${(i / (values.length - 1)) * 100},${24 - (v / max) * 22}`).join(" ");
  return (
    <svg viewBox="0 0 100 26" preserveAspectRatio="none" aria-hidden className="h-7 w-24 shrink-0">
      <polyline points={points} fill="none" stroke="var(--chart-1)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" className="chart-fade" />
    </svg>
  );
}

/** The lead metric: revenue, with the daily trend against the previous period. */
export function RevenuePanel({ overview }: { overview: OverviewDTO }) {
  const kpi = overview.kpis.find((k) => k.key === "revenue")!;
  const { trend, period } = overview;
  const labels = trend.labels.map((day) => formatDay(day, false));
  return (
    <ChartPanel
      className="lg:col-span-2"
      title={
        <HoverCard
          width={300}
          trigger={
            <span tabIndex={0} className="cursor-default rounded-xs underline decoration-dotted decoration-fg-subtle underline-offset-4">
              Revenue
            </span>
          }
        >
          <KpiBreakdown kpi={kpi} period={period} />
        </HoverCard>
      }
      subtitle={`Daily, ${periodLabel(period)}, with the ${period.days} days before as a dashed line`}
      table={{
        columns: [
          { key: "day", label: "Day" },
          { key: "current", label: "Revenue", numeric: true },
          { key: "previous", label: `${period.days} days earlier`, numeric: true },
        ],
        rows: trend.labels.map((day, i) => ({
          day: formatDay(day),
          current: formatValue(trend.current[i], "currency"),
          previous: formatValue(trend.previous[i], "currency"),
        })),
      }}
    >
      <div className="mb-4 flex flex-wrap items-end gap-x-4 gap-y-1">
        <AnimatedNumber value={kpi.value} format={fmt("currency")} className="num text-[34px] font-medium leading-none text-fg sm:text-[40px]" />
        <Delta kpi={kpi} className="mb-1" />
        <span className="mb-1 text-[12.5px] text-fg-muted">vs {fmt("currency")(kpi.previous)} the {period.days} days before</span>
      </div>
      <LineChart
        labels={labels}
        format="currency"
        height={300}
        series={[
          { name: `${period.days} days before`, values: trend.previous, color: "var(--chart-other)", dashed: true },
          { name: "This period", values: trend.current, color: "var(--chart-1)" },
        ]}
      />
    </ChartPanel>
  );
}

/** Orders, average order value and repeat rate, stacked; each opens its breakdown on hover or focus. */
export function MetricList({ overview }: { overview: OverviewDTO }) {
  const rest = overview.kpis.filter((k) => k.key !== "revenue");
  return (
    <section aria-label="Other key metrics" className="panel divide-y">
      {rest.map((kpi) => (
        <HoverCard
          key={kpi.key}
          side="left"
          width={300}
          trigger={
            <div
              tabIndex={0}
              role="group"
              aria-label={`${kpi.label}: ${fmt(kpi.format)(kpi.value)}, ${describeChange(kpi.value, kpi.previous, kpi.format).text} on the previous period`}
              className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-surface-2 focus-visible:bg-surface-2"
            >
              <div className="min-w-0 flex-1">
                <p className="eyebrow">{kpi.label}</p>
                <div className="mt-1.5 flex items-baseline gap-2.5">
                  <AnimatedNumber value={kpi.value} format={fmt(kpi.format)} className="num text-[24px] font-medium leading-none text-fg" />
                  <Delta kpi={kpi} />
                </div>
              </div>
              <Sparkline values={kpi.daily} />
            </div>
          }
        >
          <KpiBreakdown kpi={kpi} period={overview.period} />
        </HoverCard>
      ))}
    </section>
  );
}

const TONE = {
  down: { icon: TrendingDown, className: "text-danger-text" },
  up: { icon: TrendingUp, className: "text-success-text" },
  refunds: { icon: ReceiptText, className: "text-danger-text" },
} as const;

/** Changes worth a look, each with a question to ask about it. */
export function AttentionList({ items, days }: { items: AttentionItem[]; days: number }) {
  return (
    <section aria-labelledby="attention-title" className="panel flex flex-col">
      <header className="px-5 pb-2 pt-4">
        <h2 id="attention-title" className="text-[16px]">
          Worth a look
        </h2>
        <p className="mt-0.5 text-[12.5px] text-fg-muted">Big moves against the {days} days before</p>
      </header>
      {items.length === 0 ? (
        <p className="px-5 pb-5 text-[13.5px] text-fg-muted">
          No category or region moved more than 15% against the {days} days before.
        </p>
      ) : (
        <ul className="divide-y">
          {items.map((item, i) => {
            const tone = TONE[item.tone];
            const Icon = tone.icon;
            return (
              <li key={item.id} className="stagger-item flex gap-3 px-5 py-3" style={{ ["--i" as string]: i }}>
                <Icon aria-hidden className={cn("mt-0.5 size-4 shrink-0", tone.className)} />
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-medium text-fg">{item.title}</p>
                  <p className="text-[12.5px] text-fg-muted">{item.detail}</p>
                  <Link
                    href={`/app?q=${encodeURIComponent(item.question)}`}
                    className="mt-1 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-accent-text underline-offset-2 hover:underline"
                  >
                    <MessageSquareText aria-hidden className="size-3.5" />
                    Ask why
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/** A ranking with the previous period as a thin marker behind each bar. */
export function ComparedPanel({
  title,
  rows,
  days,
  measure = "Revenue",
  extra,
}: {
  title: string;
  rows: Compared[];
  days: number;
  measure?: string;
  extra?: (row: Compared) => string;
}) {
  return (
    <ChartPanel
      title={title}
      subtitle={`Bars: this period · grey line: the ${days} days before`}
      table={{
        columns: [
          { key: "label", label: title.split(" ")[0] },
          { key: "value", label: measure, numeric: true },
          { key: "previous", label: "Before", numeric: true },
          { key: "change", label: "Change", numeric: true },
        ],
        rows: rows.map((row) => ({
          label: extra ? `${row.label} (${extra(row)})` : row.label,
          value: formatValue(row.value, "currency"),
          previous: formatValue(row.previous, "currency"),
          change: describeChange(row.value, row.previous, "currency").text,
        })),
      }}
    >
      <BarChart
        data={rows.map((row) => ({ label: row.label, value: row.value, previous: row.previous }))}
        format="currency"
        measure={measure}
        previousLabel={`${days} days before`}
      />
    </ChartPanel>
  );
}
