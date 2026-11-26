"use client";

import { Database } from "lucide-react";
import { HoverCard, HoverTitle } from "@/components/ui/hover-card";
import { formatCount } from "@/lib/format";
import { useDataSource } from "../hooks/use-data-source";

/** "Demo store · 6 tables": what the agent can see, with the table list on hover or focus. */
export function DataSourceChip() {
  const { data: tables, isError } = useDataSource();

  const label = isError ? "Database not reachable" : tables ? `${tables.length} ${tables.length === 1 ? "table" : "tables"}` : "Loading…";

  return (
    <HoverCard
      width={300}
      trigger={
        <button
          type="button"
          className="inline-flex h-7 items-center gap-2 rounded-full border bg-surface px-2.5 text-[12.5px] text-fg-muted hover:border-border-strong hover:text-fg"
        >
          <Database aria-hidden className="size-3.5" />
          <span className="text-fg">Demo store</span>
          <span className="num">{label}</span>
        </button>
      }
    >
      <HoverTitle meta="read-only">Tables the agent can query</HoverTitle>
      {tables ? (
        <ul className="mt-2.5 space-y-1">
          {tables.map((table) => (
            <li key={table.name} className="flex items-baseline justify-between gap-3">
              <span className="truncate font-mono text-[12px] text-fg">{table.name}</span>
              <span className="num shrink-0 text-[11.5px] text-fg-muted">
                {formatCount(table.rowCount)} rows{table.isUpload ? " · upload" : ""}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-fg-muted">Loading the tables…</p>
      )}
    </HoverCard>
  );
}
