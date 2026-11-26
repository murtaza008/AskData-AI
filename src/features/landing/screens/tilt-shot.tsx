"use client";

import Image from "next/image";
import { useRef } from "react";

/**
 * A real screenshot of the app that tilts toward the pointer (outside React:
 * transforms are written straight to the element). Shows the light or dark
 * capture to match the visitor's theme. Still for touch and reduced motion.
 */
export function TiltShot({ name, alt, priority = false }: { name: string; alt: string; priority?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);

  const onMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const element = ref.current;
    if (!element || event.pointerType !== "mouse") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rect = element.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    element.style.transform = `perspective(1400px) rotateX(${-y * 6}deg) rotateY(${x * 8}deg)`;
  };
  const onLeave = () => {
    if (ref.current) ref.current.style.transform = "perspective(1400px) rotateX(0deg) rotateY(0deg)";
  };

  const common = { width: 1440, height: 900, sizes: "(min-width: 1024px) 60vw, 100vw", priority } as const;
  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className="overflow-hidden rounded-lg border bg-surface shadow-[var(--shadow-lg)] transition-transform duration-300 ease-out will-change-transform"
    >
      <Image src={`/screens/${name}-light.png`} alt={alt} {...common} className="block h-auto w-full dark:hidden" />
      <Image src={`/screens/${name}-dark.png`} alt={alt} {...common} className="hidden h-auto w-full dark:block" />
    </div>
  );
}
