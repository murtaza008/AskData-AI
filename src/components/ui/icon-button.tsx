import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Required: icon-only buttons need an accessible name. */
  label: string;
};

/** Square, icon-only button with an accessible name and a native tooltip. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, className, type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      data-press=""
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-sm text-fg-muted transition-colors hover:bg-sunken hover:text-fg disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
});
