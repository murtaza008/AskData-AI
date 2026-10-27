"use client";

import { toast } from "sonner";
import { Notice } from "@/components/ui/notice";
import { messageOf } from "@/lib/api-client";
import type { UploadColumnType } from "@/lib/uploads/types";
import { useCsvPreview } from "../hooks/use-csv-preview";
import { useCreateUpload, useUploads } from "../hooks/use-uploads";
import { CsvDropzone } from "./csv-dropzone";
import { CsvPreview } from "./csv-preview";
import { UploadsList } from "./uploads-list";

/** Upload page: pick a CSV, confirm detected types, and manage uploaded tables. */
export function UploadView() {
  const uploads = useUploads();
  const limits = uploads.data?.limits;
  const { preview, error, isParsing, choose, setColumnType, reset } = useCsvPreview(limits);
  const createUpload = useCreateUpload();

  const list = uploads.data?.uploads ?? [];
  // The demo account's sample file does not count towards the limit.
  const atLimit = limits !== undefined && list.filter((upload) => !upload.isSample).length >= limits.maxTables;

  const confirm = () => {
    if (!preview) return;
    const types: Record<string, UploadColumnType> = Object.fromEntries(
      preview.columns.map((column) => [column.name, column.type]),
    );
    createUpload.mutate(
      { file: preview.file, types },
      {
        onSuccess: (upload) => {
          toast.success(`Table ${upload.tableName} added · ${upload.rowCount.toLocaleString("en-US")} rows`);
          reset();
        },
      },
    );
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-[1000px] px-4 py-8 sm:px-6">
        <h1 className="text-[28px]">Upload data</h1>
        <p className="mt-1 max-w-[62ch] text-[14px] text-muted-foreground">
          Add a CSV as a private table and ask questions about it. Uploaded tables are visible only to you, are queried
          with the same read-only safety rules as the demo data
          {limits ? `, and are deleted after ${limits.ttlDays} days` : ""}.
        </p>

        <div className="mt-8 space-y-4">
          {(error || createUpload.isError) && (
            <Notice tone="error" title="That file couldn't be used">
              {error ?? messageOf(createUpload.error)}
            </Notice>
          )}

          {preview ? (
            <CsvPreview
              preview={preview}
              onTypeChange={(name, type) => {
                createUpload.reset();
                setColumnType(name, type);
              }}
              onCancel={() => {
                createUpload.reset();
                reset();
              }}
              onConfirm={confirm}
              isUploading={createUpload.isPending}
            />
          ) : atLimit ? (
            <Notice title="Upload limit reached">
              You can keep up to {limits.maxTables} uploaded tables. Delete one below to add another.
            </Notice>
          ) : (
            <CsvDropzone
              onFile={(file) => {
                createUpload.reset();
                void choose(file);
              }}
              isParsing={isParsing}
              limits={limits}
              disabled={uploads.isLoading}
            />
          )}
        </div>

        <h2 className="mb-3 mt-12 text-[20px]">Your tables</h2>
        {uploads.isLoading ? (
          <div className="h-16 animate-pulse rounded-lg border bg-card" aria-hidden />
        ) : uploads.isError ? (
          <Notice tone="error" title="Your uploads couldn't be loaded">
            {messageOf(uploads.error)}
          </Notice>
        ) : (
          <UploadsList uploads={list} />
        )}
      </div>
    </div>
  );
}
