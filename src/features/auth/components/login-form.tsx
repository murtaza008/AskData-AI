"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { DEMO_ACCOUNT } from "@/lib/demo";
import { useSignIn } from "../hooks/use-sign-in";
import { DemoCredentials } from "./demo-credentials";

export function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { signInWith, error, isPending } = useSignIn();
  const fromDemoLink = searchParams.get("demo") === "1";

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void signInWith(email, password);
  };

  const continueWithDemo = () => {
    setEmail(DEMO_ACCOUNT.email);
    setPassword(DEMO_ACCOUNT.password);
    void signInWith(DEMO_ACCOUNT.email, DEMO_ACCOUNT.password);
  };

  return (
    <>
      <h1 className="text-[28px]">Log in to AskData</h1>
      <p className="mt-1.5 text-[14.5px] text-fg-muted">Use the demo account in one click, or your own.</p>

      <div className="mt-6">
        <DemoCredentials onUse={continueWithDemo} isPending={isPending} highlight={fromDemoLink} />
      </div>

      <div className="my-6 flex items-center gap-3 text-[12px] text-fg-muted">
        <span className="h-px flex-1 bg-border" />
        or with your own account
        <span className="h-px flex-1 bg-border" />
      </div>

      <form className="panel space-y-4 p-5" onSubmit={onSubmit} noValidate>
        <TextField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <TextField
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        {error && (
          <p role="alert" className="rounded-sm bg-danger-soft px-3 py-2 text-[13px] text-danger-text">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" variant="inverse" className="w-full" disabled={isPending || !email || !password}>
          {isPending ? "Signing in…" : "Log in"}
        </Button>
      </form>

      <p className="mt-6 text-center text-[14px] text-fg-muted">
        No account yet?{" "}
        <Link href="/signup" className="font-medium text-fg underline underline-offset-2">
          Create one, free
        </Link>
      </p>
    </>
  );
}
