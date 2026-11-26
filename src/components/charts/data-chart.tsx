"use client";

import { humanize } from "@/lib/agent/chart";
import type { ChartSpec, Row } from "@/lib/agent/types";
import { formatLabel } from "@/lib/format";
import { BarChart } from "./bar-chart";
import { type BarDatum } from "./bar-chart";
import { MAX_BARS, MAX_LINE_POINTS, MAX_PIE_SLICES, SERIES_COLORS } from "./chart-theme";
import { DonutChart } from "./donut-chart";
import { LineChart } from "./line-chart";

const TIME_LIKE = /^\d{4}([-/]\d{1,2})?([-/]\d{1,2})?$|^(q[1-4]|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i;

type DataChartProps = {
  spec: ChartSpec;
  rows: Row[];
  height?: number;
};

/** Turn result rows into { label, value } points, dropping rows without a numeric y. */
function toData(spec: ChartSpec, rows: Row[]): BarDatum[] {
  const data: BarDatum[] = [];
  for (const row of rows) {
    const value = Number(row[spec.y]);
    if (row[spec.y] === null || !Number.isFinite(value)) continue;
    data.push({ label: formatLabel(row[spec.x] ?? null), value });
  }
  return data;
}

/** Keep the first slices in their fixed colours and fold the rest into "Other". */
function foldSlices(data: BarDatum[]): BarDatum[] {
  if (data.length <= SERIES_COLORS.length) return data;
  const kept = data.slice(0, SERIES_COLORS.length - 1);
  const rest = data.slice(SERIES_COLORS.length - 1).reduce((sum, d) => sum + d.value, 0);
  return [...kept, { label: "Other", value: rest }];
}

/**
 * Draws a result set according to its chart spec with the app's own SVG
 * charts. Table-type specs render nothing here: the caller shows the table.
 */
export function DataChart({ spec, rows, height = 280 }: DataChartProps) {
  if (spec.type === "table") return null;

  const all = toData(spec, rows);
  if (all.length === 0) {
    return <p className="py-10 text-center text-[14px] text-fg-muted">Nothing to plot for this result.</p>;
  }

  const limit = spec.type === "line" ? MAX_LINE_POINTS : spec.type === "pie" ? MAX_PIE_SLICES : MAX_BARS;
  const data = all.slice(0, limit);
  const measure = humanize(spec.y);
  const timeLike = data.every((datum) => TIME_LIKE.test(datum.label));

  return (
    <figure className="w-full">
      {spec.type === "line" && (
        <LineChart
          labels={data.map((d) => d.label)}
          series={[{ name: measure, values: data.map((d) => d.value), color: "var(--chart-1)" }]}
          format={spec.yFormat}
          height={height}
        />
      )}
      {spec.type === "pie" && <DonutChart data={foldSlices(data)} format={spec.yFormat} measure={measure} />}
      {spec.type === "bar" && (
        // Rankings read best as horizontal bars; time buckets and long series stay vertical.
        <BarChart
          data={data}
          format={spec.yFormat}
          measure={measure}
          orientation={timeLike || data.length > 15 ? "vertical" : "horizontal"}
          height={height}
        />
      )}
      {all.length > data.length && (
        <figcaption className="mt-2 text-[12px] text-fg-muted">
          Showing the first {data.length} of {all.length} rows. The table has all of them.
        </figcaption>
      )}
    </figure>
  );
}
