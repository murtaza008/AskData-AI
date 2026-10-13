"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { ValueFormat } from "@/lib/agent/types";
import { formatValue } from "@/lib/format";
import { type ChartDatum, SERIES_COLORS } from "./chart-theme";
import { ChartTooltip } from "./chart-tooltip";

type PieChartViewProps = {
  data: ChartDatum[];
  format: ValueFormat;
  measure: string;
  height: number;
};

/** Donut with a labelled legend, so a slice is never identified by colour alone. */
export function PieChartView({ data, format, measure, height }: PieChartViewProps) {
  const total = data.reduce((sum, datum) => sum + datum.value, 0);

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-8">
      <div className="w-full shrink-0 sm:w-[44%]" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 280, height }}>
          <PieChart>
            <Tooltip content={<ChartTooltip format={format} measure={measure} total={total} />} />
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              innerRadius="56%"
              outerRadius="92%"
              // A surface-coloured gap separates neighbouring slices.
              stroke="var(--card)"
              strokeWidth={2}
              animationDuration={500}
            >
              {data.map((datum, index) => (
                <Cell key={datum.label} fill={SERIES_COLORS[index % SERIES_COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>

      <ul className="w-full min-w-0 flex-1 space-y-1.5 text-[13px]">
        {data.map((datum, index) => (
          <li key={datum.label} className="flex items-center gap-2.5">
            <span
              aria-hidden
              className="size-2.5 shrink-0 rounded-[2px]"
              style={{ background: SERIES_COLORS[index % SERIES_COLORS.length] }}
            />
            <span className="min-w-0 flex-1 truncate">{datum.label}</span>
            <span className="num text-muted-foreground">{formatValue(datum.value, format)}</span>
            <span className="num w-12 text-right">{total > 0 ? ((datum.value / total) * 100).toFixed(1) : "0"}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
