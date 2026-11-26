/**
 * Shared chart settings. Colours are CSS variables (globals.css), so charts
 * follow the light/dark theme without re-rendering.
 */

/**
 * Categorical colours in a fixed order, validated for colour-blind
 * separation in both themes. Never cycled: past the last one, charts fold
 * the rest into "Other" (--chart-other).
 */
export const SERIES_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"] as const;

/** Single-series charts use the accent: colour encodes identity, and there is only one series. */
export const PRIMARY_SERIES = SERIES_COLORS[0];

/** Beyond these, a chart stops being readable; the table has the full result. */
export const MAX_BARS = 30;
export const MAX_LINE_POINTS = 366;
export const MAX_PIE_SLICES = 8;
