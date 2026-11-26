"use client";

import { useQuery } from "@tanstack/react-query";
import { q } from "@/lib/queries";

/** The signed-in account. `isDemo` is false until known, so restricted UI stays hidden while loading. */
export function useAccount() {
  const me = useQuery(q.me());
  return { account: me.data, isDemo: me.data?.isDemo ?? true, isLoading: me.isLoading };
}
