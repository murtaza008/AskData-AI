"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Reveal } from "../motion";
import { TiltShot } from "./tilt-shot";

const SHOTS = [
  {
    name: "answer",
    label: "An answer",
    caption: "One question answered: the finding, the chart, the rows, and the SQL behind them.",
    alt: "AskData showing an answer: a short finding, a bar chart of revenue by product, and a data table.",
  },
  {
    name: "dashboard",
    label: "Dashboard",
    caption: "Key metrics with the previous period, and pinned charts whose SQL re-runs on every load.",
    alt: "The AskData dashboard with key metrics and pinned charts.",
  },
  {
    name: "data",
    label: "Your data",
    caption: "The tables the agent can query, and CSV uploads typed and checked before they are added.",
    alt: "The AskData data page listing tables and uploaded CSV files.",
  },
] as const;

/** Real screenshots from the demo account (regenerated with `npm run screens`). */
export function ScreensSection() {
  const [active, setActive] = useState(0);
  const shot = SHOTS[active];

  return (
    <section id="screens" aria-labelledby="screens-title" className="scroll-mt-16 border-t bg-surface-2">
      <div className="mx-auto max-w-[1320px] px-4 py-20 sm:px-6 lg:py-28">
        <Reveal className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-[560px]">
            <p className="eyebrow">Screens</p>
            <h2 id="screens-title" className="mt-3 text-[30px] sm:text-[38px]">
              The app, as the demo account sees it.
            </h2>
          </div>
          <div role="radiogroup" aria-label="Choose a screen" className="inline-flex rounded-md border bg-surface p-1">
            {SHOTS.map((item, i) => (
              <button
                key={item.name}
                type="button"
                role="radio"
                aria-checked={active === i}
                data-press=""
                onClick={() => setActive(i)}
                className={cn(
                  "rounded-sm px-3 py-1.5 text-[13px] transition-colors",
                  active === i ? "bg-inverse text-inverse-fg" : "text-fg-muted hover:text-fg",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </Reveal>
        <Reveal className="mt-10">
          <TiltShot key={shot.name} name={shot.name} alt={shot.alt} />
          <p className="mt-4 text-[14px] text-fg-muted">{shot.caption}</p>
        </Reveal>
      </div>
    </section>
  );
}
