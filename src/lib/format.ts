import { inferValueFormat } from "@/lib/agent/chart";
import type { Cell, ResultColumn, ValueFormat } from "@/lib/agent/types";

/** Number, date and duration formatting shared by tables, charts and KPIs. */

const LOCALE = "en-US";

const currency = new Intl.NumberFormat(LOCALE, { style: "currency", currency: "USD", maximumFractionDigits: 2 });
const currencyWhole = new Intl.NumberFormat(LOCALE, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 2 });
const compact = new Intl.NumberFormat(LOCALE, { notation: "compact", maximumFractionDigits: 1 });
const compactCurrency = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

/** Full-precision value for tables and tooltips. */
export function formatValue(value: number, format: ValueFormat): string {
  if (format === "currency") return Math.abs(value) >= 1000 ? currencyWhole.format(value) : currency.format(value);
  if (format === "percent") return `${decimal.format(value)}%`;
  return decimal.format(value);
}

/** Short value for axis ticks: 12.4K, $1.2M. */
export function formatCompact(value: number, format: ValueFormat): string {
  if (format === "currency") return compactCurrency.format(value);
  if (format === "percent") return `${decimal.format(value)}%`;
  return Math.abs(value) >= 10_000 ? compact.format(value) : decimal.format(value);
}

const IDENTIFIER_NAME = /(^id$|_id$|^year$|_year$|zip|postal|phone)/i;
const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

/** Render one result cell for the data table. */
export function formatCell(value: Cell, column: ResultColumn): string {
  if (value === null) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") {
    // Ids and years are labels, not quantities: no thousands separators.
    if (IDENTIFIER_NAME.test(column.name)) return String(value);
    return formatValue(value, inferValueFormat(column.name));
  }
  if (ISO_TIMESTAMP.test(value)) return value.slice(0, 16).replace("T", " ");
  return value;
}

/** Axis / legend label for a category value. */
export function formatLabel(value: Cell): string {
  if (value === null) return "(none)";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  const text = String(value);
  return ISO_TIMESTAMP.test(text) ? text.slice(0, 10) : text;
}

export function formatDuration(ms: number): string {
  return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(1)}s`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function formatCount(value: number): string {
  return value.toLocaleString(LOCALE);
}

/** "2 hours ago", "in 5 days" */
export function formatRelative(iso: string, now: number = Date.now()): string {
  const diff = new Date(iso).getTime() - now;
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["day", 86_400_000],
    ["hour", 3_600_000],
    ["minute", 60_000],
  ];
  const formatter = new Intl.RelativeTimeFormat(LOCALE, { numeric: "auto" });
  for (const [unit, size] of units) {
    if (Math.abs(diff) >= size) return formatter.format(Math.round(diff / size), unit);
  }
  return "just now";
}
