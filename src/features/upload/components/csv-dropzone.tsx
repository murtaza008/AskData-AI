"use client";

import { UploadCloud } from "lucide-react";
import { type DragEvent, useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import type { UploadLimits } from "@/lib/uploads/types";
import { cn } from "@/lib/utils";

type CsvDropzoneProps = {
  onFile: (file: File) => void;
  isParsing: boolean;
  limits?: UploadLimits;
  disabled?: boolean;
};

/** Drag-and-drop (or click-to-browse) target for a CSV file. */
export function CsvDropzone({ onFile, isParsing, limits, disabled }: CsvDropzoneProps) {
  const [dragging, setDragging] = useState(false);

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file && !disabled) onFile(file);
  };

  return (
    <label
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-14 text-center transition-colors",
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:border-primary",
        dragging ? "border-primary bg-card" : "bg-card/50",
        // The real input is visually hidden; show its focus ring on the label.
        "focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring",
      )}
    >
      {isParsing ? <Spinner className="size-5" /> : <UploadCloud className="size-6 text-muted-foreground" strokeWidth={1.5} />}
      <p className="mt-3 text-[15px]">
        {isParsing ? (
          "Reading file…"
        ) : (
          <>
            Drop a CSV file here, or <span className="font-medium underline underline-offset-2">browse</span>
          </>
        )}
      </p>
      {limits && (
        <p className="num mt-2 text-[12px] text-muted-foreground">
          .csv · header row required · max {Math.round(limits.maxBytes / 1024 / 1024)} MB ·{" "}
          {limits.maxRows.toLocaleString("en-US")} rows
        </p>
      )}
      <input
        type="file"
        accept=".csv,.tsv,.txt,text/csv"
        className="sr-only"
        disabled={disabled || isParsing}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFile(file);
          event.target.value = ""; // allow choosing the same file again
        }}
      />
    </label>
  );
}
