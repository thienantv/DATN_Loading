-- Add OWNER role for farm owner accounts
INSERT INTO roles (role_name, description)
SELECT 'OWNER', 'Chá»§ tráº¡i: quáº£n lÃ½ tÃ i khoáº£n vÃ  Ä‘iá»u phá»‘i nghiá»‡p vá»¥ toÃ n tráº¡i'
WHERE NOT EXISTS (
  SELECT 1 FROM roles WHERE role_name = 'OWNER'
);
