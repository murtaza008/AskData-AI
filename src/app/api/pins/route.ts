import { z } from "zod";
import { CHART_TYPES, VALUE_FORMATS } from "@/lib/agent/types";
import { parseJson, requireUser, route } from "@/server/http";
import { createPin, listPins } from "@/server/services/pins";

const createSchema = z.object({
  title: z.string().trim().min(1).max(120),
  question: z.string().trim().min(1).max(500),
  sql: z.string().trim().min(1).max(8000),
  chart: z.object({
    type: z.enum(CHART_TYPES),
    x: z.string().max(100),
    y: z.string().max(100),
    title: z.string().max(160),
    yFormat: z.enum(VALUE_FORMATS),
  }),
});

export const GET = route(async () => {
  const user = await requireUser();
  return Response.json({ pins: await listPins(user.id) });
});

export const POST = route(async (request: Request) => {
  const user = await requireUser();
  const input = await parseJson(request, createSchema);
  return Response.json({ pin: await createPin(user.id, input) }, { status: 201 });
});
