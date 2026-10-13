import "server-only";
import { unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { auth } from "@/server/auth/auth";

/** An error whose message is safe to show to the user. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export type SessionUser = { id: string; email: string; name: string; isDemo: boolean };

/**
 * Resolve the signed-in user or throw a 401. Every route handler calls this
 * first — authorization never relies on the proxy alone.
 */
export async function requireUser(): Promise<SessionUser> {
  const session = await auth();
  const user = session?.user;
  if (!user?.id) throw new ApiError(401, "You need to sign in.");
  return { id: user.id, email: user.email ?? "", name: user.name ?? "", isDemo: user.isDemo };
}

/** Parse a JSON request body against a zod schema, or throw a 400. */
export async function parseJson<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new ApiError(400, "Request body must be valid JSON.");
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues[0]?.message ?? "Invalid request.");
  }
  return parsed.data;
}

export function errorResponse(error: unknown): Response {
  if (error instanceof ApiError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  // Unexpected: log the detail, never leak it to the client.
  console.error("[api]", error);
  return Response.json({ error: "Something went wrong on our side. Please try again." }, { status: 500 });
}

/** Wrap a route handler so thrown errors become consistent JSON responses. */
export function route<Args extends unknown[]>(
  handler: (...args: Args) => Promise<Response>,
): (...args: Args) => Promise<Response> {
  return async (...args) => {
    try {
      return await handler(...args);
    } catch (error) {
      // Next.js signals "this route is dynamic" by throwing; let that through.
      unstable_rethrow(error);
      return errorResponse(error);
    }
  };
}

export type IdParams = { params: Promise<{ id: string }> };
