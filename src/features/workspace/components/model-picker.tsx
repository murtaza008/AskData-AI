"use client";

import { useModels } from "@/features/chat/hooks/use-models";
import { PROVIDERS } from "@/lib/models";

/**
 * Model switcher. Lists only models whose provider has an API key configured
 * on the server, grouped by provider.
 */
export function ModelPicker() {
  const { models, selected, select, isLoading } = useModels();

  return (
    <label className="block">
      <span className="label-caps mb-1 block">Model</span>
      <select
        value={selected ?? ""}
        onChange={(event) => select(event.target.value)}
        disabled={isLoading || models.length === 0}
        className="w-full rounded-md border bg-card px-2 py-1.5 text-[13px] disabled:opacity-60"
      >
        {isLoading && <option value="">Loading…</option>}
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
