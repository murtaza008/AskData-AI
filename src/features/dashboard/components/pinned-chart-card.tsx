"use client";

import { useState } from "react";
import { toast } from "sonner";
import { DataChart } from "@/components/charts/data-chart";
import { DataTable } from "@/components/data/data-table";
import { SqlBlock } from "@/components/data/sql-block";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { isPlottable } from "@/lib/agent/chart";
import { messageOf } from "@/lib/api-client";
import { downloadTextFile, fileSlug, toCsv } from "@/lib/csv";
import { formatDuration, formatRelative } from "@/lib/format";
import { type Pin, useDeletePin, usePinData } from "../hooks/use-pins";
import { PinMenu } from "./pin-menu";

type View = "chart" | "table" | "sql";

/**
 * One dashboard tile. It does not hold data of its own: on load (and on
 * Refresh) the server re-runs the pin's stored SQL through the full safety
 * pipeline and returns fresh rows.
 */
export function PinnedChartCard({ pin, height = 260 }: { pin: Pin; height?: number }) {
  const [view, setView] = useState<View>("chart");
  const data = usePinData(pin.id);
  const deletePin = useDeletePin();

  const result = data.data;
  const spec = result?.chart ?? pin.chart;
  const canPlot = result ? isPlottable(spec, result.rows) && spec.type !== "table" : false;
  const showing: View = view === "chart" && result && !canPlot ? "table" : view;

  const refresh = async () => {
    const refreshed = await data.refetch();
    if (refreshed.data) toast.success(`Refreshed · ${formatDuration(refreshed.data.durationMs)}`);
  };

  const unpin = () =>
    deletePin.mutate(pin.id, {
      onSuccess: () => toast.success("Unpinned"),
      onError: (error) => toast.error(messageOf(error)),
    });

  return (
    <section className="flex min-w-0 flex-col rounded-lg border bg-card">
      <header className="flex items-start justify-between gap-3 border-b px-4 py-3">
        <div className="min-w-0">
          <h2 className="truncate text-[16px]">{pin.title}</h2>
          <p className="mt-0.5 truncate text-[13px] text-muted-foreground" title={pin.question}>
            “{pin.question}”
          </p>
        </div>
        <PinMenu
          items={[
            { label: "Refresh", onSelect: refresh },
            ...(canPlot && showing !== "chart" ? [{ label: "View chart", onSelect: () => setView("chart") }] : []),
            ...(showing !== "table" ? [{ label: "View table", onSelect: () => setView("table") }] : []),
            ...(showing !== "sql" ? [{ label: "View SQL", onSelect: () => setView("sql") }] : []),
            ...(result
              ? [{ label: "Export CSV", onSelect: () => downloadTextFile(`${fileSlug(pin.title)}.csv`, toCsv(result.columns, result.rows)) }]
              : []),
            { label: "Unpin", onSelect: unpin, danger: true },
          ]}
        />
      </header>

      <div className="min-h-[180px] flex-1 p-4">
        {showing === "sql" ? (
          <SqlBlock sql={pin.sql} compact />
        ) : data.isLoading ? (
          <div className="flex h-full min-h-[180px] items-center justify-center gap-2.5 text-[13px] text-muted-foreground">
            <Spinner /> Running query…
          </div>
        ) : data.isError || !result ? (
          <div className="flex h-full min-h-[180px] flex-col items-center justify-center gap-3 text-center">
            <p className="max-w-[40ch] text-[14px] text-muted-foreground">
              This chart couldn&apos;t be refreshed: {messageOf(data.error)}
            </p>
            <Button variant="outline" size="sm" onClick={() => data.refetch()}>
              Try again
            </Button>
          </div>
        ) : showing === "chart" ? (
          <DataChart spec={spec} rows={result.rows} height={height} />
        ) : (
          <DataTable columns={result.columns} rows={result.rows} truncated={result.truncated} />
        )}
      </div>

      {result && (
        <footer className="num border-t px-4 py-2 text-[12px] text-muted-foreground">
          {data.isFetching ? "Refreshing…" : `Live query · refreshed ${formatRelative(result.refreshedAt)}`}
        </footer>
      )}
    </section>
  );
}
