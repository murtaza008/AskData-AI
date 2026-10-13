import { ArrowUpRight } from "lucide-react";
import { Stagger, StaggerItem } from "@/components/motion/reveal";
import { SUGGESTED_QUESTIONS } from "@/lib/demo";
import { DataSourceChip } from "./data-source-chip";

/** Shown before the first question: what you can ask, and starter questions. */
export function EmptyChat({ onAsk, disabled }: { onAsk: (question: string) => void; disabled: boolean }) {
  return (
    <div className="pt-6 sm:pt-14">
      <h1 className="animate-rise text-[30px] sm:text-[40px]">What do you want to know?</h1>
      <div className="mt-4">
        <DataSourceChip />
      </div>

      <div className="label-caps mb-2 mt-10">Try asking</div>
      <Stagger once step={0.04} className="divide-y border-y">
        {SUGGESTED_QUESTIONS.map((question) => (
          <StaggerItem key={question} y={8}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onAsk(question)}
              className="group flex w-full items-center justify-between gap-4 py-3 text-left text-[15px] transition-[color,padding] duration-200 hover:pl-2 hover:text-highlight disabled:opacity-50"
            >
              {question}
              <ArrowUpRight
                className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-highlight"
                strokeWidth={1.5}
              />
            </button>
          </StaggerItem>
        ))}
      </Stagger>
    </div>
  );
}
