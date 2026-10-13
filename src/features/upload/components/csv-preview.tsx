"use client";

import { FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { formatBytes, formatCount } from "@/lib/format";
import type { UploadColumnType } from "@/lib/uploads/types";
import type { CsvPreview as CsvPreviewState } from "../hooks/use-csv-preview";
import { CsvPreviewTable } from "./csv-preview-table";

type CsvPreviewProps = {
  preview: CsvPreviewState;
  onTypeChange: (name: string, type: UploadColumnType) => void;
  onCancel: () => void;
  onConfirm: () => void;
  isUploading: boolean;
};

/** Confirmation step: check detected columns and types before the table is created. */
export function CsvPreview({ preview, onTypeChange, onCancel, onConfirm, isUploading }: CsvPreviewProps) {
  const { file, columns, sampleRows, rowCount } = preview;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-md border bg-card px-4 py-3">
        <FileText className="size-4 shrink-0" strokeWidth={1.5} />
        <span className="min-w-0 truncate font-medium">{file.name}</span>
        <span className="num text-[12px] text-muted-foreground">
          {formatCount(rowCount)} rows · {columns.length} columns · {formatBytes(file.size)}
        </span>
        <IconButton label="Remove file" className="ml-auto" onClick={onCancel} disabled={isUploading}>
          <X className="size-4" />
        </IconButton>
      </div>

      <section className="rounded-lg border bg-card">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5">
          <h2 className="text-[15px]">Preview · first {sampleRows.length} rows</h2>
          <span className="text-[12px] text-muted-foreground">Types were detected automatically. Change any that look wrong.</span>
        </header>
        <CsvPreviewTable columns={columns} rows={sampleRows} onTypeChange={onTypeChange} disabled={isUploading} />
      </section>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel} disabled={isUploading}>
          Cancel
        </Button>
        <Button onClick={onConfirm} disabled={isUploading}>
          {isUploading ? "Creating table…" : "Add as table"}
        </Button>
      </div>
    </div>
  );
}
