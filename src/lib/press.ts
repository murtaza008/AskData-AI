/**
 * Press feedback for anything marked `data-press`: a quick 0.97 scale run
 * with the Web Animations API, outside React, and only for pointer input
 * (keyboard activation stays instant). One delegated listener per page.
 */
const prefersReduced = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";

export function installPressFeedback(): () => void {
  function onDown(event: PointerEvent) {
    if (event.button !== 0 || prefersReduced()) return;
    const element = (event.target as Element | null)?.closest<HTMLElement>("[data-press]");
    if (!element || element.matches(":disabled, [aria-disabled='true']")) return;

    const press = element.animate([{ transform: "scale(1)" }, { transform: "scale(0.97)" }], {
      duration: 110,
      easing: EASE,
      fill: "forwards",
    });

    const release = () => {
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
      press.cancel();
      element.animate([{ transform: "scale(0.97)" }, { transform: "scale(1)" }], { duration: 220, easing: EASE });
    };
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
  }

  document.addEventListener("pointerdown", onDown, { passive: true });
  return () => document.removeEventListener("pointerdown", onDown);
}
