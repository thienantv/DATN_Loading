-- Migration: Drop feed_logs table
-- WARNING: Destructive operation. Ensure you have a backup before running this migration.

BEGIN;

-- Drop feed_logs if exists (and any dependent objects)
DROP TABLE IF EXISTS feed_logs CASCADE;

COMMIT;
