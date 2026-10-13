/**
 * Model catalog — isomorphic metadata only (safe for client components).
 * The actual provider clients and API keys live in src/server/ai/models.ts.
 */

export const PROVIDERS = ["google", "openai", "anthropic"] as const;
export type ProviderId = (typeof PROVIDERS)[number];

export type ModelInfo = {
  /** Stable id used by the API and stored with each answer: `provider:model`. */
  id: string;
  provider: ProviderId;
  /** Model name passed to the provider SDK. */
  model: string;
  label: string;
  providerLabel: string;
};

function entry(provider: ProviderId, providerLabel: string, model: string, label: string): ModelInfo {
  return { id: `${provider}:${model}`, provider, model, label, providerLabel };
}

// The first model listed for a provider is that provider's default.
// Gemini uses the rolling "-latest" aliases: dated ids get retired for new API
// keys, and Flash is what the free tier has quota for.
export const MODEL_CATALOG: ModelInfo[] = [
  entry("google", "Google", "gemini-flash-latest", "Gemini Flash"),
  entry("google", "Google", "gemini-flash-lite-latest", "Gemini Flash Lite"),
  entry("openai", "OpenAI", "gpt-5.4-mini", "GPT-5.4 mini"),
  entry("openai", "OpenAI", "gpt-5.5", "GPT-5.5"),
  entry("anthropic", "Anthropic", "claude-haiku-5-5", "Claude Haiku 5.5"),
  entry("anthropic", "Anthropic", "claude-sonnet-5-5", "Claude Sonnet 5.5"),
];

export function findModel(id: string | null | undefined): ModelInfo | undefined {
  return MODEL_CATALOG.find((model) => model.id === id);
}

export function modelLabel(id: string): string {
  return findModel(id)?.label ?? id;
}

/** Response of GET /api/models. */
export type ModelsResponse = {
  models: ModelInfo[];
  defaultModel: string | null;
};
