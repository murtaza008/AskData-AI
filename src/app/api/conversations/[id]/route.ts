import { z } from "zod";
import { type IdParams, parseJson, requireUser, route } from "@/server/http";
import { deleteConversation, getConversation, renameConversation } from "@/server/services/conversations";

const renameSchema = z.object({ title: z.string().trim().min(1, "Enter a title").max(120) });

export const GET = route(async (_request: Request, { params }: IdParams) => {
  const user = await requireUser();
  const { id } = await params;
  return Response.json(await getConversation(user.id, id));
});

export const PATCH = route(async (request: Request, { params }: IdParams) => {
  const user = await requireUser();
  const { id } = await params;
  const { title } = await parseJson(request, renameSchema);
  await renameConversation(user.id, id, title);
  return Response.json({ ok: true });
});

export const DELETE = route(async (_request: Request, { params }: IdParams) => {
  const user = await requireUser();
  const { id } = await params;
  await deleteConversation(user.id, id);
  return Response.json({ ok: true });
});
