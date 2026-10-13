"use client";

import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";

/** Error boundary for the workspace: a render failure never blanks the whole app. */
export default function WorkspaceError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto w-full max-w-[640px] px-4 py-16">
      <Notice
        tone="error"
        title="Something went wrong on this page"
        action={
          <Button variant="outline" size="sm" onClick={reset}>
            Try again
          </Button>
        }
      >
        Your data is safe. Reloading usually fixes it.
      </Notice>
    </div>
  );
}
