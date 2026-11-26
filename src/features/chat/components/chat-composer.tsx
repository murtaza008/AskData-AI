"use client";

import { ArrowUp, Square } from "lucide-react";
import { type FormEvent, type KeyboardEvent, useState } from "react";
import { ModelPicker } from "@/features/workspace/components/model-picker";

const MAX_LENGTH = 500;

type ChatComposerProps = {
  onAsk: (question: string) => void;
  onStop: () => void;
  isBusy: boolean;
  disabled?: boolean;
};

/** Question box. Enter sends, Shift+Enter adds a line; turns into Stop while the agent works. */
export function ChatComposer({ onAsk, onStop, isBusy, disabled }: ChatComposerProps) {
  const [text, setText] = useState("");
  const canSend = text.trim().length > 1 && !isBusy && !disabled;

  const submit = () => {
    if (!canSend) return;
    onAsk(text);
    setText("");
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    // Don't send while an IME composition (e.g. Japanese input) is in progress.
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <div className="border-t bg-bg">
      <form className="mx-auto max-w-[860px] px-4 py-4 sm:px-6" onSubmit={onSubmit}>
        <div className="flex items-end gap-2 rounded-md border bg-surface p-2 focus-within:border-border-strong focus-within:ring-2 focus-within:ring-focus/20">
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={onKeyDown}
            rows={2}
            maxLength={MAX_LENGTH}
            disabled={disabled}
            placeholder="Ask about sales, customers, products…"
            aria-label="Your question"
            className="min-h-[48px] flex-1 resize-none bg-transparent px-2 py-1.5 text-[15px] placeholder:text-fg-muted focus:outline-none disabled:opacity-60"
          />
          {isBusy ? (
            <button
              type="button"
              onClick={onStop}
              aria-label="Stop"
              title="Stop"
              className="grid size-9 place-items-center rounded-md border bg-surface text-fg hover:bg-sunken"
            >
              <Square className="size-3.5 fill-current" strokeWidth={0} />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!canSend}
              aria-label="Send"
              title="Send"
              className="grid size-9 place-items-center rounded-md bg-accent text-accent-fg hover:bg-accent-hover disabled:opacity-40"
            >
              <ArrowUp className="size-4" strokeWidth={2} />
            </button>
          )}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <ModelPicker />
          <p className="text-[12px] text-fg-muted">Read-only · every query is validated, time-limited and row-capped</p>
        </div>
      </form>
    </div>
  );
}
