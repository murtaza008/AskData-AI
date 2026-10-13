"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { useTheme } from "next-themes";
import { type ReactNode, useState } from "react";
import { Toaster } from "sonner";
import { ApiClientError } from "@/lib/api-client";

function ThemedToaster() {
  const { resolvedTheme } = useTheme();
  return (
    <Toaster
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      position="bottom-right"
      toastOptions={{
        style: {
          background: "var(--popover)",
          color: "var(--foreground)",
          border: "1px solid var(--border)",
          borderRadius: "4px",
          fontFamily: "var(--font-sans)",
        },
      }}
    />
  );
}

/** Client-side providers for the signed-in workspace: data fetching, session, toasts. */
export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            // Retrying a 4xx (not found, unauthorized, validation) never helps.
            retry: (failureCount, error) =>
              !(error instanceof ApiClientError && error.status < 500) && failureCount < 2,
          },
        },
      }),
  );

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        {children}
        <ThemedToaster />
      </QueryClientProvider>
    </SessionProvider>
  );
}
