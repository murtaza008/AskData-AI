import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import type { FailedTurn as FailedTurnState } from "../hooks/use-agent-chat";
import { UserQuestion } from "./user-question";

type FailedTurnProps = {
  turn: FailedTurnState;
  onRetry: () => void;
  onDismiss: () => void;
};

/** A question that failed for a reason outside the data. The real reason is shown, with a retry. */
export function FailedTurn({ turn, onRetry, onDismiss }: FailedTurnProps) {
  const stopped = turn.message === "Stopped.";
  return (
    <article className="animate-rise">
      <UserQuestion text={turn.question} meta={stopped ? "Stopped" : "Not answered"} />
      <div className="ml-3 mt-4 border-l-2 border-danger/40 pl-6">
        <Notice
          tone={stopped ? "info" : "error"}
          title={stopped ? "You stopped this question" : "That didn't go through"}
          action={
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onRetry}>
                <RotateCcw aria-hidden className="size-3.5" />
                Ask again
              </Button>
              <Button variant="ghost" size="sm" onClick={onDismiss}>
                Dismiss
              </Button>
            </div>
          }
        >
          {stopped ? "Nothing was saved. Ask it again whenever you like." : turn.message}
        </Notice>
      </div>
    </article>
  );
}
