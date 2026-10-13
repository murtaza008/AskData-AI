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

/** Inline message box for errors and empty/explanatory states. */
export function Notice({ tone = "info", title, children, action, className }: NoticeProps) {
  const Icon = tone === "error" ? AlertTriangle : Info;
  return (
    <div
      role={tone === "error" ? "alert" : undefined}
      className={cn(
        "flex gap-3 rounded-lg border border-l-2 bg-card p-4",
        tone === "error" ? "border-l-destructive" : "border-l-highlight",
        className,
      )}
    >
      <Icon
        className={cn("mt-0.5 size-4 shrink-0", tone === "error" ? "text-destructive" : "text-highlight")}
        strokeWidth={1.5}
      />
      <div className="min-w-0 flex-1 text-[15px]">
        {title && <p className="font-medium">{title}</p>}
        <div className={cn(title && "mt-1 text-[14px] text-muted-foreground")}>{children}</div>
        {action && <div className="mt-3">{action}</div>}
      </div>
    </div>
  );
}
