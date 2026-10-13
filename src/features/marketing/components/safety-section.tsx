import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { SAFETY_LAYERS } from "../sample-data";

export function SafetySection() {
  return (
    <section id="safety" className="scroll-mt-4 border-t bg-card">
      <div className="mx-auto grid max-w-[1200px] gap-8 px-4 py-20 sm:px-6 md:grid-cols-[220px_1fr]">
        <div className="label-caps pt-2">Safety</div>
        <div>
          <Reveal>
            <h2 className="text-[28px]">Built to be safe with your data</h2>
            <p className="mt-3 max-w-[60ch] text-[15px] text-muted-foreground">
              Letting a language model write SQL is only acceptable if it cannot do damage. Each layer below works
              independently, so one failing does not expose the database.
            </p>
          </Reveal>
          <Stagger step={0.07} className="mt-8 border-t">
            {SAFETY_LAYERS.map((layer, index) => (
              <StaggerItem
                key={layer.title}
                className="group grid gap-1 border-b py-4 transition-colors duration-200 hover:bg-background/60 sm:grid-cols-[48px_280px_1fr] sm:gap-4"
              >
                <span className="num text-[13px] text-muted-foreground transition-colors duration-200 group-hover:text-highlight">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="font-medium">{layer.title}</span>
                <span className="text-[14px] text-muted-foreground">{layer.body}</span>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </div>
    </section>
  );
}
