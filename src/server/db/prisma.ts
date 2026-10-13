import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * App database client (users, conversations, pinned charts, upload metadata).
 *
 * Uses the OWNER connection. This client is never handed to the agent — model
 * generated SQL only ever runs through `analyticsPool` (read-only role).
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    // Same reasoning as the pg pools: dialing Neon can take several seconds.
    idleTimeoutMillis: 60_000,
    connectionTimeoutMillis: 25_000,
  });
  return new PrismaClient({ adapter, transactionOptions: { maxWait: 20_000, timeout: 20_000 } });
}

export const prisma = globalForPrisma.prisma ?? createClient();

// Reuse one client across hot reloads in development.
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
