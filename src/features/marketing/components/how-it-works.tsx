import type { ReactNode } from "react";
import { DataChart } from "@/components/charts/data-chart";
import { Reveal } from "@/components/motion/reveal";
import { SAMPLE_TREND } from "../sample-data";

function Step({ number, title, body, children }: { number: string; title: string; body: string; children: ReactNode }) {
  return (
    <Reveal className="group grid gap-4 py-8 md:grid-cols-[96px_1fr_300px] md:gap-8">
      <div className="num text-[40px] leading-none text-muted-foreground/60 transition-colors duration-300 group-hover:text-highlight">
        {number}
      </div>
      <div>
        <h3 className="text-[20px]">{title}</h3>
        <p className="mt-2 max-w-[44ch] text-[15px] text-muted-foreground">{body}</p>
      </div>
      <div className="min-w-0">{children}</div>
    </Reveal>
  );
}

export function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-4 border-t">
      <div className="mx-auto max-w-[1200px] px-4 py-20 sm:px-6">
        <div className="grid gap-8 md:grid-cols-[220px_1fr]">
          <h2 className="label-caps pt-2 font-sans">How it works</h2>
          <div className="divide-y border-y">
            <Step
              number="01"
              title="Ask in plain English"
              body="No query language, no dashboards to configure. Type the question the way you'd ask a colleague."
            >
              <div className="rounded-md border bg-card px-3 py-2 font-mono text-[13px]">
                Which product categories have the highest refund rate?
                <span aria-hidden className="caret ml-0.5 inline-block h-[1em] w-[7px] translate-y-[2px] bg-highlight" />
              </div>
            </Step>
            <Step
              number="02"
              title="It reads your schema and writes SQL"
              body="The agent inspects tables, columns and relationships, writes a query against your real structure, and repairs it if the database reports an error."
            >
              <pre className="overflow-x-auto rounded-md border bg-muted/60 px-3 py-2 font-mono text-[12px] leading-[1.6]">
                <span className="text-sql-keyword">SELECT</span> p.category, <span className="text-sql-fn">COUNT</span>(r.id){"\n"}
                <span className="text-sql-keyword">FROM</span> refunds r <span className="text-sql-keyword">JOIN</span> orders o …
              </pre>
            </Step>
            <Step
              number="03"
              title="You get the answer, chart, and query"
              body="A written finding with the key numbers, a chart that fits the data, and the exact SQL to audit. Pin it to a dashboard or export the rows."
            >
              <div className="rounded-md border bg-card p-2">
                <DataChart spec={SAMPLE_TREND.spec} rows={SAMPLE_TREND.rows} height={110} />
              </div>
            </Step>
          </div>
        </div>
      </div>
    </section>
  );
}
