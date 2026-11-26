"use client";

import { useState } from "react";
import type { ValueFormat } from "@/lib/agent/types";
import { formatValue } from "@/lib/format";
import { SERIES_COLORS } from "./chart-theme";

export type Slice = { label: string; value: number };

const SIZE = 180;
const R = 80;
const INNER = 50;

function arc(start: number, end: number) {
  const large = end - start > Math.PI ? 1 : 0;
  const p = (r: number, a: number) => `${SIZE / 2 + r * Math.sin(a)},${SIZE / 2 - r * Math.cos(a)}`;
  return `M${p(R, start)}A${R},${R} 0 ${large} 1 ${p(R, end)}L${p(INNER, end)}A${INNER},${INNER} 0 ${large} 0 ${p(INNER, start)}Z`;
}

/**
 * Donut with a labelled legend, so a slice is never identified by colour
 * alone. Slices take the categorical colours in fixed order; the caller folds
 * anything past the last colour into "Other".
 */
export function DonutChart({ data, format, measure }: { data: Slice[]; format: ValueFormat; measure: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const total = data.reduce((sum, d) => sum + Math.max(0, d.value), 0) || 1;
  const color = (i: number, label: string) =>
    label === "Other" ? "var(--chart-other)" : SERIES_COLORS[Math.min(i, SERIES_COLORS.length - 1)];

  const sweeps = data.map((d) => (Math.max(0, d.value) / total) * Math.PI * 2);
  const slices = data.map((d, i) => {
    const start = sweeps.slice(0, i).reduce((sum, sweep) => sum + sweep, 0);
    return { ...d, i, start, end: start + sweeps[i] };
  });
  const focus = hover !== null ? data[hover] : null;

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-8">
      <div className="relative shrink-0">
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE} height={SIZE} aria-hidden className="chart-fade">
          {slices.map((s) => (
            <path
              key={s.label}
              d={arc(s.start, Math.max(s.start + 0.0001, s.end - 0.012))}
              fill={color(s.i, s.label)}
              stroke="var(--surface)"
              strokeWidth={2}
              opacity={hover === null || hover === s.i ? 1 : 0.45}
              onPointerEnter={() => setHover(s.i)}
              onPointerLeave={() => setHover(null)}
            />
          ))}
        </svg>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center" aria-hidden>
          <div className="max-w-[90px]">
            <p className="truncate text-[11px] text-fg-muted">{focus ? focus.label : measure}</p>
            <p className="num text-[14px] font-medium text-fg">{formatValue(focus ? focus.value : total, format)}</p>
          </div>
        </div>
      </div>
      <ul className="w-full min-w-0 flex-1 space-y-1.5 text-[13px]">
        {slices.map((s) => (
          <li
            key={s.label}
            className="flex items-center gap-2.5"
            onPointerEnter={() => setHover(s.i)}
            onPointerLeave={() => setHover(null)}
          >
            <span aria-hidden className="size-2.5 shrink-0 rounded-[3px]" style={{ background: color(s.i, s.label) }} />
            <span className="min-w-0 flex-1 truncate text-fg">{s.label}</span>
            <span className="num text-fg-muted">{formatValue(s.value, format)}</span>
            <span className="num w-12 text-right text-fg">{((Math.max(0, s.value) / total) * 100).toFixed(1)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
