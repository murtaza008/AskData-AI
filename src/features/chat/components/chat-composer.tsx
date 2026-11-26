"use client";

import { ArrowUp, Square } from "lucide-react";
import { type FormEvent, type KeyboardEvent, useLayoutEffect, useRef, useState } from "react";
import { ModelPicker } from "@/features/workspace/components/model-picker";
import { cn } from "@/lib/utils";

const MAX_LENGTH = 500;

type ChatComposerProps = {
  onAsk: (question: string) => void;
  onStop: () => void;
  isBusy: boolean;
  disabled?: boolean;
};

/** Question box. Enter sends, Shift+Enter adds a line; while the agent works it offers Stop. */
export function ChatComposer({ onAsk, onStop, isBusy, disabled }: ChatComposerProps) {
  const [text, setText] = useState("");
  const area = useRef<HTMLTextAreaElement>(null);
  const canSend = text.trim().length > 1 && !isBusy && !disabled;

  // Grow with the text, up to about six lines.
  useLayoutEffect(() => {
    const element = area.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, 168)}px`;
  }, [text]);

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

  const remaining = MAX_LENGTH - text.length;

  return (
    <div className="no-print shrink-0 border-t bg-bg/95 pb-[max(env(safe-area-inset-bottom),0px)]">
      <form className="mx-auto max-w-[880px] px-4 pb-4 pt-3 sm:px-6" onSubmit={onSubmit}>
        <div className="panel flex items-end gap-2 p-2 transition-[border-color,box-shadow] focus-within:border-accent focus-within:shadow-[0_0_0_3px_var(--accent-soft)]">
          <textarea
            ref={area}
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            maxLength={MAX_LENGTH}
            disabled={disabled}
            placeholder="Ask about sales, customers, products…"
            aria-label="Your question"
            aria-describedby="composer-hint"
            className="min-h-[44px] flex-1 resize-none bg-transparent px-2 py-2.5 text-[15.5px] text-fg placeholder:text-fg-subtle focus:outline-none disabled:opacity-60"
          />
          {isBusy ? (
            <button
              type="button"
              onClick={onStop}
              aria-label="Stop"
              title="Stop"
              data-press=""
              className="grid size-10 shrink-0 place-items-center rounded-md border bg-surface text-fg hover:bg-sunken"
            >
              <Square aria-hidden className="size-3.5 fill-current" strokeWidth={0} />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!canSend}
              aria-label="Ask"
              title="Ask (Enter)"
              data-press=""
              className="grid size-10 shrink-0 place-items-center rounded-md bg-accent text-accent-fg hover:bg-accent-hover disabled:opacity-40"
            >
              <ArrowUp aria-hidden className="size-4" strokeWidth={2.25} />
            </button>
          )}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <ModelPicker />
          <p id="composer-hint" className="text-[12px] text-fg-muted">
            Enter to ask · Shift+Enter for a new line · read-only, validated, 5 s limit
          </p>
          {remaining < 80 && (
            <span className={cn("num ml-auto text-[12px]", remaining < 20 ? "text-danger-text" : "text-fg-muted")}>
              {remaining} left
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
