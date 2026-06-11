-- =========================================================================
-- HỆ THỐNG QUẢN LÝ AO TÔM THÔNG MINH + AI DỰ ĐOÁN BỆNH
-- =========================================================================

-- =========================================================================
-- 1. XÓA VIEW VÀ BẢNG CŨ (Làm sạch Database)
-- =========================================================================
DROP VIEW IF EXISTS vw_dashboard_summary CASCADE;
DROP VIEW IF EXISTS vw_latest_environment CASCADE;
DROP VIEW IF EXISTS vw_sensor_latest_readings CASCADE;
DROP VIEW IF EXISTS vw_disease_prediction_result CASCADE;
DROP VIEW IF EXISTS vw_user_roles CASCADE;
DROP VIEW IF EXISTS vw_total_expense_by_season CASCADE;
DROP VIEW IF EXISTS vw_pond_status CASCADE;
DROP VIEW IF EXISTS vw_task_overview CASCADE;

DROP TABLE IF EXISTS ai_recommendations CASCADE;
DROP TABLE IF EXISTS disease_predictions CASCADE;
DROP TABLE IF EXISTS shrimp_diseases CASCADE;
DROP TABLE IF EXISTS uploaded_images CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS farm_expenses CASCADE;
DROP TABLE IF EXISTS task_images CASCADE;
DROP TABLE IF EXISTS task_product_usage CASCADE;
DROP TABLE IF EXISTS task_workers CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS task_types CASCADE;
DROP TABLE IF EXISTS sensor_readings CASCADE;
DROP TABLE IF EXISTS sensor_thresholds CASCADE;
DROP TABLE IF EXISTS sensors CASCADE;
DROP TABLE IF EXISTS manual_environment_logs CASCADE;
DROP TABLE IF EXISTS seasons CASCADE;
DROP TABLE IF EXISTS product_usage_logs CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS product_categories CASCADE;
DROP TABLE IF EXISTS technician_workers CASCADE;
DROP TABLE IF EXISTS pond_workers CASCADE;
DROP TABLE IF EXISTS ponds CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS farms CASCADE;
DROP TABLE IF EXISTS roles CASCADE;

-- Bật extension mã hóa mật khẩu
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================================================================
-- 2. NHÓM BẢNG CỐT LÕI (Không phụ thuộc khóa ngoại)
-- =========================================================================

-- PHÂN QUYỀN
CREATE TABLE roles (
    role_id SERIAL PRIMARY KEY,
    role_name VARCHAR(30) UNIQUE NOT NULL,
    description TEXT
);

