"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

// The 3D scene is its own chunk, fetched only when the story comes near the viewport.
const StoryScene = dynamic(() => import("./story-scene"), { ssr: false });

/** Mounts the 3D scene once the story is close to the screen (never for reduced motion). */
export function StoryLoader() {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShow(true);
          observer.disconnect();
        }
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return <div ref={ref} className="absolute inset-0">{show && <StoryScene />}</div>;
}
