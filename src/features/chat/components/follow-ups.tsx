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
    <div>
      <p className="eyebrow mb-2">Ask next</p>
      <ul className="flex flex-wrap gap-2">
        {questions.map((question, i) => (
          <li key={question} className="stagger-item" style={{ ["--i" as string]: i }}>
            <button
              type="button"
              disabled={disabled}
              data-press=""
              onClick={() => onAsk(question)}
              className="inline-flex items-start gap-1.5 rounded-md border bg-surface px-3 py-1.5 text-left text-[13.5px] text-fg transition-colors hover:border-accent hover:bg-accent-soft disabled:opacity-50"
            >
              <CornerDownRight aria-hidden className="mt-0.5 size-3.5 shrink-0 text-accent-text" />
              {question}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
