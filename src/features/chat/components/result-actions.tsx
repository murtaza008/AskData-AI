"use client";

import { Download, Pin } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useCreatePin } from "@/features/dashboard/hooks/use-pins";
import type { ChartSpec, ResultColumn, Row } from "@/lib/agent/types";
import { messageOf } from "@/lib/api-client";
import { downloadTextFile, fileSlug, toCsv } from "@/lib/csv";
import { formatCount } from "@/lib/format";

const actionClass =
  "inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[13px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50";

type ResultActionsProps = {
  question: string;
  sql: string;
  chart: ChartSpec;
  columns: ResultColumn[];
  rows: Row[];
};

/** "Pin to dashboard" and "Export CSV" for one answer. */
export function ResultActions({ question, sql, chart, columns, rows }: ResultActionsProps) {
  const createPin = useCreatePin();

  const pin = () => {
    createPin.mutate(
      { title: chart.title, question, sql, chart },
      {
        onSuccess: () =>
          toast.success("Pinned to dashboard", {
            action: (
              <Link href="/app/dashboard" className="ml-auto text-[13px] font-medium underline underline-offset-2">
                View
              </Link>
            ),
          }),
        onError: (error) => toast.error(messageOf(error)),
      },
    );
  };

  const exportCsv = () => {
    downloadTextFile(`${fileSlug(chart.title)}.csv`, toCsv(columns, rows));
    toast.success(`Exported ${formatCount(rows.length)} ${rows.length === 1 ? "row" : "rows"} to CSV`);
  };

  return (
    <>
      <button type="button" onClick={pin} disabled={createPin.isPending} className={actionClass}>
        <Pin className="size-4" strokeWidth={1.5} />
        <span className="hidden sm:inline">{createPin.isPending ? "Pinning…" : "Pin"}</span>
        <span className="sr-only sm:hidden">Pin to dashboard</span>
      </button>
      <button type="button" onClick={exportCsv} disabled={rows.length === 0} className={actionClass}>
        <Download className="size-4" strokeWidth={1.5} />
        <span className="hidden sm:inline">CSV</span>
        <span className="sr-only sm:hidden">Export CSV</span>
      </button>
    </>
  );
}
