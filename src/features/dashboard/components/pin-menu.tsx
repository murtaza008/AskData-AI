"use client";

import { MoreHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { IconButton } from "@/components/ui/icon-button";
import { cn } from "@/lib/utils";

export type PinMenuItem = { label: string; onSelect: () => void; danger?: boolean };

/** Small "…" dropdown for a pinned chart. Closes on outside click or Escape. */
export function PinMenu({ items }: { items: PinMenuItem[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <IconButton label="Chart options" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}>
        <MoreHorizontal className="size-4" strokeWidth={1.5} />
      </IconButton>
      {open && (
        <div role="menu" className="absolute right-0 z-10 mt-1 w-40 rounded-md border bg-popover py-1 text-[13px] shadow-pop">
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
              className={cn("block w-full px-3 py-1.5 text-left hover:bg-muted", item.danger && "text-destructive")}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
