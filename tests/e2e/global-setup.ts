import type { FullConfig } from "@playwright/test";

/**
 * Warm the freshly started production server (first requests compile route
 * caches and open the database connections) so the first tests don't time out.
 */
export default async function globalSetup(config: FullConfig) {
  const base = config.projects[0]?.use.baseURL ?? "http://localhost:3200";
  for (const path of ["/", "/login", "/signup", "/api/health", "/api/auth/csrf"]) {
    try {
      await fetch(base + path, { redirect: "manual", signal: AbortSignal.timeout(60_000) });
    } catch {
      // A slow route here is fine; the tests will report real failures.
    }
  }
}
