-- -----------------------------------------------------------------------------
-- AskData AI - read-only role for the AI agent
--
-- `npm run db:setup` runs exactly these statements for you (with the password
-- taken from ANALYTICS_ROLE_PASSWORD). The file is here so you can read, audit
-- or run it by hand in the Neon SQL editor: replace CHANGE_ME first.
--
-- Run as the database owner.
-- -----------------------------------------------------------------------------

-- 1. A login role with no special powers.
CREATE ROLE askdata_readonly WITH
  LOGIN
  PASSWORD 'CHANGE_ME'
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOINHERIT;

-- 2. Server-side defaults for every session of this role. Even if application
--    code forgot to set them, Postgres would still refuse writes and cancel
--    slow queries.
ALTER ROLE askdata_readonly SET default_transaction_read_only = on;
ALTER ROLE askdata_readonly SET statement_timeout = '5s';
ALTER ROLE askdata_readonly SET idle_in_transaction_session_timeout = '15s';
ALTER ROLE askdata_readonly SET search_path = analytics;

-- 3. The only two schemas the agent may see.
CREATE SCHEMA IF NOT EXISTS analytics;  -- demo e-commerce dataset
CREATE SCHEMA IF NOT EXISTS uploads;    -- per-user CSV uploads

-- 4. Read access to those schemas - and nothing else. The role is never
--    granted anything on `app` (users, password hashes, conversations) or
--    `public`, so those tables are invisible to it.
GRANT USAGE ON SCHEMA analytics, uploads TO askdata_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA analytics TO askdata_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA uploads TO askdata_readonly;

-- Tables created later (new uploads, re-seeds) are readable automatically.
ALTER DEFAULT PRIVILEGES IN SCHEMA analytics GRANT SELECT ON TABLES TO askdata_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA uploads GRANT SELECT ON TABLES TO askdata_readonly;

-- 5. Belt and braces: make sure nothing was ever granted on the app schema.
REVOKE ALL ON SCHEMA app FROM askdata_readonly;
REVOKE ALL ON ALL TABLES IN SCHEMA app FROM askdata_readonly;

-- Verify (expect one row per analytics table, all SELECT only):
--   SELECT table_schema, table_name, privilege_type
--   FROM information_schema.role_table_grants
--   WHERE grantee = 'askdata_readonly';
