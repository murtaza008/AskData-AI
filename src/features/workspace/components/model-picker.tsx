"use client";

import { Cpu } from "lucide-react";
import { useModels } from "@/features/chat/hooks/use-models";
import { PROVIDERS } from "@/lib/models";

/**
 * Model switcher. Lists only models whose provider has an API key configured
 * on the server, grouped by provider.
 */
export function ModelPicker() {
  const { models, selected, select, isLoading } = useModels();

  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">AI model</span>
      <Cpu aria-hidden className="pointer-events-none absolute left-2 size-3.5 text-fg-subtle" strokeWidth={1.75} />
      <select
        value={selected ?? ""}
        onChange={(event) => select(event.target.value)}
        disabled={isLoading || models.length === 0}
        className="h-7 appearance-none rounded-sm border bg-surface py-0 pl-7 pr-3 text-[12.5px] text-fg-muted hover:border-border-strong hover:text-fg disabled:opacity-60"
      >
        {isLoading && <option value="">Loading models…</option>}
        {!isLoading && models.length === 0 && <option value="">No provider configured</option>}
        {PROVIDERS.map((provider) => {
          const group = models.filter((model) => model.provider === provider);
          if (group.length === 0) return null;
          return (
            <optgroup key={provider} label={group[0].providerLabel}>
              {group.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.label}
                </option>
              ))}
            </optgroup>
          );
        })}
      </select>
    </label>
  );
}
