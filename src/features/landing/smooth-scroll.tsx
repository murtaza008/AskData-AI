"use client";

import { useEffect } from "react";

/**
 * Inertial scrolling (Lenis) on the landing page only. Not for touch screens
 * (native momentum is better there) and not with reduced motion.
 */
export function SmoothScroll() {
  useEffect(() => {
    const touch = window.matchMedia("(pointer: coarse)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (touch || reduced) return;

    let frame = 0;
    let destroy: (() => void) | undefined;
    let cancelled = false;

    void import("lenis").then(({ default: Lenis }) => {
      if (cancelled) return;
      const lenis = new Lenis({ duration: 1.05, easing: (t) => 1 - Math.pow(2, -10 * t), anchors: { offset: -56 } });
      const raf = (time: number) => {
        lenis.raf(time);
        frame = requestAnimationFrame(raf);
      };
      frame = requestAnimationFrame(raf);
      destroy = () => lenis.destroy();
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      destroy?.();
    };
  }, []);

  return null;
}
