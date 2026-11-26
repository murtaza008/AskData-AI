"use client";

import { useEffect, useMemo, useState } from "react";
import { inferColumns } from "@/lib/uploads/infer";
import type { UploadColumnType } from "@/lib/uploads/types";
import { cn } from "@/lib/utils";

/*
 * Runs the upload page's real type inference (src/lib/uploads/infer.ts, the
 * same code the server uses to create the table) on the first lines of the
 * demo account's sample file, scripts/demo-data/marketing_spend.csv.
 */

const SAMPLE = `week_start,channel,campaign,spend,clicks,conversions
2026-04-06,Google Ads,Brand Search,945.98,921,43
2026-04-06,Meta Ads,Retargeting,832.08,1228,45
2026-04-06,Email,Weekly Newsletter,200.79,890,79
2026-04-06,Influencers,Creator Collabs,1462.28,1167,25`;

const TONE: Record<UploadColumnType, string> = {
  text: "text-fg-muted",
  number: "text-accent-text",
  date: "text-sql-number",
  boolean: "text-sql-fn",
};

type Parse = (text: string) => string[][];

export function InferDemo() {
  const [text, setText] = useState(SAMPLE);
  const [parse, setParse] = useState<Parse | null>(null);

  // papaparse is the same CSV parser the upload page uses; load it on demand.
  useEffect(() => {
    let alive = true;
    void import("papaparse").then(({ default: Papa }) => {
      if (alive) setParse(() => (input: string) => Papa.parse<string[]>(input, { skipEmptyLines: "greedy" }).data);
    });
    return () => {
      alive = false;
    };
  }, []);

  const columns = useMemo(() => {
    if (!parse) return null;
    const [headers, ...rows] = parse(text);
    if (!headers || rows.length === 0) return [];
    return inferColumns(headers.map(String), rows);
  }, [parse, text]);

  return (
    <div className="flex h-full flex-col">
      <label className="block">
        <span className="eyebrow">CSV (edit it)</span>
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          spellCheck={false}
          rows={5}
          className="mt-1.5 w-full resize-y whitespace-pre rounded-md border bg-sunken px-3 py-2.5 font-mono text-[12px] leading-relaxed text-fg focus:border-accent focus:outline-none"
        />
      </label>
      <div role="status" aria-live="polite" className="mt-3">
        {columns === null ? (
          <p className="text-[13px] text-fg-muted">Loading…</p>
        ) : columns.length === 0 ? (
          <p className="text-[13px] text-fg-muted">Add a header row and at least one data row.</p>
        ) : (
          <table className="w-full text-[12.5px]">
            <caption className="sr-only">Detected columns</caption>
            <thead>
              <tr className="text-left">
                <th scope="col" className="eyebrow pb-1.5 font-medium">
                  Column
                </th>
                <th scope="col" className="eyebrow pb-1.5 text-right font-medium">
                  Detected type
                </th>
              </tr>
            </thead>
            <tbody>
              {columns.map((column) => (
                <tr key={column.name} className="border-t">
                  <td className="py-1.5 font-mono text-fg">{column.name}</td>
                  <td className={cn("py-1.5 text-right font-mono font-medium", TONE[column.type])}>{column.type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