-- TRẠI NUÔI
CREATE TABLE farms (
    farm_id BIGSERIAL PRIMARY KEY,
    farm_code VARCHAR(50) UNIQUE NOT NULL,
    farm_name VARCHAR(150) NOT NULL,
    address TEXT,
    contact_phone VARCHAR(20),
    owner_user_id BIGINT,
    status VARCHAR(30) DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- DANH MỤC BỆNH TÔM (AI)
CREATE TABLE shrimp_diseases (
    disease_id SERIAL PRIMARY KEY,
    disease_name VARCHAR(150) UNIQUE NOT NULL,
    symptoms TEXT,
    treatment TEXT,
    prevention TEXT
);

-- DANH MỤC LOẠI CÔNG VIỆC
CREATE TABLE task_types (
    type_id SERIAL PRIMARY KEY,
    type_code VARCHAR(50) UNIQUE NOT NULL,
    type_name VARCHAR(100) NOT NULL
);

-- =========================================================================
-- 3. NHÓM NGƯỜI DÙNG & TÀI SẢN (Phụ thuộc Nhóm 2)
-- =========================================================================

-- NGƯỜI DÙNG
CREATE TABLE users (
    user_id BIGSERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(20),
    avatar_url TEXT,
    role_id INT REFERENCES roles(role_id),
    farm_id BIGINT REFERENCES farms(farm_id),
    status BOOLEAN DEFAULT TRUE,
    locked_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AO NUÔI TÔM
CREATE TABLE ponds (
    pond_id BIGSERIAL PRIMARY KEY,
    farm_id BIGINT REFERENCES farms(farm_id) ON DELETE SET NULL,
    pond_code VARCHAR(30) NOT NULL,
    pond_name VARCHAR(100),
    area_m2 NUMERIC(12,2),
    depth_m NUMERIC(5,2),
    status VARCHAR(30) DEFAULT 'TAM_NGUNG',
    usage_status VARCHAR(30) DEFAULT 'HOAT_DONG',
    assigned_staff BIGINT REFERENCES users(user_id),
    renovation_started_at TIMESTAMP,
    renovation_completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================================
-- 4. NHÓM VẬT TƯ SẢN PHẨM (Phụ thuộc Trại và Người dùng)
-- =========================================================================

-- DANH MỤC SẢN PHẨM
CREATE TABLE product_categories (
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

-- SẢN PHẨM
CREATE TABLE products (
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

-- =========================================================================
-- 5. NHÓM VẬN HÀNH: MÙA VỤ & CÔNG VIỆC
-- =========================================================================

-- MÙA VỤ
CREATE TABLE seasons (
    season_id BIGSERIAL PRIMARY KEY,
    pond_id BIGINT REFERENCES ponds(pond_id) ON DELETE CASCADE,
    season_name VARCHAR(100),
    start_date DATE NOT NULL,
    expected_harvest DATE,
    actual_harvest DATE,
    harvest_weight_kg NUMERIC(12,2),
    harvest_note TEXT,
    shrimp_type VARCHAR(100),
    quantity_seed INT,
    density NUMERIC(10,2),
    status VARCHAR(30) DEFAULT 'RUNNING',
    note TEXT
);

-- CÔNG VIỆC CHÍNH
CREATE TABLE tasks (
    task_id BIGSERIAL PRIMARY KEY,
    task_code VARCHAR(50) UNIQUE NOT NULL,
    season_id BIGINT REFERENCES seasons(season_id) ON DELETE SET NULL,
    pond_id BIGINT NOT NULL REFERENCES ponds(pond_id) ON DELETE CASCADE,
    task_title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    assigned_by BIGINT NOT NULL REFERENCES users(user_id),
    start_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    due_date TIMESTAMP NOT NULL,
    status VARCHAR(30) DEFAULT 'PENDING',
    type_id INT NOT NULL REFERENCES task_types(type_id) ON DELETE RESTRICT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- PHÂN CÔNG KỸ SƯ / CÔNG NHÂN
CREATE TABLE technician_workers (
    technician_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    worker_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (technician_id, worker_id)
);

CREATE TABLE task_workers (
    task_worker_id BIGSERIAL PRIMARY KEY,
    task_id BIGINT NOT NULL REFERENCES tasks(task_id) ON DELETE CASCADE,
    worker_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    status VARCHAR(30) DEFAULT 'ASSIGNED',
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    note TEXT,
    CONSTRAINT uq_task_worker_unique UNIQUE (task_id, worker_id)
);

-- SỬ DỤNG VẬT TƯ TRONG CÔNG VIỆC
CREATE TABLE task_product_usage (
    id BIGSERIAL PRIMARY KEY,
    task_id BIGINT NOT NULL REFERENCES tasks(task_id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES products(product_id) ON DELETE RESTRICT,
    quantity NUMERIC(14,2) NOT NULL DEFAULT 0,
    unit_price NUMERIC(14,2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(14,2) GENERATED ALWAYS AS (quantity * unit_price) STORED
);

CREATE TABLE task_images (
    image_id BIGSERIAL PRIMARY KEY,
    task_id BIGINT NOT NULL REFERENCES tasks(task_id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================================
-- 6. NHÓM MÔI TRƯỜNG & IOT CẢM BIẾN
-- =========================================================================

CREATE TABLE manual_environment_logs (
    env_id BIGSERIAL PRIMARY KEY,
    pond_id BIGINT REFERENCES ponds(pond_id) ON DELETE CASCADE,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ph NUMERIC(4,2),
    temperature NUMERIC(5,2),
    salinity NUMERIC(5,2),
    oxygen NUMERIC(5,2),
    turbidity NUMERIC(5,2),
    created_by BIGINT REFERENCES users(user_id)
);

CREATE TABLE sensors (
    sensor_id BIGSERIAL PRIMARY KEY,
    pond_id BIGINT REFERENCES ponds(pond_id) ON DELETE CASCADE,
    sensor_type VARCHAR(50),
    serial_number VARCHAR(100),
    status VARCHAR(30) DEFAULT 'ACTIVE'
);

CREATE TABLE sensor_thresholds (
    threshold_id BIGSERIAL PRIMARY KEY,
    sensor_id BIGINT UNIQUE REFERENCES sensors(sensor_id) ON DELETE CASCADE,
    min_ph NUMERIC(4,2),
    max_ph NUMERIC(4,2),
    min_temp NUMERIC(5,2),
    max_temp NUMERIC(5,2),
    min_salinity NUMERIC(5,2),
    max_salinity NUMERIC(5,2),
    min_oxygen NUMERIC(5,2),
    max_oxygen NUMERIC(5,2),
    min_turbidity NUMERIC(5,2),
    max_turbidity NUMERIC(5,2),
    alert_level VARCHAR(20) DEFAULT 'WARNING',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sensor_readings (
    reading_id BIGSERIAL PRIMARY KEY,
    sensor_id BIGINT REFERENCES sensors(sensor_id) ON DELETE CASCADE,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    value NUMERIC(12,3)
);

-- =========================================================================
-- 7. NHÓM AI CHẨN ĐOÁN
-- =========================================================================

CREATE TABLE uploaded_images (
    image_id BIGSERIAL PRIMARY KEY,
    uploaded_by BIGINT REFERENCES users(user_id),
    pond_id BIGINT REFERENCES ponds(pond_id),
    image_url TEXT NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE disease_predictions (
    prediction_id BIGSERIAL PRIMARY KEY,
    image_id BIGINT REFERENCES uploaded_images(image_id),
    disease_id INT REFERENCES shrimp_diseases(disease_id),
    confidence NUMERIC(5,2),
    symptoms TEXT,
    treatment TEXT,
    prevention TEXT,
    predicted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ai_recommendations (
    recommendation_id BIGSERIAL PRIMARY KEY,
    prediction_id BIGINT REFERENCES disease_predictions(prediction_id) ON DELETE CASCADE,
    recommendation TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================================
-- 8. NHÓM KẾ TOÁN & HỆ THỐNG
-- =========================================================================

CREATE TABLE product_usage_logs (
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

CREATE TABLE farm_expenses (
    expense_id SERIAL PRIMARY KEY,
    farm_id INT,
    expense_category VARCHAR(50) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    expense_date DATE NOT NULL,
    note TEXT,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notifications (
    notification_id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(user_id),
    title VARCHAR(200),
    content TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================================
-- 9. TẠO INDEXES (Tối ưu truy vấn)
-- =========================================================================

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_farm_id ON users(farm_id);
CREATE INDEX idx_farms_owner_user_id ON farms(owner_user_id);
CREATE INDEX idx_pond_code ON ponds(pond_code);
CREATE INDEX idx_pond_farm_id ON ponds(farm_id);
CREATE INDEX idx_sensor_time ON sensor_readings(recorded_at);
CREATE INDEX idx_tasks_code_farm ON tasks(task_code);
CREATE INDEX idx_tasks_status_dates ON tasks(status, due_date);
CREATE INDEX idx_tasks_pond_season ON tasks(pond_id, season_id);
CREATE INDEX idx_task_workers_lookup ON task_workers(worker_id, status);
CREATE INDEX idx_task_product_cost ON task_product_usage(product_id);
CREATE INDEX idx_notification_user ON notifications(user_id);
CREATE INDEX idx_product_categories_farm_id ON product_categories(farm_id);
CREATE INDEX idx_products_farm_id ON products(farm_id);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_supplier ON products(supplier);
CREATE INDEX idx_product_usage_logs_farm_id ON product_usage_logs(farm_id);
CREATE INDEX idx_product_usage_logs_product_id ON product_usage_logs(product_id);
CREATE INDEX idx_product_usage_logs_source_module ON product_usage_logs(source_module);

-- =========================================================================
-- 10. TẠO VIEWS
-- =========================================================================

CREATE VIEW vw_user_roles AS
SELECT u.user_id, u.full_name, u.username, u.email, u.phone, r.role_name, u.status, u.created_at
FROM users u JOIN roles r ON u.role_id = r.role_id;

CREATE VIEW vw_pond_status AS
SELECT pond_id, pond_code, pond_name, area_m2, depth_m, status, created_at FROM ponds;

CREATE VIEW vw_latest_environment AS
SELECT m.env_id, p.pond_name, m.ph, m.temperature, m.salinity, m.oxygen, m.turbidity, m.recorded_at
FROM manual_environment_logs m JOIN ponds p ON m.pond_id = p.pond_id;

CREATE VIEW vw_sensor_latest_readings AS
SELECT sr.reading_id, s.serial_number, s.sensor_type, p.pond_name, sr.value, sr.recorded_at
FROM sensor_readings sr JOIN sensors s ON sr.sensor_id = s.sensor_id JOIN ponds p ON s.pond_id = p.pond_id;

CREATE VIEW vw_disease_prediction_result AS
SELECT dp.prediction_id, sd.disease_name, dp.confidence, ar.recommendation, ui.image_url, dp.predicted_at
FROM disease_predictions dp
JOIN shrimp_diseases sd ON dp.disease_id = sd.disease_id
LEFT JOIN ai_recommendations ar ON dp.prediction_id = ar.prediction_id
LEFT JOIN uploaded_images ui ON dp.image_id = ui.image_id;

CREATE VIEW vw_dashboard_summary AS
SELECT
    (SELECT COUNT(*) FROM ponds) AS total_ponds,
    (SELECT COUNT(*) FROM seasons WHERE status = 'RUNNING') AS active_seasons,
    (SELECT COUNT(*) FROM users WHERE status = TRUE) AS active_users,
    (SELECT COUNT(*) FROM tasks WHERE status = 'PENDING') AS pending_tasks,
    (SELECT COUNT(*) FROM notifications WHERE is_read = FALSE) AS unread_notifications;

CREATE OR REPLACE VIEW vw_task_overview AS
SELECT
    t.task_id, t.task_code, t.task_title, tt.type_name AS task_type_name, tt.type_code AS task_type_code,
    p.pond_name, s.season_name, u_by.full_name AS technician_name, t.start_date, t.due_date, t.status AS task_status,
    COALESCE(tpu.total_amount, 0) AS product_cost_estimated, t.created_at,
    (SELECT STRING_AGG(u_w.full_name, ', ') FROM task_workers tw JOIN users u_w ON tw.worker_id = u_w.user_id WHERE tw.task_id = t.task_id) AS assigned_workers_list
FROM tasks t
LEFT JOIN task_types tt ON t.type_id = tt.type_id
LEFT JOIN ponds p ON t.pond_id = p.pond_id
LEFT JOIN seasons s ON t.season_id = s.season_id
LEFT JOIN users u_by ON t.assigned_by = u_by.user_id
LEFT JOIN task_product_usage tpu ON t.task_id = tpu.task_id;

-- =========================================================================
-- 11. THÊM DỮ LIỆU KHỞI TẠO (Seeding)
-- =========================================================================

INSERT INTO roles (role_name, description) VALUES 
('ADMIN', 'Quản trị viên toàn hệ thống'),
('OWNER', 'Chủ trại nuôi'),
('TECHNICIAN', 'Kỹ sư thủy sản'),
('WORKER', 'Công nhân thực địa')
ON CONFLICT (role_name) DO NOTHING;

INSERT INTO users (full_name, username, password_hash, email, phone, role_id)
VALUES ('Administrator', 'admin', crypt('admin123', gen_salt('bf')), 'admin@gmail.com', '0395800581', (SELECT role_id FROM roles WHERE role_name = 'ADMIN'))
ON CONFLICT (username) DO NOTHING;