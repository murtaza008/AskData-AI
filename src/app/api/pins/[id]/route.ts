import { forbidInDemo, type IdParams, requireUser, route } from "@/server/http";
import { deletePin } from "@/server/services/pins";

export const DELETE = route(async (_request: Request, { params }: IdParams) => {
  const user = await requireUser();
  forbidInDemo(user, "unpin charts");
  const { id } = await params;
  await deletePin(user.id, id);
  return Response.json({ ok: true });
});
