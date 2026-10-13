"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ValueFormat } from "@/lib/agent/types";
import { formatCompact } from "@/lib/format";
import { AXIS_STROKE, AXIS_TICK, type ChartDatum, GRID_STROKE, PRIMARY_SERIES } from "./chart-theme";
import { ChartTooltip } from "./chart-tooltip";

type LineChartViewProps = {
  data: ChartDatum[];
  format: ValueFormat;
  measure: string;
  height: number;
};

export function LineChartView({ data, format, measure, height }: LineChartViewProps) {
  // Point markers help on short series and turn into noise on long ones.
  const showDots = data.length <= 24;

  return (
    <ResponsiveContainer width="100%" height={height} initialDimension={{ width: 640, height }}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={GRID_STROKE} vertical={false} />
        <XAxis dataKey="label" tick={AXIS_TICK} axisLine={{ stroke: AXIS_STROKE }} tickLine={false} minTickGap={24} />
        <YAxis
          tick={AXIS_TICK}
          tickFormatter={(value: number) => formatCompact(value, format)}
          axisLine={false}
          tickLine={false}
          width={56}
        />
        <Tooltip
          content={<ChartTooltip format={format} measure={measure} />}
          cursor={{ stroke: "var(--muted-foreground)", strokeDasharray: "3 3" }}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke={PRIMARY_SERIES}
          strokeWidth={2}
          dot={showDots ? { r: 3, fill: PRIMARY_SERIES, stroke: "var(--card)", strokeWidth: 2 } : false}
          activeDot={{ r: 5, fill: PRIMARY_SERIES, stroke: "var(--card)", strokeWidth: 2 }}
          animationDuration={500}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
