"use client";

import { ArrowUpRight } from "lucide-react";
import { useAccount } from "@/lib/hooks/use-account";
import { DataSourceChip } from "./data-source-chip";
import { GettingStarted } from "./getting-started";

const GROUPS: { title: string; questions: string[] }[] = [
  {
    title: "Sales",
    questions: [
      "How has monthly revenue trended over the last 12 months?",
      "Break down revenue by region",
      "What is the average order value by sales channel?",
    ],
  },
  {
    title: "Products",
    questions: ["What were our top 5 products by revenue last month?", "Which product categories have the highest refund rate?"],
  },
  {
    title: "Customers",
    questions: ["How many customers ordered more than 3 times this year?", "Which cities have the most customers?"],
  },
  { title: "Marketing (uploaded CSV)", questions: ["How much did we spend on marketing last quarter?"] },
];

/** Before the first question: what the agent can see, and questions to start from. */
export function EmptyChat({ onAsk, disabled }: { onAsk: (question: string) => void; disabled: boolean }) {
  const { account } = useAccount();
  const usage = account?.usage;
  // Stagger position of each question across all groups.
  const offsets = GROUPS.map((_, g) => GROUPS.slice(0, g).reduce((sum, group) => sum + group.questions.length, 0));

  return (
    <div className="pt-4 sm:pt-10">
      <p className="eyebrow">Ask</p>
      <h1 className="mt-2 text-[30px] sm:text-[40px]">What do you want to know?</h1>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <DataSourceChip />
        {usage?.dailyLimit && (
          <span className="num text-[12.5px] text-fg-muted">
            {usage.questionsLast24h} of {usage.dailyLimit} demo questions used in the last 24 h
          </span>
        )}
      </div>

      <GettingStarted />

      <div className="mt-10 grid gap-x-8 gap-y-7 sm:grid-cols-2">
        {GROUPS.map((group, g) => (
          <section key={group.title} aria-labelledby={`suggest-group-${g}`}>
            <h2 id={`suggest-group-${g}`} className="eyebrow mb-2">
              {group.title}
            </h2>
            <ul className="divide-y border-y">
              {group.questions.map((question, q) => (
                <li key={question} className="stagger-item" style={{ ["--i" as string]: offsets[g] + q }}>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onAsk(question)}
                    className="group flex w-full items-center justify-between gap-4 py-2.5 text-left text-[14.5px] text-fg transition-colors hover:text-accent-text disabled:opacity-50"
                  >
                    {question}
                    <ArrowUpRight
                      aria-hidden
                      className="size-4 shrink-0 text-fg-subtle transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent-text"
                    />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
