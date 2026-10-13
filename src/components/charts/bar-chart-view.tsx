"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ValueFormat } from "@/lib/agent/types";
import { formatCompact } from "@/lib/format";
import {
  AXIS_STROKE,
  AXIS_TICK,
  CATEGORY_TICK,
  type ChartDatum,
  GRID_STROKE,
  PRIMARY_SERIES,
  truncateLabel,
} from "./chart-theme";
import { ChartTooltip } from "./chart-tooltip";

type BarChartViewProps = {
  data: ChartDatum[];
  format: ValueFormat;
  measure: string;
  height: number;
  /** Horizontal bars suit rankings with long category names. */
  horizontal: boolean;
};

export function BarChartView({ data, format, measure, height, horizontal }: BarChartViewProps) {
  const tickFormatter = (value: number) => formatCompact(value, format);
  const tooltip = <ChartTooltip format={format} measure={measure} />;

  if (horizontal) {
    const longest = Math.max(...data.map((datum) => datum.label.length));
    const labelWidth = Math.min(170, Math.max(64, longest * 7.2));
    return (
      <ResponsiveContainer width="100%" height={height} initialDimension={{ width: 640, height }}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 20, left: 0, bottom: 0 }} barCategoryGap="26%">
          <CartesianGrid stroke={GRID_STROKE} horizontal={false} />
          <XAxis type="number" tick={AXIS_TICK} tickFormatter={tickFormatter} axisLine={false} tickLine={false} />
          <YAxis
            type="category"
            dataKey="label"
            width={labelWidth}
            tick={CATEGORY_TICK}
            tickFormatter={(label: string) => truncateLabel(label, 22)}
            axisLine={{ stroke: AXIS_STROKE }}
            tickLine={false}
            interval={0}
          />
          <Tooltip content={tooltip} cursor={{ fill: "var(--muted)", opacity: 0.6 }} />
          <Bar dataKey="value" fill={PRIMARY_SERIES} radius={[0, 4, 4, 0]} maxBarSize={26} animationDuration={500} />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height} initialDimension={{ width: 640, height }}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="28%">
        <CartesianGrid stroke={GRID_STROKE} vertical={false} />
        <XAxis
          dataKey="label"
          tick={AXIS_TICK}
          tickFormatter={(label: string) => truncateLabel(label, 12)}
          axisLine={{ stroke: AXIS_STROKE }}
          tickLine={false}
          minTickGap={12}
        />
        <YAxis tick={AXIS_TICK} tickFormatter={tickFormatter} axisLine={false} tickLine={false} width={56} />
        <Tooltip content={tooltip} cursor={{ fill: "var(--muted)", opacity: 0.6 }} />
        <Bar dataKey="value" fill={PRIMARY_SERIES} radius={[4, 4, 0, 0]} maxBarSize={44} animationDuration={500} />
      </BarChart>
    </ResponsiveContainer>
  );
}
