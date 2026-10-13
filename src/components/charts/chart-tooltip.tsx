import type { ValueFormat } from "@/lib/agent/types";
import { formatValue } from "@/lib/format";
import type { ChartDatum } from "./chart-theme";

type ChartTooltipProps = {
  format: ValueFormat;
  /** Name of the measure, e.g. "Revenue". */
  measure: string;
  /** Sum of all values, when a share-of-total line should be shown (pie). */
  total?: number;
  // Injected by Recharts:
  active?: boolean;
  payload?: readonly { payload?: ChartDatum }[];
};

/** Hover card: the category in full, the measure name, and the exact value. */
export function ChartTooltip({ format, measure, total, active, payload }: ChartTooltipProps) {
  const datum = payload?.[0]?.payload;
  if (!active || !datum) return null;

  return (
    <div className="max-w-[260px] rounded-md border bg-popover px-3 py-2 text-[13px] shadow-pop">
      <div className="font-medium text-foreground">{datum.label}</div>
      <div className="mt-0.5 flex items-baseline justify-between gap-4">
        <span className="text-muted-foreground">{measure}</span>
        <span className="num text-foreground">{formatValue(datum.value, format)}</span>
      </div>
      {total !== undefined && total > 0 && (
        <div className="flex items-baseline justify-between gap-4">
          <span className="text-muted-foreground">Share</span>
          <span className="num text-foreground">{((datum.value / total) * 100).toFixed(1)}%</span>
        </div>
      )}
    </div>
  );
}
