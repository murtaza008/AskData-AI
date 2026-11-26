"use client";

import { ChevronRight, Code2 } from "lucide-react";
import { useId, useState } from "react";
import { SqlBlock } from "@/components/data/sql-block";
import { cn } from "@/lib/utils";

/** Collapsible "SQL that ran": the exact query behind the result. */
export function SqlDisclosure({ sql }: { sql: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className="border-t bg-surface-2 px-4 py-2">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={id}
        className="inline-flex items-center gap-1.5 rounded-xs py-0.5 text-[13px] font-medium text-fg-muted hover:text-fg"
      >
        <ChevronRight aria-hidden className={cn("size-3.5 transition-transform duration-200", open && "rotate-90")} />
        <Code2 aria-hidden className="size-3.5" />
        {open ? "Hide the SQL" : "SQL that ran"}
      </button>
      <div id={id} hidden={!open}>
        {open && <SqlBlock sql={sql} className="mb-1.5 mt-2" />}
      </div>
    </div>
  );
}
