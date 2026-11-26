"use client";

import { Download, MoreHorizontal, PinOff, RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { DataChart } from "@/components/charts/data-chart";
import { DataTable } from "@/components/data/data-table";
import { SqlBlock } from "@/components/data/sql-block";
import { Button } from "@/components/ui/button";
import { HoverCard } from "@/components/ui/hover-card";
import { IconButton } from "@/components/ui/icon-button";
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { Spinner } from "@/components/ui/spinner";
import { isPlottable } from "@/lib/agent/chart";
import { messageOf } from "@/lib/api-client";
import { downloadTextFile, fileSlug, toCsv } from "@/lib/csv";
import { formatDuration, formatRelative } from "@/lib/format";
import { useAccount } from "@/lib/hooks/use-account";
import { cn } from "@/lib/utils";
import { type Pin, useDeletePin, usePinData } from "../hooks/use-pins";

type View = "chart" | "table" | "sql";

/**
 * One dashboard tile. It holds no data of its own: on load (and on Refresh)
 * the server re-runs the pin's stored SQL through the full safety pipeline.
 */
export function PinnedChartCard({ pin, height = 250 }: { pin: Pin; height?: number }) {
  const [view, setView] = useState<View>("chart");
  const data = usePinData(pin.id);
  const deletePin = useDeletePin();
  const { isDemo } = useAccount();

  const result = data.data;
  const spec = result?.chart ?? pin.chart;
  const canPlot = result ? isPlottable(spec, result.rows) && spec.type !== "table" : true;
  const showing: View = view === "chart" && !canPlot ? "table" : view;

  const refresh = async () => {
    const refreshed = await data.refetch();
    if (refreshed.data) toast.success(`Refreshed in ${formatDuration(refreshed.data.durationMs)}`);
  };

  const unpin = () =>
    deletePin.mutate(pin.id, {
      onSuccess: () => toast.success("Unpinned"),
      onError: (error) => toast.error(messageOf(error)),
    });

  const views: View[] = canPlot ? ["chart", "table", "sql"] : ["table", "sql"];

  return (
    <section aria-label={pin.title} className="panel flex h-full min-w-0 flex-col">
      <header className="flex items-start justify-between gap-3 px-5 pb-3 pt-4">
        <div className="min-w-0">
          <HoverCard
            delay="long"
            width={320}
            trigger={
              <h3 tabIndex={0} className="truncate rounded-xs text-[16px]">
                {pin.title}
              </h3>
            }
          >
            <p className="font-medium text-fg">{pin.title}</p>
            <p className="mt-1 text-fg-muted">Asked as: “{pin.question}”</p>
            <p className="mt-2 text-[12px] text-fg-muted">Pinned {formatRelative(pin.createdAt)}</p>
          </HoverCard>
          <p className="mt-0.5 truncate text-[12.5px] text-fg-muted">“{pin.question}”</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <div role="radiogroup" aria-label={`View for ${pin.title}`} className="inline-flex rounded-sm border bg-sunken p-0.5">
            {views.map((option) => (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={showing === option}
                data-press=""
                onClick={() => setView(option)}
                className={cn(
                  "rounded-[4px] px-2 py-0.5 text-[12px] capitalize transition-colors",
                  showing === option ? "bg-surface text-fg shadow-[var(--shadow-xs)]" : "text-fg-muted hover:text-fg",
                )}
              >
                {option === "sql" ? "SQL" : option}
              </button>
            ))}
          </div>
          <Menu>
            <MenuTrigger asChild>
              <IconButton label={`More for ${pin.title}`}>
                <MoreHorizontal aria-hidden className="size-4" />
              </IconButton>
            </MenuTrigger>
            <MenuContent>
              <MenuItem onSelect={() => void refresh()}>
                <RefreshCw aria-hidden /> Refresh now
              </MenuItem>
              <MenuItem
                disabled={!result}
                onSelect={() => result && downloadTextFile(`${fileSlug(pin.title)}.csv`, toCsv(result.columns, result.rows))}
              >
                <Download aria-hidden /> Export CSV
              </MenuItem>
              <MenuSeparator />
              {isDemo ? (
                <MenuItem disabled className="items-start text-fg-muted data-[disabled]:opacity-100">
                  <PinOff aria-hidden className="mt-0.5" />
                  <span>Unpinning is off in the shared demo, so the next visitor sees the same dashboard.</span>
                </MenuItem>
              ) : (
                <MenuItem danger onSelect={unpin}>
                  <PinOff aria-hidden /> Unpin
                </MenuItem>
              )}
            </MenuContent>
          </Menu>
        </div>
      </header>

      <div className="min-h-[200px] min-w-0 flex-1 px-5 pb-4">
        {showing === "sql" ? (
          <SqlBlock sql={pin.sql} compact />
        ) : data.isLoading ? (
          <div className="flex h-full min-h-[200px] items-center justify-center gap-2.5 text-[13px] text-fg-muted" role="status">
            <Spinner /> Running the query…
          </div>
        ) : data.isError || !result ? (
          <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-3 text-center">
            <p className="max-w-[40ch] text-[14px] text-fg-muted">This chart couldn&apos;t be refreshed: {messageOf(data.error)}</p>
            <Button variant="outline" size="sm" onClick={() => void data.refetch()}>
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
        <footer className="num border-t px-5 py-2 text-[11.5px] text-fg-muted">
          {data.isFetching ? "Refreshing…" : `Live query · ${result.rowCount} rows · ran in ${formatDuration(result.durationMs)} · ${formatRelative(result.refreshedAt)}`}
        </footer>
      )}
    </section>
  );
}
