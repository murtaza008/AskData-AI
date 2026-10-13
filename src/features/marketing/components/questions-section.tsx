import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { SUGGESTED_QUESTIONS } from "@/lib/demo";
import { cn } from "@/lib/utils";

/** Example questions. Each link opens the demo and asks it straight away. */
export function QuestionsSection() {
  return (
    <section id="questions" className="scroll-mt-4 border-t">
      <div className="mx-auto max-w-[1200px] px-4 py-20 sm:px-6">
        <Reveal className="flex items-baseline justify-between gap-4">
          <h2 className="text-[28px]">Questions people ask</h2>
          <span className="label-caps hidden sm:block">Click to run in the demo</span>
        </Reveal>
        <Stagger step={0.05} className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SUGGESTED_QUESTIONS.map((question, index) => (
            <StaggerItem key={question} className={cn(index === 0 && "lg:col-span-2")}>
              <Link
                // Signed-out visitors are sent to the login page first and returned here.
                href={`/app?q=${encodeURIComponent(question)}`}
                prefetch={false}
                className="group flex h-full items-start gap-3 rounded-md border bg-card px-4 py-3 font-mono text-[13px] transition-all duration-200 hover:-translate-y-0.5 hover:border-primary hover:shadow-pop"
              >
                <span className="text-muted-foreground transition-colors group-hover:text-highlight" aria-hidden>
                  &gt;
                </span>
                <span className="flex-1">{question}</span>
                <ArrowRight
                  className="mt-0.5 size-4 shrink-0 -translate-x-1 text-muted-foreground opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100"
                  strokeWidth={1.5}
                />
              </Link>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
