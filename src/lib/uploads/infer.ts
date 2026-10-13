import type { UploadColumn, UploadColumnType } from "./types";

/**
 * CSV column naming, type inference and value normalisation.
 *
 * Isomorphic on purpose: the browser uses it to preview what will happen, and
 * the server runs the very same code as the source of truth when loading the
 * file — so the preview can never disagree with the result.
 */

const TRUE_VALUES = new Set(["true", "t", "yes", "y"]);
const FALSE_VALUES = new Set(["false", "f", "no", "n"]);

/** Values that mean "no data" in exported spreadsheets. */
const NULL_VALUES = new Set(["", "null", "nil", "n/a", "na", "nan", "-", "--"]);

// SQL keywords that would be awkward as bare column names.
const RESERVED = new Set([
  "select", "from", "where", "group", "order", "by", "limit", "table", "user", "column", "date", "time",
  "end", "desc", "asc", "all", "and", "or", "not", "null", "true", "false", "case", "when", "then", "else",
  "join", "on", "as", "in", "is", "to", "do", "default", "check", "primary", "references", "unique", "offset",
]);

const MAX_IDENTIFIER_LENGTH = 48;

/** Turn any header into a safe, lowercase snake_case identifier. */
export function toIdentifier(raw: string, fallback: string): string {
  let name = raw
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, MAX_IDENTIFIER_LENGTH);

  if (!name) name = fallback;
  if (/^[0-9]/.test(name)) name = `c_${name}`;
  if (RESERVED.has(name)) name = `${name}_value`;
  return name;
}

/** Sanitise all headers, de-duplicating collisions with a numeric suffix. */
export function toColumnNames(headers: string[]): string[] {
  const used = new Set<string>();
  return headers.map((header, index) => {
    const base = toIdentifier(header, `column_${index + 1}`);
    let name = base;
    for (let n = 2; used.has(name); n++) name = `${base}_${n}`;
    used.add(name);
    return name;
  });
}

function isNullish(raw: string): boolean {
  return NULL_VALUES.has(raw.trim().toLowerCase());
}

/** "$1,234.50" / "12%" / "(45)" → canonical numeric string, or null if not a number. */
function parseNumber(raw: string): string | null {
  let text = raw.trim();
  const negative = /^\(.*\)$/.test(text); // accounting-style negatives
  if (negative) text = text.slice(1, -1);
  text = text.replace(/^[$€£¥]\s*/, "").replace(/\s*%$/, "").replace(/,(?=\d{3}(\D|$))/g, "");
  if (!/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(text)) return null;
  const value = Number(text);
  if (!Number.isFinite(value)) return null;
  return negative ? String(-value) : String(value);
}

const pad = (value: string | number) => String(value).padStart(2, "0");

/**
 * Accepts ISO dates/timestamps, `YYYY/MM/DD`, and `MM/DD/YYYY`.
 * Returns an ISO string ("2026-03-09" or "2026-03-09T14:30:00"), or null.
 */
function parseDate(raw: string): string | null {
  const text = raw.trim();

  const iso = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T ](\d{1,2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)?$/);
  const us = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

  let year: number, month: number, day: number;
  let time = "";
  if (iso) {
    [year, month, day] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
    if (iso[4] !== undefined) time = `T${pad(iso[4])}:${iso[5]}:${iso[6] ?? "00"}`;
  } else if (us) {
    [month, day, year] = [Number(us[1]), Number(us[2]), Number(us[3])];
  } else {
    return null;
  }

  // Reject impossible dates such as 2026-02-31.
  const check = new Date(Date.UTC(year, month - 1, day));
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) {
    return null;
  }
  return `${year}-${pad(month)}-${pad(day)}${time}`;
}

function parseBoolean(raw: string): string | null {
  const text = raw.trim().toLowerCase();
  if (TRUE_VALUES.has(text)) return "true";
  if (FALSE_VALUES.has(text)) return "false";
  return null;
}

/**
 * Normalise one cell for a column type. `null` means SQL NULL; `undefined`
 * means the value does not fit the type (the caller decides how to react).
 */
export function normalizeValue(raw: string | undefined, type: UploadColumnType): string | null | undefined {
  if (raw === undefined || isNullish(raw)) return null;
  switch (type) {
    case "number":
      return parseNumber(raw) ?? undefined;
    case "date":
      return parseDate(raw) ?? undefined;
    case "boolean":
      return parseBoolean(raw) ?? undefined;
    case "text":
      return raw.trim();
  }
}

/** A column is typed X only if every non-empty value parses as X. */
export function inferType(values: (string | undefined)[]): UploadColumnType {
  const present = values.filter((value): value is string => value !== undefined && !isNullish(value));
  if (present.length === 0) return "text";

  const all = (type: UploadColumnType) => present.every((value) => normalizeValue(value, type) !== undefined);
  if (all("boolean")) return "boolean";
  if (all("number")) return "number";
  if (all("date")) return "date";
  return "text";
}

export function inferColumns(headers: string[], rows: string[][]): UploadColumn[] {
  const names = toColumnNames(headers);
  return headers.map((header, index) => ({
    name: names[index],
    originalName: header,
    type: inferType(rows.map((row) => row[index])),
  }));
}

/** "Q3 Sales (final).csv" → "q3_sales_final" */
export function tableSlug(fileName: string): string {
  // Strip only a real extension (".csv"), not everything after the last dot.
  return toIdentifier(fileName.replace(/\.[a-z0-9]{1,5}$/i, ""), "data").slice(0, 32).replace(/_+$/, "") || "data";
}
