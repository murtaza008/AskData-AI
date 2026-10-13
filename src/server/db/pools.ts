import "server-only";
import { Pool } from "pg";
import { analyticsDatabaseUrl, env } from "@/server/env";

/**
 * Raw `pg` pools, kept separate from Prisma on purpose:
 *
 * - `analyticsPool` logs in as the READ-ONLY role. Every piece of SQL written
 *   by the model goes through this pool and nothing else.
 * - `ownerPool` logs in as the database owner and is used only by trusted,
 *   hand-written code that has to create/drop tables in the `uploads` schema.
 */
const globalForPools = globalThis as unknown as {
  analyticsPool?: Pool;
  ownerPool?: Pool;
};

function createPool(connectionString: string, max: number): Pool {
  const pool = new Pool({
    connectionString,
    max,
    // Opening a connection costs a TLS handshake plus (after idle periods) a
    // Neon compute wake-up, so keep idle ones around and be patient when dialing.
    idleTimeoutMillis: 60_000,
    connectionTimeoutMillis: 25_000,
  });
  // An idle client erroring (e.g. Neon suspending compute) must not crash the process.
  pool.on("error", (error) => console.error("[pg pool]", error.message));
  return pool;
}

export function analyticsPool(): Pool {
  globalForPools.analyticsPool ??= createPool(analyticsDatabaseUrl(), 5);
  return globalForPools.analyticsPool;
}

export function ownerPool(): Pool {
  globalForPools.ownerPool ??= createPool(env.databaseUrl, 3);
  return globalForPools.ownerPool;
}
