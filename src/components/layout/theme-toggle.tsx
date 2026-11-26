"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { type KeyboardEvent, useRef, useSyncExternalStore } from "react";
import { flushSync } from "react-dom";
import { cn } from "@/lib/utils";

export type ThemeChoice = "light" | "dark" | "system";

const noop = () => () => {};
/** True only after hydration; the stored theme is unknown on the server. */
function useHydrated() {
  return useSyncExternalStore(noop, () => true, () => false);
}

function resolve(choice: ThemeChoice): "light" | "dark" {
  if (choice !== "system") return choice;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/**
 * Switch theme, revealing the new one in a circle that grows from `origin`
 * (View Transitions API). Instant without support or with reduced motion.
 */
export function switchTheme(choice: ThemeChoice, setTheme: (theme: string) => void, origin?: Element | null) {
  const root = document.documentElement;
  const next = resolve(choice);
  const apply = () => {
    root.classList.toggle("dark", next === "dark");
    root.style.colorScheme = next;
    setTheme(choice);
  };

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const current = root.classList.contains("dark") ? "dark" : "light";
  if (!document.startViewTransition || reduced || current === next) {
    apply();
    return;
  }

  const rect = origin?.getBoundingClientRect();
  const x = rect ? rect.left + rect.width / 2 : window.innerWidth - 40;
  const y = rect ? rect.top + rect.height / 2 : 28;
  const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));

  root.dataset.themeSwitching = "";
  const transition = document.startViewTransition(() => flushSync(apply));
  transition.ready
    .then(() =>
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 440, easing: "cubic-bezier(0.16, 1, 0.3, 1)", pseudoElement: "::view-transition-new(root)" },
      ),
    )
    .catch(() => {});
  void transition.finished.finally(() => delete root.dataset.themeSwitching);
}

const OPTIONS = [
  { value: "light", label: "Light theme", icon: Sun },
  { value: "dark", label: "Dark theme", icon: Moon },
  { value: "system", label: "System theme", icon: Monitor },
] as const;

/**
 * Light / dark / system as a compact radio group. Plain buttons, no popover
 * library, so it is cheap enough for the public pages too.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const hydrated = useHydrated();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const current: ThemeChoice = hydrated ? ((theme as ThemeChoice | undefined) ?? "system") : "system";

  const choose = (index: number) => {
    refs.current[index]?.focus();
    switchTheme(OPTIONS[index].value, setTheme, refs.current[index]);
  };

  const onKeyDown = (event: KeyboardEvent, index: number) => {
    const step =
      event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    choose((index + step + OPTIONS.length) % OPTIONS.length);
  };

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className={cn("inline-flex items-center gap-px rounded-md border bg-sunken p-0.5", className)}
    >
      {OPTIONS.map((option, index) => {
        const on = current === option.value;
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            ref={(element) => {
              refs.current[index] = element;
            }}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={option.label}
            title={option.label}
            tabIndex={on ? 0 : -1}
            data-press=""
            onClick={() => choose(index)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cn(
              "inline-flex size-7 items-center justify-center rounded-[5px] transition-colors duration-150",
              on
                ? "bg-surface text-fg shadow-[inset_0_1px_0_var(--highlight),var(--shadow-xs)]"
                : "text-fg-subtle hover:text-fg",
            )}
          >
            <Icon aria-hidden className="size-3.5" strokeWidth={1.75} />
          </button>
        );
      })}
    </div>
  );
}
