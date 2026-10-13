/**
 * npm run db:setup
 *
 * Creates the read-only role and the two schemas the agent may read, then
 * proves the role really is locked down by trying to misbehave with it.
 * Safe to run repeatedly. The equivalent hand-runnable SQL is in
 * sql/01-readonly-role.sql.
 */
import { connect, literal, ownerUrl, READONLY_ROLE, readonlyUrl, requireEnv } from "./lib/db";

async function main() {
  const password = requireEnv("ANALYTICS_ROLE_PASSWORD");
  const owner = await connect(ownerUrl());

  try {
    const existing = await owner.query("SELECT 1 FROM pg_roles WHERE rolname = $1", [READONLY_ROLE]);
    if (existing.rowCount === 0) {
      await owner.query(
        `CREATE ROLE ${READONLY_ROLE} WITH LOGIN PASSWORD ${literal(password)}
         NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOINHERIT`,
      );
      console.log(`✔ created role ${READONLY_ROLE}`);
    } else {
      await owner.query(`ALTER ROLE ${READONLY_ROLE} WITH LOGIN PASSWORD ${literal(password)}`);
      console.log(`✔ role ${READONLY_ROLE} already exists — password synced with .env`);
    }

    const roleDefaults = [
      "default_transaction_read_only = on",
      "statement_timeout = '5s'",
      "idle_in_transaction_session_timeout = '15s'",
      "search_path = analytics",
    ];
    for (const setting of roleDefaults) {
      await owner.query(`ALTER ROLE ${READONLY_ROLE} SET ${setting}`);
    }
    console.log("✔ role defaults: read-only transactions, 5s statement timeout");

    await owner.query("CREATE SCHEMA IF NOT EXISTS analytics");
    await owner.query("CREATE SCHEMA IF NOT EXISTS uploads");
    await owner.query(`GRANT USAGE ON SCHEMA analytics, uploads TO ${READONLY_ROLE}`);
    await owner.query(`GRANT SELECT ON ALL TABLES IN SCHEMA analytics TO ${READONLY_ROLE}`);
    await owner.query(`GRANT SELECT ON ALL TABLES IN SCHEMA uploads TO ${READONLY_ROLE}`);
    await owner.query(
      `ALTER DEFAULT PRIVILEGES IN SCHEMA analytics GRANT SELECT ON TABLES TO ${READONLY_ROLE}`,
    );
    await owner.query(
      `ALTER DEFAULT PRIVILEGES IN SCHEMA uploads GRANT SELECT ON TABLES TO ${READONLY_ROLE}`,
    );
    console.log("✔ granted SELECT on schemas analytics + uploads");

    // The app schema only exists after `npm run db:migrate`.
    const appSchema = await owner.query("SELECT 1 FROM pg_namespace WHERE nspname = 'app'");
    if (appSchema.rowCount) {
      await owner.query(`REVOKE ALL ON SCHEMA app FROM ${READONLY_ROLE}`);
      await owner.query(`REVOKE ALL ON ALL TABLES IN SCHEMA app FROM ${READONLY_ROLE}`);
      console.log("✔ confirmed no privileges on schema app");
    } else {
      console.log("! schema app not found yet — run `npm run db:migrate` first for the full check");
    }
  } finally {
    await owner.end();
  }

  await verify();
}

/** Log in as the read-only role and check that the guard rails hold. */
async function verify() {
  const readonly = await connect(readonlyUrl());
  const expectFailure = async (label: string, sql: string) => {
    try {
      await readonly.query(sql);
    } catch {
      console.log(`✔ blocked: ${label}`);
      return;
    }
    throw new Error(`Safety check failed — the read-only role was able to: ${label}`);
  };

  try {
    await expectFailure("create a table", "CREATE TABLE analytics.should_not_exist (id int)");
    await expectFailure("read the app's user table", 'SELECT * FROM app."User" LIMIT 1');
    await expectFailure("write inside a transaction", "CREATE TEMP TABLE scratch (id int)");
    console.log("\nRead-only role is ready.");
  } finally {
    await readonly.end();
  }
}

main().catch((error) => {
  console.error("\n✖ db:setup failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
