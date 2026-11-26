"use client";

import { ArrowLeftRight, Check, ChevronRight, RotateCcw, X } from "lucide-react";
import { useId, useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import type { AgentStep } from "@/lib/agent/types";
import { formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";

function StepIcon({ step }: { step: AgentStep }) {
  if (step.status === "running") return <Spinner />;
  if (step.status === "error") return <X aria-hidden className="size-3.5 shrink-0 text-danger-text" strokeWidth={2.25} />;
  if (step.kind === "model") return <ArrowLeftRight aria-hidden className="size-3.5 shrink-0 text-accent-text" strokeWidth={2} />;
  if (step.kind === "fix") return <RotateCcw aria-hidden className="size-3.5 shrink-0 text-accent-text" strokeWidth={2} />;
  return <Check aria-hidden className="size-3.5 shrink-0 text-success-text" strokeWidth={2.25} />;
}

function StepRow({ step }: { step: AgentStep }) {
  return (
    <li className="animate-rise">
      <div className="flex items-start gap-2.5">
        <span className="num w-11 shrink-0 pt-px text-right text-[11.5px] text-fg-subtle">{(step.atMs / 1000).toFixed(1)}s</span>
        <span className="pt-[3px]">
          <StepIcon step={step} />
        </span>
        <span className={cn("min-w-0", step.status === "error" ? "text-danger-text" : "text-fg")}>{step.label}</span>
      </div>
      {step.detail && <p className="ml-[76px] mt-0.5 break-words font-mono text-[11.5px] text-fg-muted">{step.detail}</p>}
      {step.sql && step.status === "error" && (
        <pre className="ml-[76px] mt-1 overflow-x-auto rounded-xs bg-sunken px-2 py-1 font-mono text-[11px] text-fg-muted">{step.sql}</pre>
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
 * The agent's work log. Live: every step appears as it happens (announced
 * politely to screen readers). Finished: a one-line summary that expands.
 */
export function StepTrace({ steps, live = false, durationMs }: StepTraceProps) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const selfCorrected = steps.some((step) => step.kind === "fix" && step.status === "ok");
  const switched = steps.some((step) => step.kind === "model");
  const queries = steps.filter((step) => step.kind === "query" || step.kind === "fix").length;
  const isWaitingOnModel = live && !steps.some((step) => step.status === "running");

  const list = (
    <ol id={id} className="space-y-1.5 border-l pl-3" aria-live={live ? "polite" : undefined}>
      {steps.map((step) => (
        <StepRow key={step.id} step={step} />
      ))}
      {isWaitingOnModel && (
        <li className="flex items-center gap-2.5 text-fg-muted">
          <span className="w-11 shrink-0" />
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
        aria-controls={open ? id : undefined}
        className="inline-flex flex-wrap items-center gap-1.5 rounded-xs text-fg-muted hover:text-fg"
      >
        <ChevronRight aria-hidden className={cn("size-3.5 transition-transform duration-200", open && "rotate-90")} />
        <span className="num">
          {queries} {queries === 1 ? "query" : "queries"}
          {durationMs !== undefined && ` · ${formatDuration(durationMs)}`}
        </span>
        {selfCorrected && <span className="rounded-full bg-accent-soft px-2 text-[11px] text-accent-text">self-corrected</span>}
        {switched && <span className="rounded-full bg-sunken px-2 text-[11px] text-fg-muted">fallback model</span>}
        <span className="sr-only">{open ? "Hide the steps" : "Show the steps"}</span>
      </button>
      {open && <div className="mt-2">{list}</div>}
    </div>
  );
}
