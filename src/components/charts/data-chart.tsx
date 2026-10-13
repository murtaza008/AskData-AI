"use client";

import { humanize } from "@/lib/agent/chart";
import type { ChartSpec, Row } from "@/lib/agent/types";
import { formatLabel } from "@/lib/format";
import { BarChartView } from "./bar-chart-view";
import { type ChartDatum, MAX_BARS, MAX_LINE_POINTS, MAX_PIE_SLICES } from "./chart-theme";
import { LineChartView } from "./line-chart-view";
import { PieChartView } from "./pie-chart-view";

const TIME_LIKE = /^\d{4}([-/]\d{1,2})?([-/]\d{1,2})?$|^(q[1-4]|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i;

type DataChartProps = {
  spec: ChartSpec;
  rows: Row[];
  height?: number;
};

/** Turn result rows into { label, value } points, dropping rows without a numeric y. */
function toData(spec: ChartSpec, rows: Row[]): ChartDatum[] {
  const data: ChartDatum[] = [];
  for (const row of rows) {
    const value = Number(row[spec.y]);
    if (row[spec.y] === null || !Number.isFinite(value)) continue;
    data.push({ label: formatLabel(row[spec.x] ?? null), value });
  }
  return data;
}

/**
 * Draws a result set according to its chart spec. Table-type specs render
 * nothing here — the caller shows the data table instead.
 */
export function DataChart({ spec, rows, height = 280 }: DataChartProps) {
  if (spec.type === "table") return null;

  const all = toData(spec, rows);
  if (all.length === 0) {
    return <p className="py-10 text-center text-[14px] text-muted-foreground">Nothing to plot for this result.</p>;
  }

  const limit = spec.type === "line" ? MAX_LINE_POINTS : spec.type === "pie" ? MAX_PIE_SLICES : MAX_BARS;
  const data = all.slice(0, limit);
  const measure = humanize(spec.y);

  // Rankings read best as horizontal bars; time buckets stay vertical.
  const horizontal =
    spec.type === "bar" && data.length <= 15 && !data.every((datum) => TIME_LIKE.test(datum.label));
  const barHeight = horizontal ? Math.max(140, Math.min(height + 120, data.length * 34 + 36)) : height;

  return (
    <figure className="w-full">
      {spec.type === "line" && <LineChartView data={data} format={spec.yFormat} measure={measure} height={height} />}
      {spec.type === "pie" && <PieChartView data={data} format={spec.yFormat} measure={measure} height={height - 40} />}
      {spec.type === "bar" && (
        <BarChartView data={data} format={spec.yFormat} measure={measure} height={barHeight} horizontal={horizontal} />
      )}
      {all.length > data.length && (
        <figcaption className="mt-2 text-[12px] text-muted-foreground">
          Showing the first {data.length} of {all.length} rows. The table below has all of them.
        </figcaption>
      )}
    </figure>
  );
}
