"use client";

import { ArrowRight } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { DEMO_ACCOUNT } from "@/lib/demo";
import { cn } from "@/lib/utils";

type DemoCredentialsProps = {
  onUse: () => void;
  isPending: boolean;
  /** Arrived from a "Try the demo" link: put focus on the button. */
  highlight?: boolean;
};

/** The public demo login, shown openly so visitors can try the app without signing up. */
export function DemoCredentials({ onUse, isPending, highlight }: DemoCredentialsProps) {
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (highlight) button.current?.focus();
  }, [highlight]);

  return (
    <section
      aria-labelledby="demo-title"
      className={cn("rounded-lg border bg-accent-soft p-5", highlight ? "border-accent" : "border-accent/30")}
    >
      <h2 id="demo-title" className="text-[17px]">
        Try it with the demo account
      </h2>
      <p className="mt-1 text-[13.5px] text-fg-muted">
        A shared account on the demo store, with a daily question limit. No sign-up.
      </p>
      <dl className="mt-3 grid grid-cols-[72px_minmax(0,1fr)] gap-y-1 text-[13px]">
        <div className="contents">
          <dt className="text-fg-muted">Email</dt>
          <dd className="num truncate text-fg">{DEMO_ACCOUNT.email}</dd>
        </div>
        <div className="contents">
          <dt className="text-fg-muted">Password</dt>
          <dd className="num text-fg">{DEMO_ACCOUNT.password}</dd>
        </div>
      </dl>
      <Button ref={button} size="lg" className="group mt-4 w-full" onClick={onUse} disabled={isPending}>
        {isPending ? "Signing in…" : "Continue with the demo account"}
        {!isPending && <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" />}
      </Button>
    </section>
  );
}
