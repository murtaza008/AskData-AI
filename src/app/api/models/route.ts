import type { ModelsResponse } from "@/lib/models";
import { availableModels, defaultModel } from "@/server/ai/models";
import { requireUser, route } from "@/server/http";

/** Models the picker may offer: only providers whose API key is configured. */
export const GET = route(async () => {
  await requireUser();
  const body: ModelsResponse = { models: availableModels(), defaultModel: defaultModel()?.id ?? null };
  return Response.json(body);
});
