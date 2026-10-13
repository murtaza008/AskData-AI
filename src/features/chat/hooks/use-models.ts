"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useSyncExternalStore } from "react";
import { api } from "@/lib/api-client";
import type { ModelsResponse } from "@/lib/models";
import { queryKeys } from "@/lib/query-keys";

const STORAGE_KEY = "askdata:model";
const CHANGE_EVENT = "askdata:model-change";

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function readStored(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null; // storage can be unavailable (private mode, blocked cookies)
  }
}

/**
 * Models the server can actually use (providers with an API key), plus the
 * user's pick, remembered in localStorage and shared across components.
 */
export function useModels() {
  const query = useQuery({
    queryKey: queryKeys.models,
    queryFn: () => api<ModelsResponse>("/api/models"),
    staleTime: 10 * 60_000,
  });

  const stored = useSyncExternalStore(subscribe, readStored, () => null);
  const models = query.data?.models ?? [];
  // Ignore a remembered model that is no longer offered.
  const selected = models.find((model) => model.id === stored)?.id ?? query.data?.defaultModel ?? null;

  const select = useCallback((id: string) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // not persisted, but the event below still updates this tab
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return { models, selected, select, isLoading: query.isLoading, isConfigured: query.isLoading || models.length > 0 };
}
