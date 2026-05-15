-- Add OWNER role for farm owner accounts
INSERT INTO roles (role_name, description)
SELECT 'OWNER', 'Farm owner role: manages users and farm-wide operations'
WHERE NOT EXISTS (
  SELECT 1 FROM roles WHERE role_name = 'OWNER'
);
