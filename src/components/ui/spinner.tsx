import { cn } from "@/lib/utils";

/** Decorative activity indicator; the surrounding text says what is happening. */
export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block size-3.5 shrink-0 animate-spin rounded-full border-2 border-fg-subtle/30 border-t-accent",
        className,
      )}
    />
  );
}
