import type { Metadata } from "next";
import { PageFrame } from "@/components/layout/page-frame";
import { DashboardView } from "@/features/dashboard/components/dashboard-view";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <PageFrame>
      <DashboardView />
    </PageFrame>
  );
}
