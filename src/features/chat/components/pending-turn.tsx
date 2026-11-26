import type { PendingTurn as PendingTurnState } from "../hooks/use-agent-chat";
import { StepTrace } from "./step-trace";
import { UserQuestion } from "./user-question";

/** The question being answered right now, with its live step trace. */
export function PendingTurn({ turn }: { turn: PendingTurnState }) {
  return (
    <article className="animate-rise" aria-busy="true">
      <UserQuestion text={turn.question} meta="Working on it…" />
      <div className="ml-3 mt-4 space-y-4 border-l-2 border-accent/30 pl-6">
        <StepTrace steps={turn.steps} live />
        <div className="space-y-2" aria-hidden>
          <div className="h-3 w-3/4 animate-pulse rounded-xs bg-sunken" />
          <div className="h-3 w-1/2 animate-pulse rounded-xs bg-sunken" />
          <div className="mt-4 h-40 animate-pulse rounded-lg bg-sunken" />
        </div>
      </div>
    </article>
  );
}
