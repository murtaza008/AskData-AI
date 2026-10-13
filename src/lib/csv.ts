import type { Cell, ResultColumn, Row } from "@/lib/agent/types";

/** Quote a CSV field when needed (RFC 4180). */
function escapeField(value: Cell): string {
  if (value === null) return "";
  let text = String(value);
  // Neutralise spreadsheet formula injection: a cell starting with = + - @
  // would be executed as a formula when the export is opened in Excel/Sheets.
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(columns: ResultColumn[], rows: Row[]): string {
  const header = columns.map((column) => escapeField(column.name)).join(",");
  const lines = rows.map((row) => columns.map((column) => escapeField(row[column.name] ?? null)).join(","));
  return [header, ...lines].join("\r\n");
}

/** Trigger a browser download of `content` as a file. */
export function downloadTextFile(fileName: string, content: string, mimeType = "text/csv;charset=utf-8"): void {
  // The BOM makes Excel read the file as UTF-8.
  const blob = new Blob(["﻿", content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** "Revenue by month" → "revenue-by-month" */
export function fileSlug(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "askdata-export"
  );
}
