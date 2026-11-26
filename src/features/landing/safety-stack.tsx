import { Reveal } from "./motion";

/** The five safety layers, each with where it lives in the code. All true as implemented. */
const LAYERS = [
  {
    title: "A separate read-only database role",
    body: "Model-written SQL never runs on the app's own connection. It runs as a role with SELECT on the analytics tables and nothing else, so it cannot write and cannot see user accounts.",
    where: "sql/01-readonly-role.sql",
  },
  {
    title: "Every query is parsed before it runs",
    body: "One SELECT only, known tables only, no system catalogs, no dangerous functions. Anything else is rejected without touching the database.",
    where: "src/lib/sql/validate.ts",
  },
  {
    title: "A 5-second statement timeout",
    body: "Postgres cancels any query that runs too long, so one bad question can't tie up the database.",
    where: "src/server/sql/execute.ts",
  },
  {
    title: "A 500-row cap, whatever the model wrote",
    body: "Each query is wrapped in an outer LIMIT, and the extra row tells the UI when a result was cut short.",
    where: "src/lib/sql/validate.ts · withRowLimit",
  },
  {
    title: "A read-only transaction that is always rolled back",
    body: "Queries run inside BEGIN TRANSACTION READ ONLY with the search path pinned to the analytics schema.",
    where: "src/server/sql/execute.ts",
  },
];

/** Layers drawn as a stack: each one sits on the one below it, and each works on its own. */
export function SafetyStack() {
  return (
    <section id="safety" aria-labelledby="safety-title" className="scroll-mt-16 border-t">
      <div className="mx-auto grid max-w-[1320px] gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:py-28">
        <Reveal className="lg:sticky lg:top-24 lg:self-start">
          <p className="eyebrow">Safety</p>
          <h2 id="safety-title" className="mt-3 text-[30px] sm:text-[38px]">
            Five layers between the model and your data.
          </h2>
          <p className="mt-3 max-w-[44ch] text-[15.5px] text-fg-muted">
            Letting a language model write SQL is only acceptable if it can&apos;t do damage. Each layer works on its
            own, so if one fails, the database is still protected.
          </p>
        </Reveal>

        <ol className="relative">
          {LAYERS.map((layer, i) => (
            <li key={layer.title} className="relative" style={{ zIndex: LAYERS.length - i }}>
              <Reveal delay={i * 0.05}>
                <div
                  className="panel lift relative grid gap-x-5 gap-y-1 px-5 py-5 sm:grid-cols-[56px_minmax(0,1fr)] sm:px-6"
                  style={{ marginLeft: `min(${i * 18}px, ${i * 3}vw)`, marginTop: i === 0 ? 0 : -6 }}
                >
                  <span className="num text-[13px] text-accent-text sm:row-span-3 sm:pt-1">
                    L{String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="text-[17px]">{layer.title}</h3>
                  <p className="text-[14.5px] text-fg-muted">{layer.body}</p>
                  <p className="mt-1 font-mono text-[11.5px] text-fg-subtle">{layer.where}</p>
                </div>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
