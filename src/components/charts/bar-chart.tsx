"use client";

import { useState } from "react";
import type { ValueFormat } from "@/lib/agent/types";
import { formatCompact, formatValue } from "@/lib/format";
import { cn } from "@/lib/utils";
import { labelStride, linear, niceTicks } from "./scale";
import { useWidth } from "./use-width";

export type BarDatum = { label: string; value: number; previous?: number };

type BarChartProps = {
  data: BarDatum[];
  format: ValueFormat;
  measure: string;
  /** Horizontal bars suit rankings with long names; vertical suits time buckets. */
  orientation?: "horizontal" | "vertical";
  height?: number;
  /** Name of the comparison series when data carries `previous`. */
  previousLabel?: string;
  className?: string;
};

/** Horizontal ranking: HTML rows (crisp, wrapping-safe labels), bars grow from the baseline. */
function HorizontalBars({ data, format, measure, previousLabel }: BarChartProps) {
  const max = Math.max(...data.flatMap((d) => [d.value, d.previous ?? 0]), 0) || 1;
  const min = Math.min(0, ...data.map((d) => d.value));
  const span = max - min || 1;
  return (
    <ul className="space-y-1.5">
      {data.map((datum, i) => {
        const width = (Math.abs(datum.value) / span) * 100;
        return (
          <li key={`${datum.label}-${i}`} className="group grid grid-cols-[minmax(0,42%)_minmax(0,1fr)_auto] items-center gap-3 text-[13px]">
            <span className="truncate text-fg" title={datum.label}>
              {datum.label}
            </span>
            <span className="relative h-[18px]">
              {datum.previous !== undefined && (
                <span
                  aria-hidden
                  className="absolute inset-y-[6px] left-0 rounded-full bg-chart-other/45"
                  style={{ width: `${(datum.previous / span) * 100}%` }}
                />
              )}
              <span
                aria-hidden
                className="bar-grow-x absolute inset-y-0 left-0 rounded-r-[4px] rounded-l-[2px] bg-chart-1 transition-[filter] group-hover:brightness-110"
                style={{ width: `${width}%`, ["--i" as string]: i }}
              />
              <span className="sr-only">
                {measure}: {formatValue(datum.value, format)}
                {datum.previous !== undefined && `, ${previousLabel ?? "previous"}: ${formatValue(datum.previous, format)}`}
              </span>
            </span>
            <span className="num text-right text-[12px] text-fg-muted" aria-hidden>
              {formatValue(datum.value, format)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

const PAD = { top: 10, right: 8, bottom: 26, left: 52 };

/** Vertical columns with a tooltip per bar. */
function VerticalBars({ data, format, measure, height = 260, previousLabel }: BarChartProps) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const values = data.flatMap((d) => [d.value, d.previous ?? 0]);
  const ticks = niceTicks(Math.min(0, ...values), Math.max(0, ...values));
  const innerW = Math.max(10, width - PAD.left - PAD.right);
  const innerH = height - PAD.top - PAD.bottom;
  const y = linear([ticks[0], ticks[ticks.length - 1]], [PAD.top + innerH, PAD.top]);
  const band = innerW / Math.max(1, data.length);
  const barW = Math.max(3, Math.min(44, band * 0.64));
  const stride = labelStride(data.length, innerW, 64);
  const zero = y(0);

  return (
    <div ref={ref} className="relative w-full select-none">
      <svg width={width} height={height} className="block overflow-visible" aria-hidden>
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={PAD.left} x2={PAD.left + innerW} y1={y(tick)} y2={y(tick)} stroke="var(--chart-grid)" />
            <text x={PAD.left - 8} y={y(tick)} dy="0.32em" textAnchor="end" className="fill-fg-muted font-mono text-[11px]">
              {formatCompact(tick, format)}
            </text>
          </g>
        ))}
        {data.map((datum, i) => {
          const cx = PAD.left + band * i + band / 2;
          const top = y(Math.max(0, datum.value));
          const h = Math.abs(y(datum.value) - zero);
          return (
            <g key={`${datum.label}-${i}`} onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)}>
              <rect x={PAD.left + band * i} y={PAD.top} width={band} height={innerH} fill={hover === i ? "var(--sunken)" : "transparent"} />
              {datum.previous !== undefined && (
                <rect x={cx - barW / 2 - 2} y={y(datum.previous)} width={barW / 2} height={Math.abs(y(datum.previous) - zero)} rx={2} fill="var(--chart-other)" opacity={0.5} />
              )}
              <rect
                x={datum.previous !== undefined ? cx : cx - barW / 2}
                y={top}
                width={datum.previous !== undefined ? barW / 2 : barW}
                height={Math.max(1, h)}
                rx={Math.min(4, barW / 4)}
                fill="var(--chart-1)"
                className="bar-grow-y"
                style={{ transformOrigin: `0 ${zero}px`, ["--i" as string]: i }}
              />
              {((i % stride === 0 && data.length - 1 - i >= stride / 2) || i === data.length - 1) && (
                <text x={cx} y={height - 6} textAnchor="middle" className="fill-fg-muted font-mono text-[11px]">
                  {datum.label.length > 10 ? `${datum.label.slice(0, 9)}…` : datum.label}
                </text>
              )}
            </g>
          );
        })}
        <line x1={PAD.left} x2={PAD.left + innerW} y1={zero} y2={zero} stroke="var(--border-strong)" />
      </svg>
      {hover !== null && data[hover] && (
        <div
          className="panel-raised pointer-events-none absolute top-1 z-10 min-w-[160px] px-3 py-2 text-[12.5px]"
          style={
            PAD.left + band * hover > width * 0.6
              ? { right: width - (PAD.left + band * hover) + 8 }
              : { left: PAD.left + band * (hover + 1) + 8 }
          }
        >
          <p className="font-medium text-fg">{data[hover].label}</p>
          <dl className="mt-1 space-y-0.5">
            <div className="flex justify-between gap-4">
              <dt className="text-fg-muted">{measure}</dt>
              <dd className="num text-fg">{formatValue(data[hover].value, format)}</dd>
            </div>
            {data[hover].previous !== undefined && (
              <div className="flex justify-between gap-4">
                <dt className="text-fg-muted">{previousLabel ?? "Previous"}</dt>
                <dd className="num text-fg">{formatValue(data[hover].previous as number, format)}</dd>
              </div>
            )}
          </dl>
        </div>
      )}
    </div>
  );
}

export function BarChart(props: BarChartProps) {
  return (
    <div className={cn("w-full", props.className)}>
      {props.orientation === "vertical" ? <VerticalBars {...props} /> : <HorizontalBars {...props} />}
    </div>
  );
}
