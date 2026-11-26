"use client";

import { useQuery } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/layout/page-frame";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { ModelPicker } from "@/features/workspace/components/model-picker";
import { useAccount } from "@/lib/hooks/use-account";
import { q } from "@/lib/queries";

function Row({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="grid gap-2 px-5 py-4 sm:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] sm:items-center sm:gap-6">
      <div>
        <p className="text-[14px] font-medium text-fg">{label}</p>
        {hint && <p className="mt-0.5 text-[13px] text-fg-muted">{hint}</p>}
      </div>
      <div className="min-w-0 text-[14px] text-fg">{children}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="panel divide-y">
      <h2 className="px-5 py-3 text-[16px]">{title}</h2>
      {children}
    </section>
  );
}

/** Account, preferences, usage and the data you have stored: all read from the API, nothing invented. */
export function SettingsView() {
  const { account, isLoading } = useAccount();
  const conversations = useQuery(q.conversations());
  const pins = useQuery(q.pins());
  const uploads = useQuery(q.uploads());
  const own = uploads.data?.uploads.filter((upload) => !upload.isSample) ?? [];
  const dash = "–";

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-[860px] px-4 py-8 sm:px-6">
        <PageHeader title="Settings" description="Your account, how AskData answers, and the data you have stored." className="mb-8" />
        <div className="space-y-5">
          <Section title="Account">
            <Row label="Name">{isLoading ? dash : account?.name}</Row>
            <Row label="Email">
              <span className="num">{isLoading ? dash : account?.email}</span>
            </Row>
            {account?.isDemo && (
              <Row label="Shared demo account" hint="Everyone who tries the demo uses this account.">
                Deleting, renaming and unpinning are turned off so the examples stay in place.{" "}
                <Link href="/signup" className="font-medium underline underline-offset-2">
                  Create your own account
                </Link>{" "}
                to manage your data.
              </Row>
            )}
          </Section>

          <Section title="Answers">
            <Row label="Model" hint="Used for new questions. Only providers with a configured API key are listed.">
              <ModelPicker />
            </Row>
            <Row
              label="If the model is busy"
              hint="The main model gets about 10 seconds per step. If it times out or is rate limited, the same question goes to a lighter model from the same provider."
            >
              Automatic; the answer shows when the fallback model was used.
            </Row>
            <Row label="Questions in the last 24 hours">
              <span className="num">
                {account
                  ? `${account.usage.questionsLast24h}${account.usage.dailyLimit ? ` of ${account.usage.dailyLimit} (demo limit)` : ""}`
                  : dash}
              </span>
            </Row>
          </Section>

          <Section title="Appearance">
            <Row label="Theme" hint="System follows your device's light or dark setting.">
              <ThemeToggle />
            </Row>
          </Section>

          <Section title="Your data">
            <Row label="Conversations">
              <Link href="/app/history" className="num underline underline-offset-2">
                {conversations.data ? conversations.data.length : dash}
              </Link>
            </Row>
            <Row label="Pinned charts" hint="Each re-runs its SQL when the dashboard opens.">
              <Link href="/app/dashboard" className="num underline underline-offset-2">
                {pins.data ? pins.data.length : dash}
              </Link>
            </Row>
            <Row
              label="Uploaded CSV files"
              hint={uploads.data ? `Up to ${uploads.data.limits.maxTables}, each deleted after ${uploads.data.limits.ttlDays} days.` : undefined}
            >
              <Link href="/app/upload" className="num underline underline-offset-2">
                {uploads.data ? own.length : dash}
              </Link>
            </Row>
          </Section>

          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={() => void signOut({ redirectTo: "/" })}>
              <LogOut aria-hidden className="size-4" />
              Sign out
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
