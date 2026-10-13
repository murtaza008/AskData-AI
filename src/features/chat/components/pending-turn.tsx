import type { PendingTurn as PendingTurnState } from "../hooks/use-agent-chat";
import { StepTrace } from "./step-trace";
import { UserQuestion } from "./user-question";

/** The question being answered right now, with its live step indicator. */
export function PendingTurn({ turn }: { turn: PendingTurnState }) {
  return (
    <article className="animate-rise space-y-4">
      <UserQuestion text={turn.question} />
      <StepTrace steps={turn.steps} live />
      <div className="space-y-2" aria-hidden>
        <div className="h-3 w-3/4 animate-pulse rounded-sm bg-muted" />
        <div className="h-3 w-1/2 animate-pulse rounded-sm bg-muted" />
      </div>
    </article>
  );
}
