"use client";

import { BarChart3, LineChart, PieChart, Table2 } from "lucide-react";
import type { ChartType } from "@/lib/agent/types";
import { cn } from "@/lib/utils";

const OPTIONS: { type: ChartType; label: string; icon: typeof BarChart3 }[] = [
  { type: "bar", label: "Bar chart", icon: BarChart3 },
  { type: "line", label: "Line chart", icon: LineChart },
  { type: "pie", label: "Pie chart", icon: PieChart },
  { type: "table", label: "Table only", icon: Table2 },
];

type ChartTypeToggleProps = {
  value: ChartType;
  onChange: (type: ChartType) => void;
  /** Pie is only offered when the result has few enough rows to read. */
  allowPie: boolean;
};

/** Lets the user override the chart type the agent picked. */
export function ChartTypeToggle({ value, onChange, allowPie }: ChartTypeToggleProps) {
  return (
    <div className="flex rounded-md border" role="group" aria-label="Chart type">
      {OPTIONS.filter((option) => allowPie || option.type !== "pie").map(({ type, label, icon: Icon }) => (
        <button
          key={type}
          type="button"
          aria-label={label}
          title={label}
          aria-pressed={value === type}
          onClick={() => onChange(type)}
          className={cn(
            "p-1.5 first:rounded-l-[3px] last:rounded-r-[3px]",
            value === type ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Icon className="size-4" strokeWidth={1.5} />
        </button>
      ))}
    </div>
  );
}
