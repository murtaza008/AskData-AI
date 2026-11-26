import { AlertTriangle, Info } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type NoticeProps = {
  tone?: "error" | "info";
  title?: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
};

/** Inline message box for errors and explanatory states. */
export function Notice({ tone = "info", title, children, action, className }: NoticeProps) {
  const Icon = tone === "error" ? AlertTriangle : Info;
  return (
    <div
      role={tone === "error" ? "alert" : undefined}
      className={cn(
        "flex gap-3 rounded-md border p-4",
        tone === "error" ? "border-danger/35 bg-danger-soft" : "border-border bg-surface-2",
        className,
      )}
    >
      <Icon
        aria-hidden
        className={cn("mt-0.5 size-4 shrink-0", tone === "error" ? "text-danger-text" : "text-accent-text")}
        strokeWidth={1.75}
      />
      <div className="min-w-0 flex-1 text-[14px]">
        {title && <p className="font-medium text-fg">{title}</p>}
        <div className={cn("text-fg-muted", title && "mt-1")}>{children}</div>
        {action && <div className="mt-3">{action}</div>}
      </div>
    </div>
  );
}
