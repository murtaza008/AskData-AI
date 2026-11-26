"use client";

import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-frame";
import { Notice } from "@/components/ui/notice";
import { messageOf } from "@/lib/api-client";
import type { UploadColumnType } from "@/lib/uploads/types";
import { useCsvPreview } from "../hooks/use-csv-preview";
import { useCreateUpload, useUploads } from "../hooks/use-uploads";
import { CsvDropzone } from "./csv-dropzone";
import { CsvPreview } from "./csv-preview";
import { TableExplorer } from "./table-explorer";
import { UploadsList } from "./uploads-list";

/** Data page: the tables the agent can query, and CSV uploads (pick, check types, add). */
export function UploadView() {
  const uploads = useUploads();
  const limits = uploads.data?.limits;
  const { preview, error, isParsing, choose, setColumnType, reset } = useCsvPreview(limits);
  const createUpload = useCreateUpload();

  const list = uploads.data?.uploads ?? [];
  // The demo account's sample file does not count towards the limit.
  const own = list.filter((upload) => !upload.isSample).length;
  const atLimit = limits !== undefined && own >= limits.maxTables;

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
      <div className="mx-auto max-w-[1180px] px-4 py-8 sm:px-6">
        <PageHeader
          title="Data"
          description="Every table AskData can query, what each column means, and your own CSV files. Everything here is read with the same read-only rules."
        />

        <div className="mt-8">
          <TableExplorer />
        </div>

        <section aria-labelledby="upload-title" className="mt-14 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]">
          <div>
            <h2 id="upload-title" className="text-[20px]">
              Add a CSV
            </h2>
            <p className="mt-2 text-[14px] text-fg-muted">
              The file is read in your browser first, so you can check the column types before anything is sent. It
              becomes a private table that only you can query
              {limits ? `, and it is deleted after ${limits.ttlDays} days` : ""}.
            </p>
            {limits && (
              <p className="num mt-3 text-[12.5px] text-fg-muted">
                {own} of {limits.maxTables} uploads used
              </p>
            )}
          </div>

          <div className="min-w-0 space-y-4">
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
                You can keep up to {limits.maxTables} uploaded tables. Each one is deleted automatically after{" "}
                {limits.ttlDays} days.
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

            <h3 className="pt-4 text-[16px]">Your uploaded files</h3>
            {uploads.isLoading ? (
              <div className="panel h-16 animate-pulse" role="status" aria-label="Loading uploads" />
            ) : uploads.isError ? (
              <Notice tone="error" title="Your uploads couldn't be loaded">
                {messageOf(uploads.error)}
              </Notice>
            ) : (
              <UploadsList uploads={list} />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
