"use client";

import { Notice } from "@/components/ui/notice";
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

/** One completed exchange: the question, the agent's trace, and its answer. */
export function AnswerTurn({ turn, isLatest, onAsk, disabled }: AnswerTurnProps) {
  const { question, answer } = turn;
  const hasResult = answer.status === "answered" && answer.chart !== null && answer.sql !== null;

  return (
    <article className="animate-rise space-y-4">
      <UserQuestion text={question} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <StepTrace steps={answer.steps} durationMs={answer.durationMs} />
        <span className="label-caps">{modelLabel(answer.model)}</span>
      </div>

      {answer.status === "answered" ? (
        <InsightText text={answer.insight} />
      ) : (
        // The honest "I can't answer that from this data" path.
        <Notice tone="error" title="I couldn't answer that from this data">
          <InsightText text={answer.insight} className="text-[14px] leading-[1.6] text-muted-foreground" />
        </Notice>
      )}

      {hasResult && (
        <ResultPanel
          question={question}
          answer={{ ...answer, chart: answer.chart!, sql: answer.sql! }}
        />
      )}

      {isLatest && <FollowUps questions={answer.followUps} onAsk={onAsk} disabled={disabled} />}
    </article>
  );
}
