-- Create farms table and add farm scoping to users/ponds
CREATE TABLE IF NOT EXISTS farms (
  farm_id BIGSERIAL PRIMARY KEY,
  farm_code VARCHAR(50) UNIQUE NOT NULL,
  farm_name VARCHAR(150) NOT NULL,
  address TEXT,
  contact_phone VARCHAR(20),
  owner_user_id BIGINT,
  status VARCHAR(30) DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS farm_id BIGINT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'users_farm_id_fkey'
      AND table_name = 'users'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_farm_id_fkey
      FOREIGN KEY (farm_id) REFERENCES farms(farm_id);
  END IF;
END $$;

ALTER TABLE ponds
  ADD COLUMN IF NOT EXISTS farm_id BIGINT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'ponds_farm_id_fkey'
      AND table_name = 'ponds'
  ) THEN
    ALTER TABLE ponds
      ADD CONSTRAINT ponds_farm_id_fkey
      FOREIGN KEY (farm_id) REFERENCES farms(farm_id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_users_farm_id ON users(farm_id);
CREATE INDEX IF NOT EXISTS idx_pond_farm_id ON ponds(farm_id);
CREATE INDEX IF NOT EXISTS idx_farms_owner_user_id ON farms(owner_user_id);

INSERT INTO roles (role_name, description)
SELECT 'OWNER', 'Farm owner role: manages users and farm-wide operations'
WHERE NOT EXISTS (
  SELECT 1 FROM roles WHERE role_name = 'OWNER'
);
