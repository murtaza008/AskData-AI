"use client";

import { KeyRound, MessageSquareText, Table2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { HoverCard, HoverTitle } from "@/components/ui/hover-card";
import { Notice } from "@/components/ui/notice";
import { useDataSource } from "@/features/chat/hooks/use-data-source";
import { messageOf } from "@/lib/api-client";
import { formatCount } from "@/lib/format";
import type { DataSourceTable } from "@/lib/queries";
import { cn } from "@/lib/utils";

function starterQuestions(table: DataSourceTable): string[] {
  const short = table.name.replace(/^uploads\./, "");
  if (table.isUpload) return [`Summarize the table ${table.name}: how many rows are there and what are the key figures?`];
  const byTable: Record<string, string[]> = {
    customers: ["Which cities have the most customers?", "How many business customers signed up each month this year?"],
    products: ["Which product categories have the highest margin?", "What were our top 5 products by revenue last month?"],
    orders: ["How has monthly revenue trended over the last 12 months?", "What is the average order value by sales channel?"],
    order_items: ["Which products are most often bought in the same order?", "How many units did we sell per category last month?"],
    refunds: ["Which product categories have the highest refund rate?", "What are the most common refund reasons?"],
  };
  return byTable[short] ?? [`What is in the ${short} table?`];
}

function TableRow({ table, active, onSelect }: { table: DataSourceTable; active: boolean; onSelect: () => void }) {
  return (
    <li>
      <HoverCard
        delay="long"
        side="right"
        width={300}
        trigger={
          <button
            type="button"
            onClick={onSelect}
            aria-pressed={active}
            className={cn(
              "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors",
              active ? "bg-accent-soft" : "hover:bg-surface-2",
            )}
          >
            <Table2 aria-hidden className={cn("size-4 shrink-0", active ? "text-accent-text" : "text-fg-subtle")} />
            <span className="min-w-0 flex-1 truncate font-mono text-[13px] text-fg">{table.name}</span>
            <span className="num shrink-0 text-[12px] text-fg-muted">{formatCount(table.rowCount)} rows</span>
          </button>
        }
      >
        <HoverTitle meta={`${table.columnCount} columns`}>{table.name}</HoverTitle>
        {table.comment && <p className="mt-1 text-fg-muted">{table.comment}</p>}
        <p className="mt-2 font-mono text-[11.5px] leading-relaxed text-fg-muted">
          {table.columns.slice(0, 10).map((c) => c.name).join(", ")}
          {table.columns.length > 10 ? `, +${table.columns.length - 10} more` : ""}
        </p>
      </HoverCard>
    </li>
  );
}

/** Every table the agent may query, and what each column means. */
export function TableExplorer() {
  const { data: tables, isLoading, isError, error } = useDataSource();
  const [selected, setSelected] = useState<string | null>(null);

  if (isLoading) {
    return <div className="panel h-[360px] animate-pulse" role="status" aria-label="Loading tables" />;
  }
  if (isError || !tables) {
    return (
      <Notice tone="error" title="The tables couldn't be loaded">
        {messageOf(error)}
      </Notice>
    );
  }

  const current = tables.find((t) => t.name === selected) ?? tables[0];
  const groups = [
    { title: "Demo store", items: tables.filter((t) => !t.isUpload) },
    { title: "Your uploads", items: tables.filter((t) => t.isUpload) },
  ].filter((g) => g.items.length > 0);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]">
      <nav aria-label="Tables" className="panel self-start overflow-hidden">
        {groups.map((group) => (
          <div key={group.title}>
            <p className="eyebrow border-b bg-surface-2 px-4 py-2">{group.title}</p>
            <ul className="divide-y">
              {group.items.map((table) => (
                <TableRow key={table.name} table={table} active={table.name === current?.name} onSelect={() => setSelected(table.name)} />
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {current && (
        <section aria-labelledby="table-detail" className="panel min-w-0">
          <header className="border-b px-5 py-4">
            <p className="eyebrow">{current.isUpload ? "Uploaded table" : "Demo store table"}</p>
            <h2 id="table-detail" className="mt-1 font-mono text-[18px] font-medium tracking-normal [font-stretch:100%]">
              {current.name}
            </h2>
            <p className="mt-1 text-[13.5px] text-fg-muted">
              {current.comment ? `${current.comment} ` : ""}
              <span className="num">
                {formatCount(current.rowCount)} rows · {current.columnCount} columns
              </span>
            </p>
          </header>
          <div className="overflow-x-auto" tabIndex={0} role="region" aria-label={`Columns of ${current.name}`}>
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left">
                  <th scope="col" className="eyebrow px-5 py-2 font-medium">Column</th>
                  <th scope="col" className="eyebrow px-3 py-2 font-medium">Type</th>
                  <th scope="col" className="eyebrow px-5 py-2 font-medium">What it means</th>
                </tr>
              </thead>
              <tbody>
                {current.columns.map((column) => (
                  <tr key={column.name} className="border-t align-top">
                    <td className="whitespace-nowrap px-5 py-2 font-mono text-[12.5px] text-fg">
                      {column.name}
                      {column.isKey && <KeyRound aria-label="key" className="ml-1.5 inline size-3 text-fg-subtle" />}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-[12px] text-fg-muted">{column.type}</td>
                    <td className="px-5 py-2 text-fg-muted">{column.comment ?? "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <footer className="border-t bg-surface-2 px-5 py-3">
            <p className="eyebrow mb-1.5">Ask about it</p>
            <ul className="flex flex-col gap-1">
              {starterQuestions(current).map((question) => (
                <li key={question}>
                  <Link
                    href={`/app?q=${encodeURIComponent(question)}`}
                    className="inline-flex items-start gap-1.5 text-[13.5px] text-accent-text underline-offset-2 hover:underline"
                  >
                    <MessageSquareText aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                    {question}
                  </Link>
                </li>
              ))}
            </ul>
          </footer>
        </section>
      )}
    </div>
  );
}
