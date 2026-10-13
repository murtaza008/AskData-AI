import { requireUser, route } from "@/server/http";
import { listConversations } from "@/server/services/conversations";

export const GET = route(async () => {
  const user = await requireUser();
  return Response.json({ conversations: await listConversations(user.id) });
});
