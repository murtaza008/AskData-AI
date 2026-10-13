import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Pressable, Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { buttonClass } from "@/components/ui/button";
import { ProductPreview } from "./product-preview";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Faint ruled-paper backdrop that drifts slowly behind the hero. */}
      <div aria-hidden className="hero-grid pointer-events-none absolute inset-0" />

      <div className="relative mx-auto grid max-w-[1200px] gap-12 px-4 pb-20 pt-14 sm:px-6 lg:grid-cols-[1fr_1.05fr] lg:gap-16 lg:pt-24">
        <Stagger step={0.08} once className="max-w-[560px]">
          <StaggerItem>
            <div className="label-caps inline-flex items-center gap-2">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-highlight opacity-60" />
                <span className="relative inline-flex size-1.5 rounded-full bg-highlight" />
              </span>
              AI data analyst
            </div>
          </StaggerItem>
          <StaggerItem>
            <h1 className="mt-4 text-[38px] leading-[1.05] sm:text-[48px] lg:text-[56px]">
              Ask your database a question. Get the answer, the chart, and the SQL.
            </h1>
          </StaggerItem>
          <StaggerItem>
            <p className="mt-6 max-w-[48ch] text-[17px] text-muted-foreground">
              AskData writes the query, runs it read-only, and shows its work, so you can check every number.
            </p>
          </StaggerItem>
          <StaggerItem>
            <div className="mt-8 flex flex-wrap items-center gap-6">
              <Pressable>
                <Link href="/login?demo=1" className={buttonClass("primary", "lg", "group")}>
                  Try the live demo
                  <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={1.5} />
                </Link>
              </Pressable>
              <a href="#how" className="group inline-flex items-center gap-1.5 text-[14px] font-medium hover:underline">
                See how it works
                <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={1.5} />
              </a>
            </div>
          </StaggerItem>
          <StaggerItem>
            <p className="mt-4 text-[13px] text-muted-foreground">No sign-up needed. A demo account is ready to use.</p>
          </StaggerItem>
        </Stagger>

        <Reveal delay={0.2} y={24}>
          <ProductPreview />
        </Reveal>
      </div>
    </section>
  );
}
