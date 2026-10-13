import { type IdParams, requireUser, route } from "@/server/http";
import { deleteUpload } from "@/server/services/uploads";

export const DELETE = route(async (_request: Request, { params }: IdParams) => {
  const user = await requireUser();
  const { id } = await params;
  await deleteUpload(user.id, id);
  return Response.json({ ok: true });
});
