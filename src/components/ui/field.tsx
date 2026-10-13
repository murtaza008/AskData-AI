import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export const inputClass =
  "w-full rounded-md border bg-card px-3 py-2 text-[15px] text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/25";

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  /** Validation message shown under the input. */
  error?: string;
  hint?: ReactNode;
};

/** Labelled text input with inline error display. */
export function TextField({ label, error, hint, id, className, ...props }: TextFieldProps) {
  const fieldId = id ?? props.name;
  const errorId = error ? `${fieldId}-error` : undefined;
  return (
    <div>
      <label htmlFor={fieldId} className="mb-1.5 block text-[13px] font-medium">
        {label}
      </label>
      <input
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
        className={cn(inputClass, error && "border-destructive", className)}
        {...props}
      />
      {error ? (
        <p id={errorId} className="mt-1 text-[13px] text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1 text-[13px] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
