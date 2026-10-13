import { CHART_TYPES, VALUE_FORMATS, type ChartSpec, type ChartType, type ResultColumn, type Row, type ValueFormat } from "./types";

/**
 * Chart-spec resolution. The model proposes a spec; we never trust it blindly:
 * field names are checked against the real result columns and anything that
 * would draw a broken chart is repaired or downgraded to a table.
 */

const TIME_NAME = /(^|_)(date|day|week|month|quarter|year|period|time)(_|$)/i;
const CURRENCY_NAME = /(revenue|sales|amount|price|cost|spend|value|total|aov|refund|profit|margin|income|gmv|usd)/i;
const PERCENT_NAME = /(pct|percent|percentage|rate|share|ratio)/i;
const COUNT_NAME = /(count|orders|customers|units|quantity|qty|items|number|num_)/i;
const ID_NAME = /(^id$|_id$)/i;

/** Pie charts stop being readable beyond a handful of slices. */
const MAX_PIE_SLICES = 8;

export function inferValueFormat(columnName: string): ValueFormat {
  if (PERCENT_NAME.test(columnName)) return "percent";
  // "order_count" mentions orders, not money — counts win over currency words.
  if (COUNT_NAME.test(columnName) && !/(revenue|amount|value|sales)/i.test(columnName)) return "number";
  if (CURRENCY_NAME.test(columnName)) return "currency";
  return "number";
}

export function humanize(name: string): string {
  const spaced = name.replace(/_/g, " ").trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function isTimeColumn(column: ResultColumn): boolean {
  return column.kind === "date" || TIME_NAME.test(column.name);
}

export type ProposedChart = {
  type?: string | null;
  x?: string | null;
  y?: string | null;
  title?: string | null;
  yFormat?: string | null;
};

export function resolveChartSpec(
  proposed: ProposedChart | null | undefined,
  columns: ResultColumn[],
  rows: Row[],
): ChartSpec {
  const names = new Set(columns.map((column) => column.name));
  const numeric = columns.filter((column) => column.kind === "number");
  const measures = numeric.filter((column) => !ID_NAME.test(column.name));

  // x: the proposed field if it exists, else the first label-like column.
  const xColumn =
    columns.find((column) => column.name === proposed?.x) ??
    columns.find((column) => column.kind !== "number") ??
    columns[0];

  // y: must be numeric and different from x.
  const yColumn =
    numeric.find((column) => column.name === proposed?.y && column.name !== xColumn?.name) ??
    measures.find((column) => column.name !== xColumn?.name) ??
    numeric.find((column) => column.name !== xColumn?.name);

  const x = xColumn?.name ?? "";
  const y = yColumn?.name ?? "";
  const title = proposed?.title?.trim() || (x && y ? `${humanize(y)} by ${humanize(x).toLowerCase()}` : "Result");
  const yFormat = VALUE_FORMATS.find((format) => format === proposed?.yFormat) ?? inferValueFormat(y);

  // Nothing to plot: no measure, a single value, or an empty result.
  if (!xColumn || !yColumn || rows.length < 2 || !names.has(x)) {
    return { type: "table", x, y, title, yFormat };
  }

  let type: ChartType =
    CHART_TYPES.find((candidate) => candidate === proposed?.type) ?? (isTimeColumn(xColumn) ? "line" : "bar");

  if (type === "pie" && (rows.length > MAX_PIE_SLICES || rows.some((row) => Number(row[y]) < 0))) type = "bar";
  if (type === "line" && rows.length < 3) type = "bar";

  return { type, x, y, title, yFormat };
}

/** Chart types a result set can sensibly be switched between in the UI. */
export function isPlottable(spec: ChartSpec | null, rows: Row[]): boolean {
  return Boolean(spec && spec.x && spec.y && rows.length >= 2);
}
