"use client";

import { BarChart3, LineChart, PieChart } from "lucide-react";
import { useState } from "react";
import { MAX_PIE_SLICES } from "@/components/charts/chart-theme";
import { DataChart } from "@/components/charts/data-chart";
import { DataTable } from "@/components/data/data-table";
import { isPlottable } from "@/lib/agent/chart";
import type { AgentAnswer, ChartSpec, ChartType } from "@/lib/agent/types";
import { cn } from "@/lib/utils";
import { ResultActions } from "./result-actions";
import { SqlDisclosure } from "./sql-disclosure";

const SHAPES: { type: Exclude<ChartType, "table">; label: string; icon: typeof BarChart3 }[] = [
  { type: "bar", label: "Bar chart", icon: BarChart3 },
  { type: "line", label: "Line chart", icon: LineChart },
  { type: "pie", label: "Pie chart", icon: PieChart },
];

type ResultPanelProps = {
  question: string;
  answer: AgentAnswer & { chart: ChartSpec; sql: string };
};

/** The evidence behind an answer: chart or table of the same rows, actions, and the SQL. */
export function ResultPanel({ question, answer }: ResultPanelProps) {
  const plottable = isPlottable(answer.chart, answer.rows) && answer.chart.type !== "table";
  const [view, setView] = useState<"chart" | "table">(plottable ? "chart" : "table");
  // Start from the agent's choice; the user may switch the chart's shape.
  const [shape, setShape] = useState<Exclude<ChartType, "table">>(
    answer.chart.type === "table" ? "bar" : answer.chart.type,
  );
  const spec: ChartSpec = { ...answer.chart, type: shape };
  const shapes = SHAPES.filter((s) => s.type !== "pie" || answer.rows.length <= MAX_PIE_SLICES);

  return (
    <section aria-label={`Result: ${answer.chart.title}`} className="panel min-w-0 overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5">
        <h3 className="min-w-0 text-[15px]">{answer.chart.title}</h3>
        <div className="flex flex-wrap items-center gap-1">
          {plottable && (
            <div role="radiogroup" aria-label="Show as" className="mr-1 inline-flex rounded-sm border bg-sunken p-0.5">
              {(["chart", "table"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={view === option}
                  data-press=""
                  onClick={() => setView(option)}
                  className={cn(
                    "rounded-[4px] px-2.5 py-0.5 text-[12.5px] capitalize transition-colors",
                    view === option ? "bg-surface text-fg shadow-[var(--shadow-xs)]" : "text-fg-muted hover:text-fg",
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
          )}
          <ResultActions question={question} sql={answer.sql} chart={spec} columns={answer.columns} rows={answer.rows} />
        </div>
      </header>

      {plottable && view === "chart" ? (
        <div className="px-4 pb-4 pt-3">
          <div role="radiogroup" aria-label="Chart type" className="mb-3 flex gap-1">
            {shapes.map(({ type, label, icon: Icon }) => (
              <button
                key={type}
                type="button"
                role="radio"
                aria-checked={shape === type}
                aria-label={label}
                title={label}
                data-press=""
                onClick={() => setShape(type)}
                className={cn(
                  "grid size-7 place-items-center rounded-sm border transition-colors",
                  shape === type ? "border-accent bg-accent-soft text-accent-text" : "border-transparent text-fg-subtle hover:text-fg",
                )}
              >
                <Icon aria-hidden className="size-4" />
              </button>
            ))}
          </div>
          <DataChart key={shape} spec={spec} rows={answer.rows} />
        </div>
      ) : (
        <div className="px-4 py-3">
          <DataTable columns={answer.columns} rows={answer.rows} truncated={answer.truncated} />
        </div>
      )}

      <SqlDisclosure sql={answer.sql} />
    </section>
  );
}
