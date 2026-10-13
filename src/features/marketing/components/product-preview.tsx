"use client";

import { Check, ChevronRight, RotateCcw, X } from "lucide-react";
import { motion } from "motion/react";
import { DataChart } from "@/components/charts/data-chart";
import { ease } from "@/components/motion/reveal";
import { SAMPLE_PRODUCTS, SAMPLE_QUESTION } from "../sample-data";

const STEPS = [
  { icon: Check, tone: "text-success", label: "Read schema · 5 tables" },
  { icon: X, tone: "text-destructive", label: "Query failed: column \"qty\" does not exist" },
  { icon: RotateCcw, tone: "text-highlight", label: "Fixed query · returned 5 rows" },
];

/** Fade/rise-in for one block of the preview, in sequence. */
function appear(order: number) {
  return {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: { delay: 0.45 + order * 0.28, duration: 0.4, ease },
  };
}

/**
 * A static illustration of one answer for the landing page hero. Its parts
 * appear in the order the real agent produces them: question, steps
 * (including a self-corrected query), insight, chart, SQL.
 */
export function ProductPreview() {
  return (
    <div className="rounded-lg border bg-card shadow-pop">
      <div className="flex items-center justify-between border-b px-4 py-2">
        <span className="num text-[12px] text-muted-foreground">Demo store · 5 tables</span>
        <span className="label-caps">Sample answer</span>
      </div>
      <div className="space-y-4 p-4 sm:p-5">
        <motion.p
          {...appear(0)}
          className="ml-auto w-fit max-w-[90%] rounded-md border bg-background px-3 py-1.5 text-[14px]"
        >
          {SAMPLE_QUESTION}
        </motion.p>

        <ul className="space-y-1 border-l pl-4 text-[13px]">
          {STEPS.map(({ icon: Icon, tone, label }, index) => (
            <motion.li key={label} {...appear(1 + index)} className="flex items-center gap-2.5">
              <Icon className={`size-3.5 shrink-0 ${tone}`} strokeWidth={2} />
              <span className={tone === "text-destructive" ? "text-destructive" : undefined}>{label}</span>
            </motion.li>
          ))}
        </ul>

        <motion.p {...appear(4)} className="text-[15px] leading-[1.65]">
          Merino Crew Sweater led last month with <span className="key-num">$14,190</span> in revenue, about{" "}
          <span className="key-num">15%</span> ahead of the Linen Overshirt.
        </motion.p>

        <motion.div {...appear(5)}>
          <div className="label-caps mb-2">Revenue by product</div>
          <DataChart spec={SAMPLE_PRODUCTS.spec} rows={SAMPLE_PRODUCTS.rows} height={200} />
        </motion.div>

        <motion.div
          {...appear(6)}
          className="flex items-center gap-2 overflow-hidden rounded-md border bg-muted/60 px-3 py-2 text-[13px]"
        >
          <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" strokeWidth={1.5} />
          <code className="truncate font-mono text-muted-foreground">
            <span className="text-sql-keyword">SELECT</span> p.name, <span className="text-sql-fn">SUM</span>
            (oi.quantity * oi.unit_price) … <span className="text-sql-keyword">LIMIT</span>{" "}
            <span className="text-sql-number">5</span>
          </code>
          <span className="ml-auto shrink-0 text-[12px] text-muted-foreground">Show SQL</span>
        </motion.div>
      </div>
    </div>
  );
}
