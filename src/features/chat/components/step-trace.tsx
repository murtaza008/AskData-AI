"use client";

import { Check, ChevronRight, RotateCcw, X } from "lucide-react";
import { useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import type { AgentStep } from "@/lib/agent/types";
import { formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";

function StepIcon({ step }: { step: AgentStep }) {
  if (step.status === "running") return <Spinner />;
  if (step.status === "error") return <X className="size-3.5 shrink-0 text-destructive" strokeWidth={2} />;
  if (step.kind === "fix") return <RotateCcw className="size-3.5 shrink-0 text-highlight" strokeWidth={2} />;
  return <Check className="size-3.5 shrink-0 text-success" strokeWidth={2} />;
}

function StepRow({ step }: { step: AgentStep }) {
  return (
    <li className="animate-rise">
      <div className="flex items-start gap-2.5">
        <span className="num w-12 shrink-0 pt-px text-[12px] text-muted-foreground">
          {(step.atMs / 1000).toFixed(2)}s
        </span>
        <span className="pt-[3px]">
          <StepIcon step={step} />
        </span>
        <span className={cn("min-w-0", step.status === "error" ? "text-destructive" : "text-foreground")}>
          {step.label}
        </span>
      </div>
      {step.detail && (
        <p className="ml-[82px] mt-0.5 break-words font-mono text-[12px] text-muted-foreground">{step.detail}</p>
      )}
    </li>
  );
}

type StepTraceProps = {
  steps: AgentStep[];
  /** While live, the trace is always open and ends with a "thinking" line. */
  live?: boolean;
  durationMs?: number;
};

/**
 * The agent's work log. Live: every step appears as it happens. Finished: a
 * one-line summary ("4 steps · 3.1s · self-corrected") that expands on click.
 */
export function StepTrace({ steps, live = false, durationMs }: StepTraceProps) {
  const [open, setOpen] = useState(false);
  const selfCorrected = steps.some((step) => step.kind === "fix" && step.status === "ok");
  const isWaitingOnModel = live && !steps.some((step) => step.status === "running");

  const list = (
    <ol className="space-y-1.5 border-l pl-4" aria-live={live ? "polite" : undefined}>
      {steps.map((step) => (
        <StepRow key={step.id} step={step} />
      ))}
      {isWaitingOnModel && (
        <li className="flex items-center gap-2.5 text-muted-foreground">
          <span className="w-12 shrink-0" />
          <Spinner />
          <span>{steps.length === 0 ? "Starting…" : "Thinking…"}</span>
        </li>
      )}
    </ol>
  );

  if (live) return <div className="text-[13px]">{list}</div>;
  if (steps.length === 0) return null;

  return (
    <div className="text-[13px]">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
      >
        <ChevronRight className={cn("size-3.5 transition-transform duration-150", open && "rotate-90")} strokeWidth={1.5} />
        <span className="num">
          {steps.length} {steps.length === 1 ? "step" : "steps"}
          {durationMs !== undefined && ` · ${formatDuration(durationMs)}`}
        </span>
        {selfCorrected && (
          <span className="ml-1 rounded-sm border px-1.5 text-[11px] text-highlight">self-corrected</span>
        )}
      </button>
      {open && <div className="ml-[7px] mt-2">{list}</div>}
    </div>
  );
}
