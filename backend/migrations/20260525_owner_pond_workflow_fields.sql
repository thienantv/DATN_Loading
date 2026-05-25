BEGIN;

ALTER TABLE ponds
  ADD COLUMN IF NOT EXISTS usage_status VARCHAR(30) NOT NULL DEFAULT 'HOAT_DONG',
  ADD COLUMN IF NOT EXISTS renovation_started_at TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS renovation_completed_at TIMESTAMP NULL;

UPDATE ponds
SET status = CASE
  WHEN UPPER(COALESCE(status, '')) IN ('READY', 'PENDING', '') THEN 'TAM_NGUNG'
  WHEN UPPER(status) = 'RUNNING' THEN 'DANG_NUOI'
  WHEN UPPER(status) = 'RENOVATING' THEN 'DANG_CAI_TAO'
  ELSE status
END;

ALTER TABLE ponds
  ALTER COLUMN status SET DEFAULT 'TAM_NGUNG';

ALTER TABLE ponds
  DROP CONSTRAINT IF EXISTS ponds_pond_code_key;

CREATE UNIQUE INDEX IF NOT EXISTS uq_ponds_farm_pond_code
  ON ponds (farm_id, pond_code);

CREATE UNIQUE INDEX IF NOT EXISTS uq_ponds_farm_pond_name_lower
  ON ponds (farm_id, LOWER(pond_name));

COMMIT;