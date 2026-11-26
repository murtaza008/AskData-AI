import { type ReactNode, ViewTransition } from "react";
import { cn } from "@/lib/utils";

/**
 * Wraps a page so route changes animate: the old page fades out and the new
 * one rises in (React <ViewTransition>; the CSS lives in globals.css).
 */
export function PageFrame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <ViewTransition enter="page-in" exit="page-out" default="none">
      <div className={cn("flex min-h-0 flex-1 flex-col", className)}>{children}</div>
    </ViewTransition>
  );
}

/** Standard page heading row: title, a one-line purpose, and optional actions. */
export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-x-6 gap-y-3", className)}>
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1 className="text-[26px] sm:text-[30px]">{title}</h1>
        {description && <p className="mt-1.5 max-w-[64ch] text-[14.5px] text-fg-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
