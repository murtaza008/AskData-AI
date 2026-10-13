import { cn } from "@/lib/utils";

/**
 * Renders the agent's insight. The model marks key figures with **double
 * asterisks**; those become highlighted figures and everything else is plain
 * text (never HTML), so model output cannot inject markup.
 */
export function InsightText({ text, className }: { text: string; className?: string }) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return (
    <p className={cn("max-w-[68ch] text-[16px] leading-[1.65]", className)}>
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <span key={index} className="key-num">
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </p>
  );
}
