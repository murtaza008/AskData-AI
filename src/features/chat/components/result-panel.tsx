"use client";

import { useState } from "react";
import { DataChart } from "@/components/charts/data-chart";
import { MAX_PIE_SLICES } from "@/components/charts/chart-theme";
import { DataTable } from "@/components/data/data-table";
import { isPlottable } from "@/lib/agent/chart";
import type { AgentAnswer, ChartSpec, ChartType } from "@/lib/agent/types";
import { ChartTypeToggle } from "./chart-type-toggle";
import { ResultActions } from "./result-actions";
import { SqlDisclosure } from "./sql-disclosure";

type ResultPanelProps = {
  question: string;
  answer: AgentAnswer & { chart: ChartSpec; sql: string };
};

/** The evidence behind an answer: chart, data table, and the SQL that produced them. */
export function ResultPanel({ question, answer }: ResultPanelProps) {
  // Start from the agent's choice; the user may switch chart type.
  const [type, setType] = useState<ChartType>(answer.chart.type);
  const spec: ChartSpec = { ...answer.chart, type };
  const plottable = isPlottable(answer.chart, answer.rows);

  return (
    <section className="animate-rise rounded-lg border bg-card">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5">
        <h3 className="min-w-0 text-[15px]">{answer.chart.title}</h3>
        <div className="flex items-center gap-1">
          {plottable && (
            <span className="mr-1">
              <ChartTypeToggle value={type} onChange={setType} allowPie={answer.rows.length <= MAX_PIE_SLICES} />
            </span>
          )}
          <ResultActions question={question} sql={answer.sql} chart={spec} columns={answer.columns} rows={answer.rows} />
        </div>
      </header>

      {plottable && type !== "table" && (
        <div className="border-b px-4 py-4">
          <DataChart spec={spec} rows={answer.rows} />
        </div>
      )}

      <div className="px-4 py-3">
        <DataTable columns={answer.columns} rows={answer.rows} truncated={answer.truncated} />
      </div>

      <SqlDisclosure sql={answer.sql} />
    </section>
  );
}
