"use client";

import { useState } from "react";
import { humanize } from "@/lib/agent/chart";
import type { ResultColumn, Row } from "@/lib/agent/types";
import { formatCell, formatCount } from "@/lib/format";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 12;

type DataTableProps = {
  columns: ResultColumn[];
  rows: Row[];
  /** True when the server's automatic row limit cut the result short. */
  truncated?: boolean;
};

/** Result table: numbers right-aligned in tabular figures, long results collapsed. */
export function DataTable({ columns, rows, truncated }: DataTableProps) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? rows : rows.slice(0, PAGE_SIZE);
  const hidden = rows.length - visible.length;

  if (rows.length === 0) {
    return <p className="py-6 text-center text-[14px] text-muted-foreground">The query returned no rows.</p>;
  }

  return (
    <div>
      <div className="max-h-[420px] overflow-auto">
        <table className="w-full border-separate border-spacing-0 text-[14px]">
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.name}
                  scope="col"
                  className={cn(
                    "label-caps sticky top-0 whitespace-nowrap border-b bg-card py-2 pr-5 last:pr-0",
                    column.kind === "number" ? "text-right" : "text-left",
                  )}
                >
                  {humanize(column.name)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-muted/50">
                {columns.map((column) => (
                  <td
                    key={column.name}
                    className={cn(
                      "max-w-[320px] truncate border-b py-2 pr-5 last:pr-0",
                      rowIndex === visible.length - 1 && "border-b-0",
                      column.kind === "number" && "num text-right text-[13px]",
                      column.kind === "date" && "num text-[13px]",
                    )}
                  >
                    {formatCell(row[column.name] ?? null, column)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[12px] text-muted-foreground">
        <span className="num">
          {formatCount(rows.length)} {rows.length === 1 ? "row" : "rows"}
          {truncated && " · result capped by the row limit"}
        </span>
        {(hidden > 0 || expanded) && rows.length > PAGE_SIZE && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="font-medium text-foreground underline-offset-2 hover:underline"
          >
            {expanded ? "Show fewer" : `Show all ${formatCount(rows.length)} rows`}
          </button>
        )}
      </div>
    </div>
  );
}
