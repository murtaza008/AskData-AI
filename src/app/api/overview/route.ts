import { parsePeriod } from "@/lib/overview";
import { ApiError, requireUser, route } from "@/server/http";
import { getDashboard } from "@/server/services/dashboard";

/**
 * Dashboard figures for the last `days` days of data (7, 30 or 90; default 30),
 * compared with the same number of days before. The demo dataset is shared
 * and read-only, so every signed-in user sees the same store figures.
 */
export const GET = route(async (request: Request) => {
  await requireUser();
  const days = parsePeriod(new URL(request.url).searchParams.get("days"));
  if (days === null) throw new ApiError(400, "days must be 7, 30 or 90.");
  return Response.json(await getDashboard(days));
});
