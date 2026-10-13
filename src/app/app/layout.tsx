import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppProviders } from "@/components/providers/app-providers";
import { WorkspaceShell } from "@/features/workspace/components/workspace-shell";

export const metadata: Metadata = {
  title: { default: "Workspace", template: "%s — AskData AI" },
  robots: { index: false },
};

/**
 * Signed-in workspace. Access is enforced twice: src/proxy.ts redirects
 * signed-out visitors, and every API route checks the session itself.
 * The layout is a static shell; all user data is fetched client-side.
 */
export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return (
    <AppProviders>
      <WorkspaceShell>{children}</WorkspaceShell>
    </AppProviders>
  );
}
