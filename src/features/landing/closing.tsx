import { ArrowRight, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";
import { SUGGESTED_QUESTIONS } from "@/lib/demo";
import { SITE } from "@/lib/site";
import { Reveal } from "./motion";

/** Example questions. Each opens the demo and asks it straight away (after signing in). */
export function QuestionsSection() {
  return (
    <section id="questions" aria-labelledby="questions-title" className="scroll-mt-16 border-t">
      <div className="mx-auto max-w-[1320px] px-4 py-20 sm:px-6 lg:py-24">
        <Reveal>
          <p className="eyebrow">Questions to try</p>
          <h2 id="questions-title" className="mt-3 text-[30px] sm:text-[38px]">
            Ask one of these in the demo.
          </h2>
        </Reveal>
        <ol className="mt-10 grid grid-cols-1 border-t sm:grid-cols-2">
          {SUGGESTED_QUESTIONS.map((question, i) => (
            <li key={question} className="border-b sm:odd:border-r">
              <Link
                href={`/app?q=${encodeURIComponent(question)}`}
                prefetch={false}
                className="group flex items-center gap-4 px-1 py-4 text-[15px] text-fg transition-colors hover:text-accent-text sm:px-5"
              >
                <span className="num w-6 shrink-0 text-[12px] text-fg-subtle">{String(i + 1).padStart(2, "0")}</span>
                <span className="min-w-0 flex-1">{question}</span>
                <ArrowUpRight
                  aria-hidden
                  className="size-4 shrink-0 text-fg-subtle transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent-text"
                />
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function ClosingCta() {
  return (
    <section className="border-t bg-inverse text-inverse-fg">
      <div className="mx-auto flex max-w-[1320px] flex-col items-start gap-6 px-4 py-16 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="max-w-[24ch] text-[28px] sm:text-[34px]">Ask it something about a real database.</h2>
          <p className="mt-2 text-[15px] text-inverse-muted">The demo account is ready. Nothing to install, no sign-up.</p>
        </div>
        <Link
          href="/login?demo=1"
          data-press=""
          className="group inline-flex h-11 items-center gap-2 rounded-sm bg-inverse-fg px-5 text-[15px] font-medium text-inverse transition-opacity hover:opacity-90"
        >
          Open the demo
          <ArrowRight aria-hidden className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
        </Link>
      </div>
    </section>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-between gap-4 px-4 py-8 text-[13px] text-fg-muted sm:px-6">
        <Wordmark />
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <Link href="/signup" className="underline-offset-2 hover:text-fg hover:underline">
            Create an account
          </Link>
          <a href={SITE.githubUrl} target="_blank" rel="noreferrer" className="underline-offset-2 hover:text-fg hover:underline">
            Source code
          </a>
          <span>
            Built by{" "}
            <a href={SITE.authorUrl} target="_blank" rel="noreferrer" className="font-medium text-fg underline underline-offset-2">
              {SITE.author}
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}

