"use client";

import { ChevronRight } from "lucide-react";
import { useState } from "react";
import { SqlBlock } from "@/components/data/sql-block";
import { cn } from "@/lib/utils";

/** Collapsible "Show SQL" — the exact query that produced the result. */
export function SqlDisclosure({ sql }: { sql: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t px-4 py-2.5">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground"
      >
        <ChevronRight className={cn("size-3.5 transition-transform duration-150", open && "rotate-90")} strokeWidth={1.5} />
        {open ? "Hide SQL" : "Show SQL"}
      </button>
      {open && <SqlBlock sql={sql} className="mt-2.5" />}
    </div>
  );
}
