import { cn } from "@/lib/utils";
import { CopyButton } from "./copy-button";
import { highlightSql } from "./sql-highlight";

/** Read-only SQL display with syntax colouring and a copy button. */
export function SqlBlock({ sql, compact, className }: { sql: string; compact?: boolean; className?: string }) {
  return (
    <div className={cn("relative rounded-md border bg-muted/60", className)}>
      <CopyButton text={sql} className="absolute right-2 top-2" />
      <pre
        className={cn(
          "overflow-x-auto whitespace-pre font-mono leading-[1.65] text-foreground",
          compact ? "p-3 pr-20 text-[12px]" : "p-4 pr-24 text-[13px]",
        )}
      >
        <code>{highlightSql(sql)}</code>
      </pre>
    </div>
  );
}
