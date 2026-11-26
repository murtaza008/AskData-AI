import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

/*
 * Buttons get their press feedback (scale 0.97) from lib/press.ts through the
 * `data-press` attribute: it runs outside React, and only on pointer input.
 */
const base =
  "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-sm font-medium transition-[color,background-color,border-color,box-shadow] duration-150 disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0";

const variants = {
  primary:
    "bg-accent text-accent-fg shadow-[inset_0_1px_0_rgb(255_255_255/0.14),var(--shadow-xs)] hover:bg-accent-hover",
  outline: "border border-border bg-surface text-fg shadow-[inset_0_1px_0_var(--highlight),var(--shadow-xs)] hover:border-border-strong hover:bg-surface-2",
  ghost: "text-fg-muted hover:bg-sunken hover:text-fg",
  inverse: "bg-inverse text-inverse-fg hover:opacity-90",
  danger: "border border-danger/40 bg-surface text-danger-text hover:bg-danger-soft",
} as const;

const sizes = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-9 px-4 text-[14px]",
  lg: "h-11 px-5 text-[15px]",
} as const;

export type ButtonVariant = keyof typeof variants;
export type ButtonSize = keyof typeof sizes;

/** Class string for button-looking elements that are not <button> (e.g. links). */
export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", className, type = "button", ...props },
  ref,
) {
  return <button ref={ref} type={type} data-press="" className={buttonClass(variant, size, className)} {...props} />;
});
