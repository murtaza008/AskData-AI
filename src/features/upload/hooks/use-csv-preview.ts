"use client";

import Papa from "papaparse";
import { useCallback, useState } from "react";
import { inferColumns } from "@/lib/uploads/infer";
import type { UploadColumn, UploadColumnType, UploadLimits } from "@/lib/uploads/types";

export type CsvPreview = {
  file: File;
  columns: UploadColumn[];
  /** First rows, for display. */
  sampleRows: string[][];
  rowCount: number;
};

const SAMPLE_ROWS = 8;

function parseFile(file: File): Promise<string[][]> {
  return new Promise((resolve, reject) => {
    Papa.parse<string[]>(file, {
      skipEmptyLines: "greedy",
      complete: (result) => resolve(result.data),
      error: (error) => reject(error),
    });
  });
}

/**
 * Parses a chosen CSV in the browser and infers column types with the same
 * code the server uses, so the preview shows exactly what will be created.
 * Nothing is uploaded until the user confirms.
 */
export function useCsvPreview(limits: UploadLimits | undefined) {
  const [preview, setPreview] = useState<CsvPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);

  const choose = useCallback(
    async (file: File) => {
      setError(null);
      setPreview(null);

      if (!/\.(csv|tsv|txt)$/i.test(file.name)) return setError("Only .csv files are supported.");
      if (file.size === 0) return setError("The file is empty.");
      if (limits && file.size > limits.maxBytes) {
        return setError(`The file is too large. The limit is ${Math.round(limits.maxBytes / 1024 / 1024)} MB.`);
      }

      setIsParsing(true);
      try {
        const [headers, ...rows] = await parseFile(file);
        if (!headers || rows.length === 0) return setError("The file needs a header row and at least one data row.");
        if (limits && headers.length > limits.maxColumns) {
          return setError(`Too many columns (${headers.length}). The limit is ${limits.maxColumns}.`);
        }
        if (limits && rows.length > limits.maxRows) {
          return setError(`Too many rows (${rows.length.toLocaleString("en-US")}). The limit is ${limits.maxRows.toLocaleString("en-US")}.`);
        }
        setPreview({
          file,
          columns: inferColumns(headers.map(String), rows),
          sampleRows: rows.slice(0, SAMPLE_ROWS),
          rowCount: rows.length,
        });
      } catch {
        setError("The file could not be read as CSV.");
      } finally {
        setIsParsing(false);
      }
    },
    [limits],
  );

  const setColumnType = useCallback((name: string, type: UploadColumnType) => {
    setPreview((current) =>
      current
        ? { ...current, columns: current.columns.map((column) => (column.name === name ? { ...column, type } : column)) }
        : current,
    );
  }, []);

  const reset = useCallback(() => {
    setPreview(null);
    setError(null);
  }, []);

  return { preview, error, isParsing, choose, setColumnType, reset };
}
