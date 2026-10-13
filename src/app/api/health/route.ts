import { connection } from "next/server";
import { availableModels } from "@/server/ai/models";
import { analyticsPool } from "@/server/db/pools";
import { prisma } from "@/server/db/prisma";

export const maxDuration = 30;

type Check = "ok" | "failed" | "missing";

async function attempt(run: () => Promise<unknown>): Promise<Check> {
  try {
    await run();
    return "ok";
  } catch (error) {
    console.error("[health]", error instanceof Error ? error.message : error);
    return "failed";
  }
}

/**
 * GET /api/health — deployment self-check.
 *
 * Open it after deploying to see which piece of configuration is wrong. It
 * reports only pass/fail per component: no values, hosts or error text ever
 * leave the server (details go to the function logs).
 */
export async function GET() {
  // Always evaluate at request time, never at build time.
  await connection();

  const [appDatabase, readOnlyRole, demoData] = await Promise.all([
    attempt(() => prisma.user.count()),
    attempt(() => analyticsPool().query("SELECT 1")),
    attempt(async () => {
      const result = await analyticsPool().query("SELECT count(*)::int AS orders FROM analytics.orders");
      if (!result.rows[0]?.orders) throw new Error("analytics.orders is empty");
    }),
  ]);

  const checks = {
    appDatabase,
    readOnlyRole,
    demoData,
    authSecret: (process.env.AUTH_SECRET ? "ok" : "missing") as Check,
    aiProvider: (availableModels().length > 0 ? "ok" : "missing") as Check,
  };
  const healthy = Object.values(checks).every((status) => status === "ok");

  return Response.json(
    { status: healthy ? "ok" : "degraded", checks },
    { status: healthy ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
