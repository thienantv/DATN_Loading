-- Add OWNER role for farm owner accounts
INSERT INTO roles (role_name, description)
SELECT 'OWNER', 'Chủ trại: quản lý tài khoản và điều phối nghiệp vụ toàn trại'
WHERE NOT EXISTS (
  SELECT 1 FROM roles WHERE role_name = 'OWNER'
);
