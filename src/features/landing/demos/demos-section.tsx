import type { ReactNode } from "react";
import { Reveal } from "../motion";
import { ChartDemo } from "./chart-demo";
import { InferDemo } from "./infer-demo";
import { ValidatorDemo } from "./validator-demo";

function DemoCard({
  title,
  body,
  source,
  children,
  className,
}: {
  title: string;
  body: string;
  source: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <article className={`panel flex min-w-0 flex-col p-5 sm:p-6 ${className ?? ""}`}>
      <header className="mb-5">
        <h3 className="text-[19px]">{title}</h3>
        <p className="mt-1.5 text-[14px] text-fg-muted">{body}</p>
        <p className="mt-2 font-mono text-[11.5px] text-fg-subtle">runs {source}</p>
      </header>
      <div className="min-w-0 flex-1">{children}</div>
    </article>
  );
}

/** Three demos that run the app's own modules in the browser, on demo-store data. */
export function DemosSection() {
  return (
    <section id="demos" aria-labelledby="demos-title" className="scroll-mt-16 border-t bg-surface-2">
      <div className="mx-auto max-w-[1320px] px-4 py-20 sm:px-6 lg:py-28">
        <Reveal className="max-w-[640px]">
          <p className="eyebrow">Try the code</p>
          <h2 id="demos-title" className="mt-3 text-[30px] sm:text-[38px]">
            The checks run right here, in your browser.
          </h2>
          <p className="mt-3 text-[15.5px] text-fg-muted">
            These are not recordings. Each box runs the same module the server uses, on the demo store&apos;s data.
          </p>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <Reveal className="lg:row-span-2">
            <DemoCard
              className="h-full"
              title="Try to get a bad query past the validator"
              body="Every query the model writes is parsed with a real PostgreSQL grammar and checked before it runs. Pick an attack, or write your own."
              source="src/lib/sql/validate.ts"
            >
              <ValidatorDemo />
            </DemoCard>
          </Reveal>
          <Reveal delay={0.06}>
            <DemoCard
              title="Column types from a CSV"
              body="Uploads are typed the same way in the preview and on the server."
              source="src/lib/uploads/infer.ts"
            >
              <InferDemo />
            </DemoCard>
          </Reveal>
          <Reveal delay={0.12}>
            <DemoCard
              title="Chart specs are checked, not trusted"
              body="If the model proposes a chart the data can't support, the app repairs it."
              source="src/lib/agent/chart.ts"
            >
              <ChartDemo />
            </DemoCard>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
