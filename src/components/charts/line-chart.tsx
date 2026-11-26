"use client";

import { useState } from "react";
import type { ValueFormat } from "@/lib/agent/types";
import { formatCompact, formatValue } from "@/lib/format";
import { cn } from "@/lib/utils";
import { labelStride, linear, niceTicks } from "./scale";
import { useWidth } from "./use-width";

export type LineSeries = {
  name: string;
  values: (number | null)[];
  color: string;
  /** Comparison series (e.g. previous period): dashed and drawn under the main one. */
  dashed?: boolean;
};

type LineChartProps = {
  labels: string[];
  series: LineSeries[];
  format: ValueFormat;
  height?: number;
  /** Extra rows for the tooltip of point i (e.g. the date range it covers). */
  describe?: (index: number) => string | undefined;
  className?: string;
};

const PAD = { top: 12, right: 12, bottom: 26, left: 52 };

/**
 * Line chart on one y-axis. The line draws in from the left; hovering shows a
 * crosshair and a tooltip with every series' value at that point.
 */
export function LineChart({ labels, series, format, height = 260, describe, className }: LineChartProps) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const all = series.flatMap((s) => s.values.filter((v): v is number => v !== null));
  const ticks = niceTicks(Math.min(0, ...all), Math.max(...all, 0));
  const innerW = Math.max(10, width - PAD.left - PAD.right);
  const innerH = height - PAD.top - PAD.bottom;
  const x = linear([0, Math.max(1, labels.length - 1)], [PAD.left, PAD.left + innerW]);
  const y = linear([ticks[0], ticks[ticks.length - 1]], [PAD.top + innerH, PAD.top]);
  const stride = labelStride(labels.length, innerW);
  const dots = labels.length <= 24;

  const path = (values: (number | null)[]) => {
    let d = "";
    values.forEach((value, i) => {
      if (value === null) return;
      d += `${d && values[i - 1] !== null ? "L" : "M"}${x(i).toFixed(1)},${y(value).toFixed(1)}`;
    });
    return d;
  };

  const onMove = (event: React.PointerEvent<SVGRectElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    setHover(Math.max(0, Math.min(labels.length - 1, Math.round(ratio * (labels.length - 1)))));
  };

  const tipLeft = hover === null ? 0 : x(hover);
  const flip = tipLeft > width * 0.62;

  return (
    <div ref={ref} className={cn("relative w-full select-none", className)}>
      <svg width={width} height={height} className="block overflow-visible" aria-hidden>
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={PAD.left} x2={PAD.left + innerW} y1={y(tick)} y2={y(tick)} stroke="var(--chart-grid)" />
            <text x={PAD.left - 8} y={y(tick)} dy="0.32em" textAnchor="end" className="fill-fg-muted font-mono text-[11px]">
              {formatCompact(tick, format)}
            </text>
          </g>
        ))}
        {labels.map((label, i) =>
          (i % stride === 0 && labels.length - 1 - i >= stride / 2) || i === labels.length - 1 ? (
            <text key={i} x={x(i)} y={height - 6} textAnchor={i === 0 ? "start" : i === labels.length - 1 ? "end" : "middle"} className="fill-fg-muted font-mono text-[11px]">
              {label}
            </text>
          ) : null,
        )}
        <line x1={PAD.left} x2={PAD.left + innerW} y1={y(ticks[0])} y2={y(ticks[0])} stroke="var(--border-strong)" />

        {[...series].sort((a, b) => Number(Boolean(b.dashed)) - Number(Boolean(a.dashed))).map((s) => (
          <path
            key={s.name}
            d={path(s.values)}
            fill="none"
            stroke={s.color}
            strokeWidth={s.dashed ? 1.5 : 2}
            strokeDasharray={s.dashed ? "4 4" : undefined}
            strokeLinejoin="round"
            strokeLinecap="round"
            pathLength={s.dashed ? undefined : 1}
            className={s.dashed ? "chart-fade" : "chart-draw"}
          />
        ))}
        {dots &&
          series
            .filter((s) => !s.dashed)
            .map((s) =>
              s.values.map((value, i) =>
                value === null ? null : (
                  <circle key={`${s.name}-${i}`} cx={x(i)} cy={y(value)} r={3} fill={s.color} stroke="var(--surface)" strokeWidth={2} className="chart-fade" />
                ),
              ),
            )}

        {hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + innerH} stroke="var(--fg-subtle)" strokeDasharray="3 3" />
            {series.map((s) => {
              const value = s.values[hover];
              return value === null || value === undefined ? null : (
                <circle key={s.name} cx={x(hover)} cy={y(value)} r={5} fill={s.dashed ? "var(--surface)" : s.color} stroke={s.color} strokeWidth={2} />
              );
            })}
          </g>
        )}
        <rect
          x={PAD.left}
          y={PAD.top}
          width={innerW}
          height={innerH}
          fill="transparent"
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
        />
      </svg>

      {hover !== null && (
        <div
          className="panel-raised pointer-events-none absolute top-1 z-10 min-w-[180px] px-3 py-2 text-[12.5px]"
          style={flip ? { right: width - tipLeft + 12 } : { left: tipLeft + 12 }}
        >
          <p className="font-medium text-fg">{labels[hover]}</p>
          {describe?.(hover) && <p className="text-[11.5px] text-fg-muted">{describe(hover)}</p>}
          <dl className="mt-1.5 space-y-1">
            {series.map((s) => (
              <div key={s.name} className="flex items-center justify-between gap-4">
                <dt className="flex items-center gap-1.5 text-fg-muted">
                  <span aria-hidden className="h-0.5 w-3 rounded-full" style={{ background: s.color }} />
                  {s.name}
                </dt>
                <dd className="num text-fg">{s.values[hover] == null ? "–" : formatValue(s.values[hover] as number, format)}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}
