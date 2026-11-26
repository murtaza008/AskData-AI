import type { Metadata } from "next";
import { PageFrame } from "@/components/layout/page-frame";
import { SettingsView } from "@/features/settings/settings-view";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <PageFrame>
      <SettingsView />
    </PageFrame>
  );
}
