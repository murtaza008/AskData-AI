import { ArrowDown, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Fragment } from "react";
import { buttonClass } from "@/components/ui/button";
import { formatInt, LANDING, totalLines, totalOrders } from "./data";

const HEADLINE = "Ask your database a question. Get the answer, the chart and the SQL.";

/** "2026-10-27" → "27 Oct 2026", without Date (identical on server and client). */
function readableDate(iso: string) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${months[m - 1]} ${y}`;
}

/**
 * Centered hero. The headline is server-rendered and paints first; each word
 * rises in with CSS only. Spaces sit outside the inline-block word spans so
 * they never collapse.
 */
export function Hero() {
  const words = HEADLINE.split(" ");
  const customers = LANDING.tables.find((t) => t.name === "customers")?.rows ?? 0;

  return (
    <section className="relative overflow-hidden border-b">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(var(--border)_1px,transparent_1px)] bg-[size:100%_44px] opacity-40 [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" />
      <div className="relative mx-auto flex max-w-[1080px] flex-col items-center px-4 pb-16 pt-16 text-center sm:px-6 sm:pt-24 lg:pb-24">
        <p className="eyebrow animate-rise inline-flex items-center gap-2 rounded-full border bg-surface px-3 py-1">
          <span className="size-1.5 rounded-full bg-accent" />
          AI data analyst · read-only by design
        </p>
        <h1 className="mt-6 max-w-[17ch] text-[40px] leading-[1.02] sm:text-[60px] lg:text-[74px]">
          {words.map((word, i) => (
            <Fragment key={i}>
              <span className="hero-word" style={{ ["--i" as string]: i }}>
                {word}
              </span>
              {i < words.length - 1 && " "}
            </Fragment>
          ))}
        </h1>
        <p className="animate-rise mt-6 max-w-[54ch] text-[17px] text-fg-muted [animation-delay:420ms] sm:text-[18px]">
          AskData writes the query, runs it against Postgres with read-only access, and shows its work, so you can
          check every number before you use it.
        </p>
        <div className="animate-rise mt-9 flex flex-wrap items-center justify-center gap-3 [animation-delay:520ms]">
          <Link href="/login?demo=1" data-press="" className={buttonClass("primary", "lg", "group")}>
            Try the live demo
            <ArrowRight aria-hidden className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
          <a href="#how" data-press="" className={buttonClass("outline", "lg", "group")}>
            See how it works
            <ArrowDown aria-hidden className="size-4 transition-transform duration-200 group-hover:translate-y-0.5" />
          </a>
        </div>
        <p className="animate-rise mt-4 text-[13px] text-fg-muted [animation-delay:600ms]">
          No sign-up. The demo account is filled in for you.
        </p>

        <dl className="animate-rise mt-14 grid w-full max-w-[860px] grid-cols-2 overflow-hidden rounded-lg border bg-surface text-left [animation-delay:680ms] sm:grid-cols-4">
          {[
            { label: "Demo store tables", value: String(LANDING.tables.length) },
            { label: "Customers", value: formatInt(customers) },
            { label: "Orders", value: formatInt(totalOrders) },
            { label: "Order lines", value: formatInt(totalLines) },
          ].map((stat, i) => (
            <div key={stat.label} className={`px-4 py-3.5 ${i % 2 === 1 ? "border-l" : ""} ${i >= 2 ? "max-sm:border-t sm:border-l" : ""}`}>
              <dt className="eyebrow">{stat.label}</dt>
              <dd className="num mt-1 text-[22px] font-medium text-fg">{stat.value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-[12.5px] text-fg-muted">
          The live demo queries this dataset. Latest order: {readableDate(LANDING.latestOrderDate)}.
        </p>
      </div>
    </section>
  );
}
