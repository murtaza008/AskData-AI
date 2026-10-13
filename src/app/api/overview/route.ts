import { requireUser, route } from "@/server/http";
import { getOverview } from "@/server/services/overview";

/** Headline KPIs for the dashboard. */
export const GET = route(async () => {
  await requireUser();
  return Response.json(await getOverview());
});
