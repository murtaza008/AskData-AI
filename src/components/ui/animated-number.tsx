"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type AnimatedNumberProps = {
  value: number;
  /** Formats each frame and the final value. Defaults to a grouped integer. */
  format?: (value: number) => string;
  duration?: number;
  className?: string;
  /**
   * Inside an aria-live region: don't count (screen readers would read every
   * frame); set the final text and pop it instead.
   */
  live?: boolean;
};

const defaultFormat = (value: number) => Math.round(value).toLocaleString("en-US");
const prefersReduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Counts from its previous value to `value` with an expo-out curve. The final
 * value is always in `data-value`, so tests never read a number mid-count.
 * Runs outside React (writes textContent from rAF) to keep renders cheap.
 */
export function AnimatedNumber({ value, format = defaultFormat, duration = 900, className, live }: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const from = useRef(0);
  const formatRef = useRef(format);

  useEffect(() => {
    formatRef.current = format;
  });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const fmt = formatRef.current;
    const start = from.current;
    from.current = value;

    if (live || prefersReduced() || start === value) {
      element.textContent = fmt(value);
      if (live && start !== value && !prefersReduced()) {
        element.animate([{ transform: "scale(1.12)" }, { transform: "scale(1)" }], {
          duration: 260,
          easing: "cubic-bezier(0.16, 1, 0.3, 1)",
        });
      }
      return;
    }

    let frame = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - t0) / duration);
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      element.textContent = fmt(start + (value - start) * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      element.textContent = fmt(value);
    };
  }, [value, duration, live]);

  return (
    <span ref={ref} data-value={value} className={cn("tabular inline-block", className)} suppressHydrationWarning>
      {format(live ? value : 0)}
    </span>
  );
}
