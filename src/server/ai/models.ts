import "server-only";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import { findModel, MODEL_CATALOG, type ModelInfo, PROVIDERS, type ProviderId } from "@/lib/models";

/**
 * Provider registry. API keys are read here, on the server, and never leave:
 * the client only ever sees model ids and labels.
 */

const API_KEY_ENV: Record<ProviderId, string> = {
  google: "GOOGLE_GENERATIVE_AI_API_KEY",
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
};

function apiKey(provider: ProviderId): string | undefined {
  return process.env[API_KEY_ENV[provider]] || undefined;
}

export class AiNotConfiguredError extends Error {
  constructor() {
    super(
      "No AI provider is configured. Add a free GOOGLE_GENERATIVE_AI_API_KEY from aistudio.google.com/apikey to .env.",
    );
    this.name = "AiNotConfiguredError";
  }
}

/** Models whose provider has an API key — this is what the picker shows. */
export function availableModels(): ModelInfo[] {
  return MODEL_CATALOG.filter((model) => apiKey(model.provider));
}

/** Default model: the AI_PROVIDER env var if usable, else the first configured provider. */
export function defaultModel(): ModelInfo | null {
  const models = availableModels();
  const preferred = (process.env.AI_PROVIDER ?? "google").toLowerCase();
  const provider = PROVIDERS.find((id) => id === preferred);
  return models.find((model) => model.provider === provider) ?? models[0] ?? null;
}

/**
 * Resolve the model for a request. An unknown or unconfigured id silently
 * falls back to the default, so a stale picker value can never break a chat.
 */
export function resolveModel(requestedId?: string | null): { info: ModelInfo; model: LanguageModel } {
  const requested = findModel(requestedId);
  const info = requested && apiKey(requested.provider) ? requested : defaultModel();
  if (!info) throw new AiNotConfiguredError();

  const key = apiKey(info.provider);
  switch (info.provider) {
    case "google":
      return { info, model: createGoogleGenerativeAI({ apiKey: key })(info.model) };
    case "openai":
      return { info, model: createOpenAI({ apiKey: key })(info.model) };
    case "anthropic":
      return { info, model: createAnthropic({ apiKey: key })(info.model) };
  }
}

/** True for "try again shortly" failures: provider overloaded or rate limited. */
export function isOverloadError(error: unknown): boolean {
  const lower = (error instanceof Error ? error.message : String(error)).toLowerCase();
  return ["overloaded", "high demand", "unavailable", "503", "429", "quota", "rate limit", "resource_exhausted"].some(
    (marker) => lower.includes(marker),
  );
}

/**
 * A second model from the same provider to fall back on when the first is
 * overloaded (for Gemini: Flash → Flash Lite, which has its own quota).
 */
export function resolveFallbackModel(currentId: string): { info: ModelInfo; model: LanguageModel } | null {
  const current = findModel(currentId);
  if (!current) return null;
  const other = availableModels().find((model) => model.provider === current.provider && model.id !== current.id);
  return other ? resolveModel(other.id) : null;
}

/** Turn a provider failure into something worth showing a user. */
export function describeModelError(error: unknown): string {
  if (error instanceof AiNotConfiguredError) return error.message;
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();

  if (lower.includes("429") || lower.includes("quota") || lower.includes("rate limit") || lower.includes("resource_exhausted")) {
    return "The AI provider's rate limit was reached (the free tier allows only a few requests per minute). Wait a moment and ask again.";
  }
  if (lower.includes("api key") || lower.includes("401") || lower.includes("403") || lower.includes("permission")) {
    return "The AI provider rejected the API key. Check the key in your environment variables.";
  }
  if (lower.includes("overloaded") || lower.includes("high demand") || lower.includes("503") || lower.includes("unavailable")) {
    return "The AI provider is temporarily overloaded. Please try again in a few seconds.";
  }
  if (lower.includes("timeout") || lower.includes("timed out")) {
    return "The AI model took too long to respond (free-tier models get slow at busy times). Please try again.";
  }
  if (lower.includes("abort")) return "The request was cancelled.";
  return `The AI model call failed: ${message.slice(0, 240)}`;
}
