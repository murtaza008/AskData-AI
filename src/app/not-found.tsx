import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";
import { buttonClass } from "@/components/ui/button";

/** 404, told the way the app tells everything: as a query and its result. */
export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b bg-surface">
        <div className="mx-auto flex h-14 max-w-[1120px] items-center px-4 sm:px-6">
          <Wordmark />
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-[560px]">
          <p className="eyebrow">Error 404</p>
          <h1 className="mt-3 text-[34px] sm:text-[42px]">This page doesn&apos;t exist.</h1>
          <div className="panel mt-6 overflow-hidden">
            <pre tabIndex={0} role="region" aria-label="Lookup query" className="overflow-x-auto bg-sunken px-4 py-3 font-mono text-[13px] text-fg">
              <span className="text-sql-keyword">SELECT</span> * <span className="text-sql-keyword">FROM</span> pages{" "}
              <span className="text-sql-keyword">WHERE</span> path = <span className="text-sql-string">&apos;this one&apos;</span>;
            </pre>
            <p className="num border-t px-4 py-2.5 text-[12.5px] text-fg-muted">0 rows · the link may be old, or the page has moved</p>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/" className={buttonClass("primary", "md")}>
              Go to the home page
            </Link>
            <Link href="/app" className={buttonClass("outline", "md")}>
              Ask a question
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
