import { CornerDownRight } from "lucide-react";

type FollowUpsProps = {
  questions: string[];
  onAsk: (question: string) => void;
  disabled?: boolean;
};

/** Follow-up questions the agent suggested for the latest answer. */
export function FollowUps({ questions, onAsk, disabled }: FollowUpsProps) {
  if (questions.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {questions.map((question) => (
        <button
          key={question}
          type="button"
          disabled={disabled}
          onClick={() => onAsk(question)}
          className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-left text-[13px] text-muted-foreground transition-colors hover:border-primary hover:text-foreground disabled:opacity-50"
        >
          <CornerDownRight className="size-3.5 shrink-0" strokeWidth={1.5} />
          {question}
        </button>
      ))}
    </div>
  );
}
