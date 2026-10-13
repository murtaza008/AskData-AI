import { env } from "@/server/env";
import { ApiError, route } from "@/server/http";
import { cleanupExpiredUploads } from "@/server/services/uploads";

/**
 * Daily clean-up of expired CSV uploads (scheduled in vercel.json).
 * Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`; anything else is refused.
 */
export const GET = route(async (request: Request) => {
  const secret = env.cronSecret;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    throw new ApiError(401, "Unauthorized.");
  }
  return Response.json({ removed: await cleanupExpiredUploads() });
});
