"use client";

import { useQuery } from "@tanstack/react-query";
import { Check } from "lucide-react";
import Link from "next/link";
import { useAccount } from "@/lib/hooks/use-account";
import { q } from "@/lib/queries";
import { cn } from "@/lib/utils";

/**
 * First steps for a new account, ticked off from the account's real data:
 * a question asked, a chart pinned, a CSV uploaded. Hidden for the shared
 * demo and once everything is done.
 */
export function GettingStarted() {
  const { account, isDemo } = useAccount();
  const conversations = useQuery({ ...q.conversations(), enabled: Boolean(account && !isDemo) });
  const pins = useQuery({ ...q.pins(), enabled: Boolean(account && !isDemo) });
  const uploads = useQuery({ ...q.uploads(), enabled: Boolean(account && !isDemo) });
  if (!account || isDemo || !conversations.data || !pins.data || !uploads.data) return null;

  const steps = [
    { label: "Ask your first question", detail: "Pick one below or type your own.", done: conversations.data.length > 0, href: null },
    { label: "Pin a chart to the dashboard", detail: "Use Pin on any answer's chart.", done: pins.data.length > 0, href: "/app/dashboard" },
    {
      label: "Upload a CSV and ask about it",
      detail: "Your own table, queried with the same safety rules.",
      done: uploads.data.uploads.some((u) => !u.isSample),
      href: "/app/upload",
    },
  ];
  const done = steps.filter((s) => s.done).length;
  if (done === steps.length) return null;

  return (
    <section aria-labelledby="getting-started" className="panel mt-8 p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="getting-started" className="text-[16px]">
          Getting started
        </h2>
        <span className="num text-[12px] text-fg-muted">
          {done} of {steps.length} done
        </span>
      </div>
      <ol className="mt-3 space-y-2.5">
        {steps.map((step) => (
          <li key={step.label} className="flex items-start gap-3">
            <span
              className={cn(
                "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border",
                step.done ? "border-success bg-success-soft text-success-text" : "border-border-strong",
              )}
            >
              {step.done && <Check aria-hidden className="size-3" strokeWidth={3} />}
              <span className="sr-only">{step.done ? "Done:" : "To do:"}</span>
            </span>
            <span>
              {step.href && !step.done ? (
                <Link href={step.href} className="text-[14px] font-medium text-fg underline underline-offset-2">
                  {step.label}
                </Link>
              ) : (
                <span className={cn("text-[14px] font-medium", step.done ? "text-fg-muted line-through" : "text-fg")}>{step.label}</span>
              )}
              <span className="block text-[13px] text-fg-muted">{step.detail}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
