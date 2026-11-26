import { queryOptions } from "@tanstack/react-query";
import type { AccountDTO } from "@/lib/account";
import type { ChartSpec, QueryResult, TurnDTO } from "@/lib/agent/types";
import { api } from "@/lib/api-client";
import type { ModelsResponse } from "@/lib/models";
import { queryKeys } from "@/lib/query-keys";
import type { UploadsResponse } from "@/lib/uploads/types";

/*
 * Response shapes of the JSON API and one `queryOptions` per read endpoint.
 * Hooks, hover-prefetching and the command palette all use these, so a page's
 * data fetched on nav hover is the exact cache entry the page reads.
 * Nothing here ever calls the AI (/api/chat is a POST stream, never prefetched).
 */

export type ConversationSummary = { id: string; title: string; updatedAt: string };
export type ConversationDetail = { id: string; title: string; turns: TurnDTO[] };

export type Pin = { id: string; title: string; question: string; sql: string; chart: ChartSpec; createdAt: string };
export type PinData = QueryResult & { chart: ChartSpec; refreshedAt: string };

export type Kpi = {
  key: string;
  label: string;
  value: number;
  previous: number;
  format: "currency" | "number" | "percent";
};
export type Overview = { kpis: Kpi[]; periodLabel: string };

export type DataSourceTable = { name: string; rowCount: number; columnCount: number; isUpload: boolean };

export const q = {
  me: () => queryOptions({ queryKey: ["me"], queryFn: () => api<AccountDTO>("/api/me"), staleTime: 30_000 }),
  conversations: () =>
    queryOptions({
      queryKey: queryKeys.conversations,
      queryFn: () => api<{ conversations: ConversationSummary[] }>("/api/conversations"),
      select: (data) => data.conversations,
    }),
  pins: () =>
    queryOptions({
      queryKey: queryKeys.pins,
      queryFn: () => api<{ pins: Pin[] }>("/api/pins"),
      select: (data) => data.pins,
    }),
  overview: () =>
    queryOptions({ queryKey: queryKeys.overview, queryFn: () => api<Overview>("/api/overview"), staleTime: 60_000 }),
  uploads: () => queryOptions({ queryKey: queryKeys.uploads, queryFn: () => api<UploadsResponse>("/api/uploads") }),
  dataSource: () =>
    queryOptions({
      queryKey: queryKeys.dataSource,
      queryFn: () => api<{ tables: DataSourceTable[] }>("/api/datasource"),
      select: (data) => data.tables,
      staleTime: 5 * 60_000,
    }),
  models: () =>
    queryOptions({ queryKey: queryKeys.models, queryFn: () => api<ModelsResponse>("/api/models"), staleTime: 10 * 60_000 }),
};
