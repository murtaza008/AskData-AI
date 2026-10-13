import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const base =
  "inline-flex items-center justify-center gap-2 rounded-md text-[14px] font-medium transition-[color,background-color,border-color,transform] duration-150 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50";

const variants = {
  primary: "bg-primary text-primary-foreground hover:bg-primary-hover",
  outline: "border bg-card text-foreground hover:bg-muted",
  ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
  danger: "border border-destructive/40 bg-card text-destructive hover:bg-destructive/10",
} as const;

const sizes = {
  sm: "px-2.5 py-1.5 text-[13px]",
  md: "px-4 py-2",
  lg: "px-5 py-2.5",
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

export function Button({ variant = "primary", size = "md", className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={buttonClass(variant, size, className)} {...props} />;
}
