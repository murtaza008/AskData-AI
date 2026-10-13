"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { DEMO_ACCOUNT } from "@/lib/demo";
import { useSignIn } from "../hooks/use-sign-in";
import { DemoCredentials } from "./demo-credentials";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { signInWith, error, isPending } = useSignIn();

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
      <h1 className="text-[28px]">Log in</h1>
      <p className="mt-1 text-[14px] text-muted-foreground">Use the demo account, or your own.</p>

      <div className="mt-6">
        <DemoCredentials onUse={continueWithDemo} isPending={isPending} />
      </div>

      <form className="mt-6 space-y-4" onSubmit={onSubmit} noValidate>
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
          <p role="alert" className="text-[13px] text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full" disabled={isPending || !email || !password}>
          {isPending ? "Signing in…" : "Log in"}
        </Button>
      </form>

      <p className="mt-6 text-[14px] text-muted-foreground">
        No account?{" "}
        <Link href="/signup" className="font-medium text-foreground hover:underline">
          Sign up
        </Link>
        <span className="mx-2">·</span>
        <Link href="/" className="hover:text-foreground">
          Back to site
        </Link>
      </p>
    </>
  );
}
