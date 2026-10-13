import { type IdParams, requireUser, route } from "@/server/http";
import { runPin } from "@/server/services/pins";

/** Re-run a pinned chart's stored SQL (through the full safety pipeline) for fresh data. */
export const GET = route(async (_request: Request, { params }: IdParams) => {
  const user = await requireUser();
  const { id } = await params;
  return Response.json(await runPin(user.id, id));
});
