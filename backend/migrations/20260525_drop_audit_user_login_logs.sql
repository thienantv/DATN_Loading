-- Migration: Drop audit_logs and user_login_logs tables
-- Date: 2026-05-25

BEGIN;

DROP TABLE IF EXISTS user_login_logs CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;

COMMIT;
