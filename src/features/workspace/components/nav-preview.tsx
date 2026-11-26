"use client";

import { type QueryClient, useQuery } from "@tanstack/react-query";
import { HoverStats, HoverTitle } from "@/components/ui/hover-card";
import { formatCount, formatRelative, formatValue } from "@/lib/format";
import { q } from "@/lib/queries";
import type { NavItem } from "../nav";

/** Data each page needs first, fetched on nav hover so the page opens with it. Never anything that calls the AI. */
export function prefetchPageData(queryClient: QueryClient, href: string) {
  const byPage: Record<string, (() => Promise<unknown>)[]> = {
    "/app": [() => queryClient.prefetchQuery(q.dataSource()), () => queryClient.prefetchQuery(q.models())],
    "/app/history": [() => queryClient.prefetchQuery(q.conversations())],
    "/app/dashboard": [() => queryClient.prefetchQuery(q.overview()), () => queryClient.prefetchQuery(q.pins())],
    "/app/upload": [() => queryClient.prefetchQuery(q.uploads()), () => queryClient.prefetchQuery(q.dataSource())],
  };
  for (const run of byPage[href] ?? []) void run();
}

const dash = "–";

function AskPreview() {
  const me = useQuery(q.me());
  const tables = useQuery(q.dataSource());
  const usage = me.data?.usage;
  const orders = tables.data?.find((table) => table.name === "orders");
  return (
    <HoverStats
      rows={[
        {
          label: "Questions, last 24 h",
          value: usage ? `${usage.questionsLast24h}${usage.dailyLimit ? ` of ${usage.dailyLimit}` : ""}` : dash,
        },
        { label: "Tables it can query", value: tables.data ? tables.data.length : dash },
        { label: "Orders in the data", value: orders ? formatCount(orders.rowCount) : dash },
      ]}
    />
  );
}

function HistoryPreview() {
  const conversations = useQuery(q.conversations());
  const latest = conversations.data?.[0];
  return (
    <>
      <HoverStats
        rows={[
          { label: "Conversations", value: conversations.data ? conversations.data.length : dash },
          { label: "Last activity", value: latest ? formatRelative(latest.updatedAt) : dash },
        ]}
      />
      {latest && <p className="mt-3 line-clamp-2 border-t pt-3 text-fg-muted">“{latest.title}”</p>}
    </>
  );
}

function DashboardPreview() {
  const overview = useQuery(q.overview());
  const pins = useQuery(q.pins());
  const revenue = overview.data?.kpis.find((kpi) => kpi.key === "revenue");
  const orders = overview.data?.kpis.find((kpi) => kpi.key === "orders");
  return (
    <HoverStats
      rows={[
        { label: "Revenue, last 30 days", value: revenue ? formatValue(revenue.value, "currency") : dash },
        { label: "Orders, last 30 days", value: orders ? formatCount(orders.value) : dash },
        { label: "Pinned charts", value: pins.data ? pins.data.length : dash },
      ]}
    />
  );
}

function DataPreview() {
  const uploads = useQuery(q.uploads());
  const tables = useQuery(q.dataSource());
  const own = uploads.data?.uploads.filter((upload) => !upload.isSample) ?? [];
  const nextExpiry = own.map((upload) => upload.expiresAt).sort()[0];
  return (
    <HoverStats
      rows={[
        { label: "Demo store tables", value: tables.data ? tables.data.filter((t) => !t.isUpload).length : dash },
        { label: "Uploaded tables", value: tables.data ? tables.data.filter((t) => t.isUpload).length : dash },
        {
          label: "Next upload expires",
          value: uploads.data ? (nextExpiry ? formatRelative(nextExpiry) : "none") : dash,
        },
      ]}
    />
  );
}

const PREVIEWS: Record<string, () => React.JSX.Element> = {
  "/app": AskPreview,
  "/app/history": HistoryPreview,
  "/app/dashboard": DashboardPreview,
  "/app/upload": DataPreview,
};

/** Hover card body for a nav item: what the page is for, with live counts. */
export function NavPreview({ item }: { item: NavItem }) {
  const Preview = PREVIEWS[item.href];
  return (
    <div>
      <HoverTitle meta={item.group}>{item.label}</HoverTitle>
      <p className="mt-1 text-fg-muted">{item.description}</p>
      {Preview && <Preview />}
    </div>
  );
}
