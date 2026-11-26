"use client";

import { Check, Download, Pin } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useCreatePin, usePins } from "@/features/dashboard/hooks/use-pins";
import type { ChartSpec, ResultColumn, Row } from "@/lib/agent/types";
import { messageOf } from "@/lib/api-client";
import { downloadTextFile, fileSlug, toCsv } from "@/lib/csv";
import { formatCount } from "@/lib/format";
import { cn } from "@/lib/utils";

const actionClass =
  "inline-flex h-8 items-center gap-1.5 rounded-sm px-2.5 text-[13px] text-fg-muted transition-colors hover:bg-sunken hover:text-fg disabled:opacity-50";

type ResultActionsProps = {
  question: string;
  sql: string;
  chart: ChartSpec;
  columns: ResultColumn[];
  rows: Row[];
};

/** A small "pop" on the icon, run outside React and only after a pointer click. */
function pop(element: Element | null | undefined) {
  if (!element || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  element.animate(
    [{ transform: "scale(1)" }, { transform: "scale(1.35) rotate(-12deg)" }, { transform: "scale(1)" }],
    { duration: 360, easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
  );
}

/** "Pin to dashboard" (instant: the dashboard cache updates before the server answers) and "Export CSV". */
export function ResultActions({ question, sql, chart, columns, rows }: ResultActionsProps) {
  const createPin = useCreatePin();
  const pins = usePins();
  const [pinning, setPinning] = useState(false);
  // Pinned if the dashboard already has this exact query (survives navigation and reloads).
  const pinned = pinning || Boolean(pins.data?.some((pin) => pin.sql === sql && pin.question === question));
  const pinIcon = useRef<SVGSVGElement>(null);
  const byPointer = useRef(false);

  const pin = () => {
    if (byPointer.current) pop(pinIcon.current);
    byPointer.current = false;
    setPinning(true);
    // mutateAsync, not mutate callbacks: the toast must still appear if the page
    // changes (a new chat moves to its own URL) while the pin is being saved.
    createPin
      .mutateAsync({ title: chart.title, question, sql, chart })
      .then(() =>
        toast.success("Pinned to the dashboard", {
          action: (
            <Link href="/app/dashboard" className="ml-auto text-[13px] font-medium underline underline-offset-2">
              View
            </Link>
          ),
        }),
      )
      .catch((error: unknown) => {
        setPinning(false);
        toast.error(messageOf(error));
      });
  };

  const exportCsv = () => {
    downloadTextFile(`${fileSlug(chart.title)}.csv`, toCsv(columns, rows));
    toast.success(`Exported ${formatCount(rows.length)} ${rows.length === 1 ? "row" : "rows"} to CSV`);
  };

  return (
    <>
      <button
        type="button"
        onPointerDown={() => (byPointer.current = true)}
        onClick={pin}
        disabled={pinned}
        data-press=""
        className={cn(actionClass, pinned && "text-accent-text disabled:opacity-100")}
      >
        {pinned ? <Check aria-hidden className="size-4" /> : <Pin ref={pinIcon} aria-hidden className="size-4" />}
        <span className="max-sm:sr-only">{pinned ? "Pinned" : "Pin to dashboard"}</span>
      </button>
      <button type="button" onClick={exportCsv} disabled={rows.length === 0} data-press="" className={actionClass}>
        <Download aria-hidden className="size-4" />
        <span className="max-sm:sr-only">Export CSV</span>
      </button>
    </>
  );
}
