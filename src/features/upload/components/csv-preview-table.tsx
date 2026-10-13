"use client";

import { UPLOAD_COLUMN_TYPES, type UploadColumn, type UploadColumnType } from "@/lib/uploads/types";
import { cn } from "@/lib/utils";

type CsvPreviewTableProps = {
  columns: UploadColumn[];
  rows: string[][];
  onTypeChange: (name: string, type: UploadColumnType) => void;
  disabled?: boolean;
};

/** First rows of the file, with a type selector on every column. */
export function CsvPreviewTable({ columns, rows, onTypeChange, disabled }: CsvPreviewTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b">
            {columns.map((column) => (
              <th
                key={column.name}
                scope="col"
                className={cn("px-4 py-2.5 align-top font-normal", column.type === "number" ? "text-right" : "text-left")}
              >
                <div className="num text-[12px] font-medium text-foreground" title={`In the file: "${column.originalName}"`}>
                  {column.name}
                </div>
                <select
                  value={column.type}
                  disabled={disabled}
                  aria-label={`Type of column ${column.name}`}
                  onChange={(event) => onTypeChange(column.name, event.target.value as UploadColumnType)}
                  className="mt-1 rounded-full border bg-card px-1.5 py-px text-[11px] text-muted-foreground hover:border-primary"
                >
                  {UPLOAD_COLUMN_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-b last:border-0">
              {columns.map((column, columnIndex) => (
                <td
                  key={column.name}
                  className={cn(
                    "max-w-[240px] truncate px-4 py-2",
                    column.type !== "text" && "num",
                    column.type === "number" && "text-right",
                  )}
                >
                  {row[columnIndex] ?? ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
