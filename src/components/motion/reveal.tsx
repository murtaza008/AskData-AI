"use client";

import { animate, motion, MotionConfig, useInView, useReducedMotion } from "motion/react";
import { type ReactNode, useEffect, useRef, useState } from "react";

/** Shared easing: quick start, soft landing. */
export const ease = [0.16, 1, 0.3, 1] as const;

/**
 * App-wide motion settings. `reducedMotion="user"` makes every animation
 * below respect the visitor's "reduce motion" system preference.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

type RevealProps = {
  children: ReactNode;
  delay?: number;
  /** Distance to rise from, in px. */
  y?: number;
  className?: string;
};

/** Scroll-triggered fade/rise-in that replays whenever it re-enters the viewport. */
export function Reveal({ children, delay = 0, y = 14, className }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: false, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y }}
      transition={{ duration: 0.4, delay, ease }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

type StaggerProps = {
  children: ReactNode;
  className?: string;
  /** Delay between children, in seconds. */
  step?: number;
  /** Play only the first time (use for content that should not re-animate, e.g. app lists). */
  once?: boolean;
};

/** Parent of a staggered group. Pair with `StaggerItem`. */
export function Stagger({ children, className, step = 0.06, once = false }: StaggerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? "show" : "hidden"}
      variants={{ hidden: {}, show: { transition: { staggerChildren: step, delayChildren: 0.04 } } }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className, y = 12 }: { children: ReactNode; className?: string; y?: number }) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y },
        show: { opacity: 1, y: 0, transition: { duration: 0.36, ease } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** Wrapper that gives a button or link a subtle press/hover response. */
export function Pressable({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.span
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.18, ease }}
      className={className ?? "inline-flex"}
    >
      {children}
    </motion.span>
  );
}

type CountUpProps = {
  value: number;
  format?: (value: number) => string;
  duration?: number;
  className?: string;
};

/** Animates a number up to `value` when it scrolls into view, and again when the value changes. */
export function CountUp({
  value,
  format = (n) => Math.round(n).toLocaleString("en-US"),
  duration = 0.9,
  className,
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduceMotion = useReducedMotion();
  const [display, setDisplay] = useState(0);
  const current = useRef(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(current.current, value, {
      // With "reduce motion" on, jump straight to the final value.
      duration: reduceMotion ? 0 : duration,
      ease,
      onUpdate: (latest) => {
        current.current = latest;
        setDisplay(latest);
      },
    });
    return () => controls.stop();
  }, [inView, value, duration, reduceMotion]);

  return (
    <span ref={ref} className={className}>
      {format(display)}
    </span>
  );
}
