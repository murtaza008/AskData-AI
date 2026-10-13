import "dotenv/config";
import { Client } from "pg";

/** Role the agent connects as. Must match READONLY_ROLE in src/server/env.ts. */
export const READONLY_ROLE = "askdata_readonly";

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`\n✖ ${name} is not set. Fill it in .env (see .env.example) and run again.\n`);
    process.exit(1);
  }
  return value;
}

/**
 * Owner connection for setup work. DDL should not go through Neon's
 * transaction pooler, so prefer DIRECT_URL and otherwise derive the direct
 * host from the pooled one.
 */
export function ownerUrl(): string {
  return process.env.DIRECT_URL || requireEnv("DATABASE_URL").replace("-pooler.", ".");
}

/** The read-only role's connection string, as the app will use it. */
export function readonlyUrl(): string {
  if (process.env.ANALYTICS_DATABASE_URL) return process.env.ANALYTICS_DATABASE_URL;
  const url = new URL(requireEnv("DATABASE_URL"));
  url.username = READONLY_ROLE;
  url.password = requireEnv("ANALYTICS_ROLE_PASSWORD");
  return url.toString();
}

export async function connect(connectionString: string): Promise<Client> {
  const client = new Client({ connectionString, connectionTimeoutMillis: 15_000 });
  await client.connect();
  return client;
}

/** Quote a string as a SQL literal (for DDL that cannot take bind parameters). */
export function literal(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}
