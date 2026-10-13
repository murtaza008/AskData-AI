import { type ReactNode, Suspense } from "react";
import { AuthShell } from "@/features/auth/components/auth-shell";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <AuthShell>
      {/* The forms read ?callbackUrl from the URL, which is request-time data. */}
      <Suspense fallback={<div className="h-[420px]" aria-hidden />}>{children}</Suspense>
    </AuthShell>
  );
}
