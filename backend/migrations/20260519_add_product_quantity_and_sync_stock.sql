-- Add persisted quantity for products and sync current stock from historical imports/exports

ALTER TABLE products
ADD COLUMN IF NOT EXISTS quantity NUMERIC(12,2) NOT NULL DEFAULT 0;

UPDATE products p
SET quantity = GREATEST(
  COALESCE(imp.total_import, 0) - COALESCE(exp.total_export, 0),
  0
)
FROM (
  SELECT product_id, COALESCE(SUM(quantity), 0) AS total_import
  FROM stock_imports
  GROUP BY product_id
) imp
LEFT JOIN (
  SELECT product_id, COALESCE(SUM(quantity), 0) AS total_export
  FROM stock_exports
  GROUP BY product_id
) exp
  ON imp.product_id = exp.product_id
WHERE p.product_id = imp.product_id;

-- Sync products that only have export records (defensive fallback)
UPDATE products p
SET quantity = GREATEST(0 - COALESCE(exp.total_export, 0), 0)
FROM (
  SELECT product_id, COALESCE(SUM(quantity), 0) AS total_export
  FROM stock_exports
  GROUP BY product_id
) exp
WHERE p.product_id = exp.product_id
  AND NOT EXISTS (
    SELECT 1
    FROM stock_imports si
    WHERE si.product_id = p.product_id
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_products_quantity_non_negative'
  ) THEN
    ALTER TABLE products
      ADD CONSTRAINT chk_products_quantity_non_negative CHECK (quantity >= 0);
  END IF;
END $$;

CREATE OR REPLACE VIEW vw_inventory_stock AS
SELECT
  p.product_id,
  p.product_code,
  p.product_name,
  p.unit,
  COALESCE(imp.total_import, 0) AS total_import,
  COALESCE(exp.total_export, 0) AS total_export,
  p.quantity AS stock_quantity
FROM products p
LEFT JOIN (
  SELECT product_id, COALESCE(SUM(quantity), 0) AS total_import
  FROM stock_imports
  GROUP BY product_id
) imp ON p.product_id = imp.product_id
LEFT JOIN (
  SELECT product_id, COALESCE(SUM(quantity), 0) AS total_export
  FROM stock_exports
  GROUP BY product_id
) exp ON p.product_id = exp.product_id;
