import bcrypt from "bcryptjs";
import { registerSchema } from "@/lib/validation/auth";
import { prisma } from "@/server/db/prisma";
import { ApiError, parseJson, route } from "@/server/http";

/** Create an account. The client signs in right after a 201. */
export const POST = route(async (request: Request) => {
  const input = await parseJson(request, registerSchema);

  const existing = await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } });
  if (existing) throw new ApiError(409, "An account with this email already exists.");

  const passwordHash = await bcrypt.hash(input.password, 10);
  await prisma.user.create({ data: { name: input.name, email: input.email, passwordHash } });

  return Response.json({ ok: true }, { status: 201 });
});
