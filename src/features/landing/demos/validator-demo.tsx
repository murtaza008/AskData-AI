"use client";

import { Check, ShieldX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { AllowedTable, ValidationResult } from "@/lib/sql/validate";
import { cn } from "@/lib/utils";

/*
 * Runs the app's real SQL validator (src/lib/sql/validate.ts, the same module
 * the server uses before every query) in the browser. The parser is its own
 * chunk, fetched when this demo comes near the screen.
 */

const ALLOWED: AllowedTable[] = ["customers", "products", "orders", "order_items", "refunds"].map((name) => ({
  schema: "analytics",
  name,
}));

const PRESETS = [
  {
    label: "A normal question",
    sql: "SELECT region, count(*) AS customers\nFROM customers\nGROUP BY region\nORDER BY customers DESC",
  },
  { label: "Drop a table", sql: "DROP TABLE orders" },
  { label: "Read password hashes", sql: 'SELECT email, "passwordHash"\nFROM app."User"' },
  { label: "Hide a write", sql: "SELECT 1;\nDELETE FROM orders" },
  { label: "Stall the database", sql: "SELECT pg_sleep(60)" },
  { label: "Read the system catalog", sql: "SELECT rolname, rolpassword\nFROM pg_authid" },
] as const;

type Validator = {
  validateSelect: (sql: string, options: { allowed: AllowedTable[]; defaultSchema: string }) => ValidationResult;
  withRowLimit: (sql: string, limit: number) => string;
};

export function ValidatorDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const [validator, setValidator] = useState<Validator | null>(null);
  const [sql, setSql] = useState<string>(PRESETS[1].sql);
  const [preset, setPreset] = useState(1);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        void import("@/lib/sql/validate").then((mod) => setValidator(mod));
      },
      { rootMargin: "400px 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const result = validator?.validateSelect(sql, { allowed: ALLOWED, defaultSchema: "analytics" });

  return (
    <div ref={ref} className="flex h-full flex-col">
      <div role="radiogroup" aria-label="Example queries" className="flex flex-wrap gap-1.5">
        {PRESETS.map((item, i) => (
          <button
            key={item.label}
            type="button"
            role="radio"
            aria-checked={preset === i}
            data-press=""
            onClick={() => {
              setPreset(i);
              setSql(item.sql);
            }}
            className={cn(
              "rounded-full border px-2.5 py-1 text-[12.5px] transition-colors",
              preset === i ? "border-accent bg-accent-soft text-fg" : "bg-surface text-fg-muted hover:border-border-strong hover:text-fg",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <label className="mt-4 block">
        <span className="eyebrow">SQL the model wrote</span>
        <textarea
          value={sql}
          onChange={(event) => {
            setSql(event.target.value);
            setPreset(-1);
          }}
          spellCheck={false}
          rows={5}
          className="mt-1.5 w-full resize-y rounded-md border bg-sunken px-3 py-2.5 font-mono text-[13px] leading-relaxed text-fg focus:border-accent focus:outline-none"
        />
      </label>

      <div role="status" aria-live="polite" className="mt-3 min-h-[92px]">
        {!result ? (
          <p className="text-[13px] text-fg-muted">Loading the validator…</p>
        ) : result.ok ? (
          <div className="rounded-md border border-success/40 bg-success-soft px-3.5 py-3">
            <p className="flex items-center gap-2 text-[14px] font-medium text-success-text">
              <Check aria-hidden className="size-4" /> Allowed: one SELECT on allowed tables
            </p>
            <p className="mt-1.5 text-[12.5px] text-fg-muted">What actually runs, read-only with a 5-second limit:</p>
            <code className="mt-1 block truncate font-mono text-[12px] text-fg" title={validator?.withRowLimit(result.sql, 500)}>
              {validator?.withRowLimit(result.sql, 500).replace(/\s+/g, " ")}
            </code>
          </div>
        ) : (
          <div className="rounded-md border border-danger/40 bg-danger-soft px-3.5 py-3">
            <p className="flex items-center gap-2 text-[14px] font-medium text-danger-text">
              <ShieldX aria-hidden className="size-4" /> Rejected before it reaches the database
            </p>
            <p className="mt-1.5 text-[13px] text-fg">{result.reason}</p>
          </div>
        )}
      </div>
    </div>
  );
}
