"use client";

import Link from "next/link";
import { Button, buttonClass } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";

/** Error boundary for the workspace: a render failure never blanks the whole app. */
export default function WorkspaceError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto w-full max-w-[640px] px-4 py-16">
      <h1 className="text-[26px]">Something went wrong on this page</h1>
      <Notice
        tone="error"
        title="The page stopped while drawing"
        className="mt-5"
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={reset}>
              Try again
            </Button>
            <Link href="/app" className={buttonClass("ghost", "sm")}>
              Go to Ask
            </Link>
          </div>
        }
      >
        Your conversations and pinned charts are stored on the server and are not affected. Trying again usually fixes it.
      </Notice>
    </div>
  );
}
