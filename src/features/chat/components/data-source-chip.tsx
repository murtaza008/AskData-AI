"use client";

import { Database } from "lucide-react";
import { formatCount } from "@/lib/format";
import { useDataSource } from "../hooks/use-data-source";

/** "Demo store · 5 tables · 9,453 orders" — what the agent can see. */
export function DataSourceChip() {
  const { data: tables, isError } = useDataSource();

  let detail = "Loading tables…";
  if (isError) detail = "Database not reachable";
  else if (tables) {
    const orders = tables.find((table) => table.name === "orders");
    const uploads = tables.filter((table) => table.isUpload).length;
    detail = [
      `${tables.length} ${tables.length === 1 ? "table" : "tables"}`,
      orders ? `${formatCount(orders.rowCount)} orders` : null,
      uploads > 0 ? `${uploads} uploaded` : null,
    ]
      .filter(Boolean)
      .join(" · ");
  }

  return (
    <div className="inline-flex items-center gap-2 rounded-sm border bg-card px-2.5 py-1 text-[13px]">
      <Database className="size-3.5" strokeWidth={1.5} />
      <span>Demo store</span>
      <span className="text-muted-foreground">·</span>
      <span className="num text-muted-foreground">{detail}</span>
    </div>
  );
}
