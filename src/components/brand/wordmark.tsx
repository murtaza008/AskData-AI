import Link from "next/link";

export function Wordmark({ href = "/" }: { href?: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 font-display text-[20px] font-semibold tracking-[-0.01em] text-foreground"
    >
      <span aria-hidden className="block size-2.5 bg-highlight" />
      AskData
    </Link>
  );
}
