import { cn } from "@/lib/utils";

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        "inline-block size-3.5 shrink-0 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-highlight",
        className,
      )}
    />
  );
}
