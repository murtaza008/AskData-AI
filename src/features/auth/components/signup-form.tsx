"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { api, messageOf } from "@/lib/api-client";
import { registerSchema } from "@/lib/validation/auth";
import { useSignIn } from "../hooks/use-sign-in";

type FieldErrors = Partial<Record<"name" | "email" | "password", string>>;

export function SignupForm() {
  const [values, setValues] = useState({ name: "", email: "", password: "" });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const { signInWith, error: signInError, isPending: isSigningIn } = useSignIn();

  const set = (field: keyof typeof values) => (event: { target: { value: string } }) => {
    setValues((current) => ({ ...current, [field]: event.target.value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);

    // Same schema the server validates with, so messages match.
    const parsed = registerSchema.safeParse(values);
    if (!parsed.success) {
      const errors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as keyof FieldErrors;
        errors[field] ??= issue.message;
      }
      setFieldErrors(errors);
      return;
    }

    setIsCreating(true);
    try {
      await api("/api/register", { method: "POST", json: parsed.data });
      await signInWith(parsed.data.email, parsed.data.password);
    } catch (error) {
      setFormError(messageOf(error));
    } finally {
      setIsCreating(false);
    }
  };

  const busy = isCreating || isSigningIn;
  const message = formError ?? signInError;

  return (
    <>
      <h1 className="text-[28px]">Create an account</h1>
      <p className="mt-1 text-[14px] text-muted-foreground">
        Free. You get your own conversations, dashboard and CSV uploads.
      </p>

      <form className="mt-6 space-y-4" onSubmit={onSubmit} noValidate>
        <TextField label="Name" name="name" autoComplete="name" value={values.name} onChange={set("name")} error={fieldErrors.name} />
        <TextField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          value={values.email}
          onChange={set("email")}
          error={fieldErrors.email}
        />
        <TextField
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          value={values.password}
          onChange={set("password")}
          error={fieldErrors.password}
          hint="At least 8 characters."
        />
        {message && (
          <p role="alert" className="text-[13px] text-destructive">
            {message}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {busy ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <p className="mt-6 text-[14px] text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-foreground hover:underline">
          Log in
        </Link>
      </p>
    </>
  );
}
