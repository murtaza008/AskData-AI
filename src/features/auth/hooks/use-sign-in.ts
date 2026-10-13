"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { safeCallbackUrl } from "../lib/callback-url";

/** Credentials sign-in with error state, then a redirect to the intended page. */
export function useSignIn() {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const signInWith = useCallback(
    async (email: string, password: string) => {
      setError(null);
      setIsPending(true);
      try {
        const result = await signIn("credentials", { email, password, redirect: false });
        if (!result || result.error) {
          setError(
            result?.error === "CredentialsSignin"
              ? "That email and password don't match an account."
              : "Sign-in is unavailable right now. Check that the database is set up and try again.",
          );
          setIsPending(false);
          return false;
        }
        // Full navigation so the new session cookie is used by the proxy and the server.
        window.location.assign(safeCallbackUrl(searchParams.get("callbackUrl"), window.location.origin));
        return true;
      } catch {
        setError("Couldn't reach the server. Check your connection and try again.");
        setIsPending(false);
        return false;
      }
    },
    [searchParams],
  );

  return { signInWith, error, isPending, clearError: () => setError(null) };
}
