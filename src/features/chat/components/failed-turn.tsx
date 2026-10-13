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

/** A question that failed for a reason outside the data — offer a retry. */
export function FailedTurn({ turn, onRetry, onDismiss }: FailedTurnProps) {
  return (
    <article className="space-y-4">
      <UserQuestion text={turn.question} />
      <Notice
        tone="error"
        title="That didn't go through"
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onRetry}>
              <RotateCcw className="size-3.5" strokeWidth={1.5} />
              Try again
            </Button>
            <Button variant="ghost" size="sm" onClick={onDismiss}>
              Dismiss
            </Button>
          </div>
        }
      >
        {turn.message}
      </Notice>
    </article>
  );
}
