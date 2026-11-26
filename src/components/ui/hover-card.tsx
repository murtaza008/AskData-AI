"use client";

import * as HC from "@radix-ui/react-hover-card";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The one hover-preview component used across the app. Hover only adds detail:
 * everything shown here is also reachable by clicking through or by keyboard
 * (Radix opens it on keyboard focus of the trigger too).
 *
 * `delay`: "short" for navigation and KPIs; "long" for list rows, where people
 * move the mouse quickly and should not see cards pop everywhere.
 */
export function HoverCard({
  trigger,
  children,
  side = "bottom",
  align = "start",
  delay = "short",
  width = 300,
  className,
  disabled = false,
}: {
  trigger: ReactNode;
  children: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  delay?: "short" | "long";
  width?: number;
  className?: string;
  /** Render only the trigger (e.g. inside the touch navigation drawer). */
  disabled?: boolean;
}) {
  if (disabled) return <>{trigger}</>;
  return (
    <HC.Root openDelay={delay === "long" ? 700 : 300} closeDelay={100}>
      <HC.Trigger asChild>{trigger}</HC.Trigger>
      <HC.Portal>
        <HC.Content
          side={side}
          align={align}
          sideOffset={8}
          collisionPadding={12}
          style={{ width }}
          className={cn("panel-raised animate-pop z-50 p-4 text-[13px] text-fg outline-none", className)}
        >
          {children}
        </HC.Content>
      </HC.Portal>
    </HC.Root>
  );
}

/** Title row for a hover card. */
export function HoverTitle({ children, meta }: { children: ReactNode; meta?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <p className="font-medium text-fg">{children}</p>
      {meta && <span className="eyebrow shrink-0">{meta}</span>}
    </div>
  );
}

/** Label/value rows for hover cards, as valid dl > div > dt + dd markup. */
export function HoverStats({ rows, className }: { rows: { label: string; value: ReactNode }[]; className?: string }) {
  return (
    <dl className={cn("mt-3 space-y-1.5", className)}>
      {rows.map((row) => (
        <div key={row.label} className="flex items-baseline justify-between gap-4">
          <dt className="text-fg-muted">{row.label}</dt>
          <dd className="num text-right text-[12.5px] font-medium text-fg">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
