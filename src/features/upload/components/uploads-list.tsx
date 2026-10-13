"use client";

import { MessageSquare, Trash2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { buttonClass } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { messageOf } from "@/lib/api-client";
import { formatBytes, formatCount, formatRelative } from "@/lib/format";
import type { UploadDTO } from "@/lib/uploads/types";
import { useDeleteUpload } from "../hooks/use-uploads";

/** A ready-made first question about an uploaded table. */
function starterQuestion(upload: UploadDTO): string {
  return `Summarize the table ${upload.tableName}: how many rows are there and what are the key figures?`;
}

/** The user's uploaded tables, with expiry, a starter question, and delete. */
export function UploadsList({ uploads }: { uploads: UploadDTO[] }) {
  const deleteUpload = useDeleteUpload();

  const remove = (upload: UploadDTO) =>
    deleteUpload.mutate(upload.id, {
      onSuccess: () => toast.success(`Deleted ${upload.originalName}`),
      onError: (error) => toast.error(messageOf(error)),
    });

  if (uploads.length === 0) {
    return <p className="text-[14px] text-muted-foreground">No uploaded tables yet.</p>;
  }

  return (
    <ul className="divide-y rounded-lg border bg-card">
      {uploads.map((upload) => (
        <li key={upload.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium">{upload.originalName}</div>
            <div className="num mt-0.5 truncate text-[12px] text-muted-foreground">
              {upload.tableName} · {formatCount(upload.rowCount)} rows · {upload.columns.length} columns ·{" "}
              {formatBytes(upload.sizeBytes)}
            </div>
            <div className="mt-0.5 text-[12px] text-muted-foreground">
              Deleted automatically {formatRelative(upload.expiresAt)}
            </div>
          </div>
          <Link
            href={`/app?q=${encodeURIComponent(starterQuestion(upload))}`}
            className={buttonClass("outline", "sm")}
          >
            <MessageSquare className="size-3.5" strokeWidth={1.5} />
            Ask about it
          </Link>
          <IconButton
            label={`Delete ${upload.originalName}`}
            onClick={() => remove(upload)}
            disabled={deleteUpload.isPending}
            className="hover:text-destructive"
          >
            <Trash2 className="size-4" strokeWidth={1.5} />
          </IconButton>
        </li>
      ))}
    </ul>
  );
}
