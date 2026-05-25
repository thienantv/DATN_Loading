-- Migration: Drop audit and user login logs tables
-- Review before running in your environment. Backup recommended.
BEGIN;

-- Drop user login logs
DROP TABLE IF EXISTS user_login_logs CASCADE;

-- Drop audit logs
DROP TABLE IF EXISTS audit_logs CASCADE;

COMMIT;
