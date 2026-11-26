import Link from "next/link";
import { cn } from "@/lib/utils";

/** The mark: a 2×2 result grid with one highlighted cell (the answer). */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className={cn("size-5 shrink-0", className)}>
      <rect x="1" y="1" width="18" height="18" rx="4.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M10 1.8v16.4M1.8 10h16.4" stroke="currentColor" strokeWidth="1.4" />
      <rect x="10.8" y="10.8" width="6.6" height="6.6" rx="2" fill="var(--accent)" />
    </svg>
  );
}

export function Wordmark({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link
      href={href}
      aria-label="AskData home"
      className={cn(
        "inline-flex items-center gap-2 rounded-xs font-display text-[18px] font-semibold tracking-[-0.02em] text-fg [font-stretch:115%]",
        className,
      )}
    >
      <BrandMark />
      AskData
    </Link>
  );
}
