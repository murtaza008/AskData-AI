"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiClientError, errorMessageFrom } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { UploadColumnType, UploadDTO, UploadsResponse } from "@/lib/uploads/types";

export function useUploads() {
  return useQuery({
    queryKey: queryKeys.uploads,
    queryFn: () => api<UploadsResponse>("/api/uploads"),
  });
}

/** After an upload changes, the agent's view of the data source changes too. */
function useInvalidateUploads() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.uploads }),
      queryClient.invalidateQueries({ queryKey: queryKeys.dataSource }),
    ]);
}

export function useCreateUpload() {
  const invalidate = useInvalidateUploads();
  return useMutation({
    mutationFn: async ({ file, types }: { file: File; types: Record<string, UploadColumnType> }) => {
      const form = new FormData();
      form.append("file", file);
      form.append("types", JSON.stringify(types));
      // Let the browser set the multipart boundary header itself.
      const response = await fetch("/api/uploads", { method: "POST", body: form });
      if (!response.ok) throw new ApiClientError(response.status, await errorMessageFrom(response));
      return ((await response.json()) as { upload: UploadDTO }).upload;
    },
    onSuccess: invalidate,
  });
}

export function useDeleteUpload() {
  const invalidate = useInvalidateUploads();
  return useMutation({
    mutationFn: (id: string) => api<{ ok: true }>(`/api/uploads/${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });
}
