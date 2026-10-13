import "server-only";

/**
 * Server-side configuration, read lazily so `next build` works before the
 * environment is filled in. Nothing in this file may be imported by client code
 * (the `server-only` import turns that into a build error).
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable ${name}. See .env.example.`);
  }
  return value;
}

function int(name: string, fallback: number, min: number, max: number): number {
  const parsed = Number.parseInt(process.env[name] ?? "", 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

/** Name of the Postgres role the agent connects as. Created by `npm run db:setup`. */
export const READONLY_ROLE = "askdata_readonly";

/**
 * Connection string for the read-only analytics role.
 *
 * Explicit `ANALYTICS_DATABASE_URL` wins. Otherwise it is derived from the
 * owner URL by swapping in the read-only role's credentials, so a local setup
 * only needs DATABASE_URL + ANALYTICS_ROLE_PASSWORD.
 */
export function analyticsDatabaseUrl(): string {
  const explicit = process.env.ANALYTICS_DATABASE_URL;
  if (explicit) return explicit;

  const url = new URL(required("DATABASE_URL"));
  url.username = READONLY_ROLE;
  url.password = required("ANALYTICS_ROLE_PASSWORD");
  return url.toString();
}

export const env = {
  get databaseUrl() {
    return required("DATABASE_URL");
  },
  /** Hard cap on rows a single analytics query may return. */
  get queryRowLimit() {
    return int("QUERY_ROW_LIMIT", 500, 1, 5000);
  },
  /** Postgres `statement_timeout` for analytics queries. */
  get queryTimeoutMs() {
    return int("QUERY_TIMEOUT_MS", 5000, 500, 30_000);
  },
  get uploadMaxBytes() {
    // Vercel rejects request bodies above 4.5 MB, so 4 is the safe default.
    return int("UPLOAD_MAX_MB", 4, 1, 25) * 1024 * 1024;
  },
  get uploadTtlDays() {
    return int("UPLOAD_TTL_DAYS", 7, 1, 90);
  },
  /** Questions per rolling 24h for the shared demo account. */
  get demoDailyQuestions() {
    return int("DEMO_DAILY_QUESTIONS", 150, 1, 10_000);
  },
  get cronSecret() {
    return process.env.CRON_SECRET ?? "";
  },
};
