-- Migration: Drop stock_imports and stock_exports tables
-- WARNING: Destructive operation. Back up the database before running this script.

BEGIN;

DROP TABLE IF EXISTS stock_exports CASCADE;
DROP TABLE IF EXISTS stock_imports CASCADE;

COMMIT;
