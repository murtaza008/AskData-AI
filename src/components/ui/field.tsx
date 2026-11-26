import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export const inputClass =
  "h-10 w-full rounded-sm border border-border bg-surface px-3 text-[15px] text-fg shadow-[inset_0_1px_2px_rgb(0_0_0/0.04)] placeholder:text-fg-subtle transition-[border-color,box-shadow] duration-150 hover:border-border-strong focus:border-accent focus:outline-none focus:ring-3 focus:ring-accent/20";

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  /** Validation message shown under the input. */
  error?: string;
  hint?: ReactNode;
};

/** Labelled text input with inline error display. */
export function TextField({ label, error, hint, id, className, ...props }: TextFieldProps) {
  const fieldId = id ?? props.name;
  const messageId = error || hint ? `${fieldId}-message` : undefined;
  return (
    <div>
      <label htmlFor={fieldId} className="mb-1.5 block text-[13px] font-medium text-fg">
        {label}
      </label>
      <input
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={messageId}
        className={cn(inputClass, error && "border-danger", className)}
        {...props}
      />
      {error ? (
        <p id={messageId} className="mt-1.5 text-[13px] text-danger-text">
          {error}
        </p>
      ) : hint ? (
        <p id={messageId} className="mt-1.5 text-[13px] text-fg-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
