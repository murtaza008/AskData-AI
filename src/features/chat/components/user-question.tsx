/** The question cell: a "Q" marker and the question, like the input cell of a notebook. */
export function UserQuestion({ text, meta }: { text: string; meta?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span
        aria-hidden
        className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-sm bg-inverse font-mono text-[11px] font-semibold text-inverse-fg"
      >
        Q
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="whitespace-pre-wrap break-words font-sans text-[17px] font-medium leading-snug tracking-normal text-fg [font-stretch:100%]">
          {text}
        </h2>
        {meta && <div className="mt-1 text-[12px] text-fg-muted">{meta}</div>}
      </div>
    </div>
  );
}
