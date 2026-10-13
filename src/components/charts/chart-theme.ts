/**
 * Shared chart styling. Colours are CSS variables (globals.css) so charts
 * follow the light/dark theme without re-rendering.
 */

/** Categorical series colours, assigned in this fixed order — never cycled by rank. */
export const SERIES_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
  "var(--chart-7)",
  "var(--chart-8)",
] as const;

/** Single-series charts use one hue: colour encodes identity, and there is only one series. */
export const PRIMARY_SERIES = SERIES_COLORS[0];

export const GRID_STROKE = "var(--chart-grid)";
export const AXIS_STROKE = "var(--border)";

export const AXIS_TICK = {
  fill: "var(--muted-foreground)",
  fontSize: 12,
  fontFamily: "var(--font-mono)",
} as const;

export const CATEGORY_TICK = {
  fill: "var(--foreground)",
  fontSize: 13,
  fontFamily: "var(--font-sans)",
} as const;

/** Beyond these, a chart stops being readable — the table has the full result. */
export const MAX_BARS = 30;
export const MAX_LINE_POINTS = 366;
export const MAX_PIE_SLICES = 8;

export type ChartDatum = { label: string; value: number };

/** Shorten long category labels for axis ticks; the tooltip shows them in full. */
export function truncateLabel(label: string, max: number): string {
  return label.length > max ? `${label.slice(0, max - 1)}…` : label;
}
