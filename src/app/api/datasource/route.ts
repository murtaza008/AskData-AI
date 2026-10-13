import { requireUser, route } from "@/server/http";
import { getDataSourceSummary } from "@/server/services/overview";

/** Tables the signed-in user can ask about (demo data + their uploads). */
export const GET = route(async () => {
  const user = await requireUser();
  return Response.json(await getDataSourceSummary(user.id));
});
