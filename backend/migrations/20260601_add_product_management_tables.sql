-- Product management tables for farm-scoped catalog data

CREATE TABLE IF NOT EXISTS product_categories (
  category_id BIGSERIAL PRIMARY KEY,
  farm_id BIGINT NOT NULL REFERENCES farms(farm_id) ON DELETE CASCADE,
  category_code VARCHAR(30) NOT NULL,
  category_name VARCHAR(150) NOT NULL,
  note TEXT,
  created_by BIGINT REFERENCES users(user_id) ON DELETE SET NULL,
  updated_by BIGINT REFERENCES users(user_id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_product_categories_farm_code UNIQUE (farm_id, category_code),
  CONSTRAINT uq_product_categories_farm_name UNIQUE (farm_id, category_name)
);

CREATE TABLE IF NOT EXISTS products (
  product_id BIGSERIAL PRIMARY KEY,
  farm_id BIGINT NOT NULL REFERENCES farms(farm_id) ON DELETE CASCADE,
  category_id BIGINT NOT NULL REFERENCES product_categories(category_id) ON DELETE RESTRICT,
  product_code VARCHAR(30) NOT NULL,
  product_name VARCHAR(150) NOT NULL,
  unit VARCHAR(50) NOT NULL,
  supplier VARCHAR(150),
  unit_price NUMERIC(14,2) NOT NULL DEFAULT 0,
  note TEXT,
  status VARCHAR(30) DEFAULT 'ACTIVE',
  created_by BIGINT REFERENCES users(user_id) ON DELETE SET NULL,
  updated_by BIGINT REFERENCES users(user_id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_products_farm_code UNIQUE (farm_id, product_code),
  CONSTRAINT uq_products_category_name UNIQUE (farm_id, category_id, product_name),
  CONSTRAINT chk_products_unit_price CHECK (unit_price >= 0)
);

CREATE TABLE IF NOT EXISTS product_usage_logs (
  usage_id BIGSERIAL PRIMARY KEY,
  farm_id BIGINT NOT NULL REFERENCES farms(farm_id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES products(product_id) ON DELETE RESTRICT,
  category_id BIGINT REFERENCES product_categories(category_id) ON DELETE SET NULL,
  source_module VARCHAR(50) NOT NULL,
  source_ref VARCHAR(100),
  quantity NUMERIC(14,2) NOT NULL DEFAULT 0,
  unit_price NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  note TEXT,
  created_by BIGINT REFERENCES users(user_id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_product_categories_farm_id ON product_categories(farm_id);
CREATE INDEX IF NOT EXISTS idx_products_farm_id ON products(farm_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_supplier ON products(supplier);
CREATE INDEX IF NOT EXISTS idx_product_usage_logs_farm_id ON product_usage_logs(farm_id);
CREATE INDEX IF NOT EXISTS idx_product_usage_logs_product_id ON product_usage_logs(product_id);
CREATE INDEX IF NOT EXISTS idx_product_usage_logs_source_module ON product_usage_logs(source_module);
