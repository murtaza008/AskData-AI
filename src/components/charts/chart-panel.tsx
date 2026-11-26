"use client";

import { BarChart3, Table2 } from "lucide-react";
import { type ReactNode, useId, useState } from "react";
import { cn } from "@/lib/utils";

export type TableSpec = {
  columns: { key: string; label: string; numeric?: boolean }[];
  rows: Record<string, ReactNode>[];
};

/**
 * Frame for every dashboard chart: title, a Chart / Table switch (a radio
 * group, since the two views replace each other in place) and the content.
 * Every chart therefore has a table view of the same numbers.
 */
export function ChartPanel({
  title,
  subtitle,
  table,
  children,
  actions,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  table: TableSpec;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  const [view, setView] = useState<"chart" | "table">("chart");
  const id = useId();

  return (
    <section aria-labelledby={`${id}-title`} className={cn("panel flex min-w-0 flex-col", className)}>
      <header className="flex items-start justify-between gap-3 px-5 pb-3 pt-4">
        <div className="min-w-0">
          <h2 id={`${id}-title`} className="text-[16px]">
            {title}
          </h2>
          {subtitle && <p className="mt-0.5 text-[12.5px] text-fg-muted">{subtitle}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {actions}
          <div role="radiogroup" aria-label="View" className="inline-flex rounded-sm border bg-sunken p-0.5">
            {(["chart", "table"] as const).map((option) => {
              const Icon = option === "chart" ? BarChart3 : Table2;
              return (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={view === option}
                  aria-label={option === "chart" ? "Chart view" : "Table view"}
                  title={option === "chart" ? "Chart view" : "Table view"}
                  data-press=""
                  onClick={() => setView(option)}
                  className={cn(
                    "grid size-6 place-items-center rounded-[4px] transition-colors",
                    view === option ? "bg-surface text-fg shadow-[var(--shadow-xs)]" : "text-fg-subtle hover:text-fg",
                  )}
                >
                  <Icon aria-hidden className="size-3.5" />
                </button>
              );
            })}
          </div>
        </div>
      </header>
      <div className="min-w-0 flex-1 px-5 pb-5">
        {view === "chart" ? (
          children
        ) : (
          <div className="max-h-[320px] overflow-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr>
                  {table.columns.map((column) => (
                    <th
                      key={column.key}
                      scope="col"
                      className={cn("eyebrow sticky top-0 border-b bg-surface py-2 pr-4 font-medium last:pr-0", column.numeric ? "text-right" : "text-left")}
                    >
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row, i) => (
                  <tr key={i} className="border-b last:border-0">
                    {table.columns.map((column) => (
                      <td key={column.key} className={cn("py-1.5 pr-4 last:pr-0", column.numeric ? "num text-right text-[12.5px]" : "text-fg")}>
                        {row[column.key]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
