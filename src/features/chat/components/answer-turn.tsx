"use client";

import { Info } from "lucide-react";
import type { TurnDTO } from "@/lib/agent/types";
import { modelLabel } from "@/lib/models";
import { FollowUps } from "./follow-ups";
import { InsightText } from "./insight-text";
import { ResultPanel } from "./result-panel";
import { StepTrace } from "./step-trace";
import { UserQuestion } from "./user-question";

type AnswerTurnProps = {
  turn: TurnDTO;
  /** Follow-up suggestions are only actionable on the most recent answer. */
  isLatest: boolean;
  onAsk: (question: string) => void;
  disabled: boolean;
};

/** One exchange: the question cell, then the answer cell with its trace, finding and evidence. */
export function AnswerTurn({ turn, isLatest, onAsk, disabled }: AnswerTurnProps) {
  const { question, answer } = turn;
  const hasResult = answer.status === "answered" && answer.chart !== null && answer.sql !== null;

  return (
    <article className="animate-rise">
      <UserQuestion text={question} meta={`Answered by ${modelLabel(answer.model)}`} />
      <div className="ml-3 mt-4 space-y-4 border-l-2 border-accent/50 pl-6">
        <StepTrace steps={answer.steps} durationMs={answer.durationMs} />

        {answer.status === "answered" ? (
          <InsightText text={answer.insight} />
        ) : (
          // The honest "this data can't answer that" path: not an error, so not red.
          <div className="flex gap-3 rounded-md border bg-surface-2 px-4 py-3">
            <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-accent-text" />
            <div>
              <p className="text-[14px] font-medium text-fg">This data can&apos;t answer that</p>
              <InsightText text={answer.insight} className="mt-1 text-[14.5px] text-fg-muted" />
            </div>
          </div>
        )}

        {hasResult && <ResultPanel question={question} answer={{ ...answer, chart: answer.chart!, sql: answer.sql! }} />}

        {isLatest && <FollowUps questions={answer.followUps} onAsk={onAsk} disabled={disabled} />}
      </div>
    </article>
  );
}
