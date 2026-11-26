"use client";

import { useState } from "react";
import { type ProposedChart, resolveChartSpec } from "@/lib/agent/chart";
import type { ResultColumn, Row } from "@/lib/agent/types";
import { cn } from "@/lib/utils";
import { formatMoney, LANDING } from "../data";

/*
 * The model proposes a chart; the app checks it against the real result
 * columns before drawing (src/lib/agent/chart.ts, the code every answer goes
 * through). Each case below runs that function on demo-store data.
 */

const months: Row[] = LANDING.monthlyRevenue.map((m) => ({ month: m.month, revenue: m.revenue }));
const regions: Row[] = LANDING.revenueByRegion.map((r) => ({ region: r.region, revenue: r.revenue }));
const monthColumns: ResultColumn[] = [
  { name: "month", kind: "text" },
  { name: "revenue", kind: "number" },
];
const regionColumns: ResultColumn[] = [
  { name: "region", kind: "text" },
  { name: "revenue", kind: "number" },
];

const CASES: { label: string; note: string; proposed: ProposedChart | null; columns: ResultColumn[]; rows: Row[] }[] = [
  {
    label: "Pie of 11 months",
    note: "Too many slices to read, so it becomes a bar chart.",
    proposed: { type: "pie", x: "month", y: "revenue", title: "Revenue by month" },
    columns: monthColumns,
    rows: months,
  },
  {
    label: "Columns that don't exist",
    note: "The model named region_name and total; the result has region and revenue.",
    proposed: { type: "bar", x: "region_name", y: "total", title: "Revenue by region" },
    columns: regionColumns,
    rows: regions,
  },
  {
    label: "No chart proposed",
    note: "A month column reads as time, so it draws a line.",
    proposed: null,
    columns: monthColumns,
    rows: months,
  },
  {
    label: "A single number",
    note: "One row has nothing to compare, so it stays a table.",
    proposed: { type: "bar", x: "revenue", y: "revenue" },
    columns: [{ name: "revenue", kind: "number" }],
    rows: [{ revenue: LANDING.monthlyRevenue.at(-1)?.revenue ?? 0 }],
  },
];

function Preview({ type, x, y, rows }: { type: string; x: string; y: string; rows: Row[] }) {
  const values = rows.map((row) => Number(row[y]) || 0);
  const max = Math.max(...values, 1);
  if (type === "table") {
    return (
      <table className="w-full text-[13px]">
        <thead>
          <tr>
            <th scope="col" className="eyebrow pb-1 text-right font-medium">
              {y}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-t">
            <td className="num py-2 text-right text-[18px] text-fg">{formatMoney(values[0] ?? 0)}</td>
          </tr>
        </tbody>
      </table>
    );
  }
  if (type === "line") {
    const w = 300;
    const h = 110;
    const points = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - (v / max) * (h - 8)}`).join(" ");
    return (
      <svg viewBox={`0 0 ${w} ${h}`} className="h-[120px] w-full overflow-visible" aria-hidden>
        <line x1="0" x2={w} y1={h} y2={h} stroke="var(--border-strong)" />
        <polyline points={points} fill="none" stroke="var(--chart-1)" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <ul className="space-y-1.5">
      {rows.slice(0, 6).map((row, i) => (
        <li key={String(row[x])} className="flex items-center gap-2 text-[12px]">
          <span className="w-[84px] shrink-0 truncate text-fg-muted">{String(row[x])}</span>
          <span className="h-2.5 rounded-xs bg-chart-1" style={{ width: `${(values[i] / max) * 70}%` }} />
        </li>
      ))}
      {rows.length > 6 && <li className="text-[11.5px] text-fg-muted">+ {rows.length - 6} more bars</li>}
    </ul>
  );
}

export function ChartDemo() {
  const [index, setIndex] = useState(0);
  const current = CASES[index];
  const spec = resolveChartSpec(current.proposed, current.columns, current.rows);

  return (
    <div className="flex h-full flex-col">
      <div role="radiogroup" aria-label="What the model proposed" className="flex flex-wrap gap-1.5">
        {CASES.map((item, i) => (
          <button
            key={item.label}
            type="button"
            role="radio"
            aria-checked={index === i}
            data-press=""
            onClick={() => setIndex(i)}
            className={cn(
              "rounded-full border px-2.5 py-1 text-[12.5px] transition-colors",
              index === i ? "border-accent bg-accent-soft text-fg" : "bg-surface text-fg-muted hover:border-border-strong hover:text-fg",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2">
        <div className="min-w-0 rounded-md border bg-sunken p-3">
          <p className="eyebrow">Model proposed</p>
          <pre className="mt-1.5 overflow-hidden whitespace-pre-wrap break-all font-mono text-[12px] text-fg">
            {current.proposed ? JSON.stringify({ type: current.proposed.type, x: current.proposed.x, y: current.proposed.y }) : "null"}
          </pre>
        </div>
        <div className="min-w-0 rounded-md border bg-sunken p-3">
          <p className="eyebrow">App draws</p>
          <pre className="mt-1.5 overflow-hidden whitespace-pre-wrap break-all font-mono text-[12px] text-accent-text">
            {JSON.stringify({ type: spec.type, x: spec.x, y: spec.y })}
          </pre>
        </div>
      </div>
      <p role="status" aria-live="polite" className="mt-3 text-[13px] text-fg-muted">
        {current.note}
      </p>
      <div className="mt-3 rounded-md border bg-surface p-3">
        <Preview type={spec.type} x={spec.x} y={spec.y} rows={current.rows} />
      </div>
    </div>
  );
}
