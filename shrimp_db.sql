
-- HỆ THỐNG QUẢN LÝ AO TÔM THÔNG MINH + AI DỰ ĐOÁN BỆNH

-- XÓA VIEW
DROP VIEW IF EXISTS vw_dashboard_summary CASCADE;
DROP VIEW IF EXISTS vw_task_overview CASCADE;
DROP VIEW IF EXISTS vw_latest_environment CASCADE;
DROP VIEW IF EXISTS vw_sensor_latest_readings CASCADE;
DROP VIEW IF EXISTS vw_disease_prediction_result CASCADE;
DROP VIEW IF EXISTS vw_user_roles CASCADE;
DROP VIEW IF EXISTS vw_total_expense_by_season CASCADE;
DROP VIEW IF EXISTS vw_pond_status CASCADE;

-- XÓA BẢNG
DROP TABLE IF EXISTS ai_recommendations CASCADE;
DROP TABLE IF EXISTS disease_predictions CASCADE;
DROP TABLE IF EXISTS shrimp_diseases CASCADE;
DROP TABLE IF EXISTS uploaded_images CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS expense_details CASCADE;
DROP TABLE IF EXISTS expense_categories CASCADE;
DROP TABLE IF EXISTS task_images CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS sensor_readings CASCADE;
DROP TABLE IF EXISTS sensor_thresholds CASCADE;
DROP TABLE IF EXISTS sensors CASCADE;
DROP TABLE IF EXISTS manual_environment_logs CASCADE;
DROP TABLE IF EXISTS cultivation_logs CASCADE;
DROP TABLE IF EXISTS seasons CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS inventory_categories CASCADE;
DROP TABLE IF EXISTS ponds CASCADE;
DROP TABLE IF EXISTS farms CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS user_login_logs CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS roles CASCADE;

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
    pond_id BIGINT PRIMARY KEY,
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

-- DANH MỤC HẠNG MỤC KHO
CREATE TABLE inventory_categories (
    category_id SERIAL PRIMARY KEY,
    category_name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SẢN PHẨM
CREATE TABLE products (
    product_id BIGSERIAL PRIMARY KEY,
    category_id INT REFERENCES inventory_categories(category_id),
    product_code VARCHAR(50) UNIQUE NOT NULL,
    product_name VARCHAR(150) NOT NULL,
    quantity NUMERIC(12,2) NOT NULL DEFAULT 0,
    unit VARCHAR(30) NOT NULL,
    supplier VARCHAR(150),
    description TEXT,
    status VARCHAR(30) DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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

-- NHẬT KÝ CANH TÁC
CREATE TABLE cultivation_logs (
    log_id BIGINT PRIMARY KEY,
    season_id BIGINT REFERENCES seasons(season_id) ON DELETE CASCADE,
    log_date DATE NOT NULL,
    action_type VARCHAR(50),
    description TEXT,
    created_by BIGINT REFERENCES users(user_id),
    approval_status VARCHAR(30) DEFAULT 'PENDING',
    approved_by BIGINT REFERENCES users(user_id),
    approved_at TIMESTAMP,
    rejected_by BIGINT REFERENCES users(user_id),
    rejected_reason TEXT,
    rejected_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- CHỈ SỐ MÔI TRƯỜNG NHẬP TAY
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

-- THIẾT BỊ CẢM BIẾN
CREATE TABLE sensors (
    sensor_id BIGSERIAL PRIMARY KEY,
    pond_id BIGINT REFERENCES ponds(pond_id) ON DELETE CASCADE,
    sensor_type VARCHAR(50),
    serial_number VARCHAR(100),
    status VARCHAR(30) DEFAULT 'ACTIVE'
);

-- NGƯỠNG CẢNH BÁO THEO CẢM BIẾN
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

-- DỮ LIỆU REALTIME TỪ CẢM BIẾN
CREATE TABLE sensor_readings (
    reading_id BIGSERIAL PRIMARY KEY,
    sensor_id BIGINT REFERENCES sensors(sensor_id) ON DELETE CASCADE,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    value NUMERIC(12,3)
);

-- CÔNG VIỆC
CREATE TABLE tasks (
    task_id BIGSERIAL PRIMARY KEY,
    season_id BIGINT REFERENCES seasons(season_id),
    pond_id BIGINT REFERENCES ponds(pond_id),
    task_title VARCHAR(150),
    description TEXT,
    assigned_to BIGINT REFERENCES users(user_id),
    assigned_by BIGINT REFERENCES users(user_id),
    due_date DATE,
    status VARCHAR(30) DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ẢNH HOÀN THÀNH CÔNG VIỆC
CREATE TABLE task_images (
    image_id BIGSERIAL PRIMARY KEY,
    task_id BIGINT REFERENCES tasks(task_id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- DANH MỤC CHI PHÍ
CREATE TABLE expense_categories (
    category_id SERIAL PRIMARY KEY,
    category_name VARCHAR(100) UNIQUE NOT NULL
);

-- CHI PHÍ
CREATE TABLE expense_details (
    expense_id BIGSERIAL PRIMARY KEY,
    season_id BIGINT REFERENCES seasons(season_id),
    category_id INT REFERENCES expense_categories(category_id),
    amount NUMERIC(14,2) NOT NULL,
    expense_date DATE NOT NULL,
    note TEXT,
    created_by BIGINT REFERENCES users(user_id)
);

-- THÔNG BÁO / CẢNH BÁO
CREATE TABLE notifications (
    notification_id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(user_id),
    title VARCHAR(200),
    content TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ẢNH TẢI LÊN (AI)
CREATE TABLE uploaded_images (
    image_id BIGSERIAL PRIMARY KEY,
    uploaded_by BIGINT REFERENCES users(user_id),
    pond_id BIGINT REFERENCES ponds(pond_id),
    image_url TEXT NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- DANH MỤC BỆNH TÔM
CREATE TABLE shrimp_diseases (
    disease_id SERIAL PRIMARY KEY,
    disease_name VARCHAR(150) UNIQUE NOT NULL,
    symptoms TEXT,
    treatment TEXT,
    prevention TEXT
);

-- KẾT QUẢ AI DỰ ĐOÁN BỆNH
CREATE TABLE disease_predictions (
    prediction_id BIGSERIAL PRIMARY KEY,
    image_id BIGINT REFERENCES uploaded_images(image_id),
    disease_id INT REFERENCES shrimp_diseases(disease_id),
    confidence NUMERIC(5,2),
    predicted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI TƯ VẤN XỬ LÝ
CREATE TABLE ai_recommendations (
    recommendation_id BIGSERIAL PRIMARY KEY,
    prediction_id BIGINT REFERENCES disease_predictions(prediction_id) ON DELETE CASCADE,
    recommendation TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- INDEXES
CREATE INDEX idx_audit_user_id
ON audit_logs(user_id);

CREATE INDEX idx_audit_action
ON audit_logs(action);

CREATE INDEX idx_audit_entity
ON audit_logs(entity_type, entity_id);

CREATE INDEX idx_audit_logged_at
ON audit_logs(logged_at);

CREATE INDEX idx_users_username
ON users(username);

CREATE INDEX idx_users_farm_id
ON users(farm_id);

CREATE INDEX idx_farms_owner_user_id
ON farms(owner_user_id);

CREATE INDEX idx_pond_code
ON ponds(pond_code);

CREATE INDEX idx_pond_farm_id
ON ponds(farm_id);

CREATE INDEX idx_sensor_time
ON sensor_readings(recorded_at);

CREATE INDEX idx_task_status
ON tasks(status);

CREATE INDEX idx_notification_user
ON notifications(user_id);

CREATE INDEX idx_products_code
ON products(product_code);

CREATE INDEX idx_products_category
ON products(category_id);

-- VIEWS

-- VIEW THÔNG TIN USER + ROLE
CREATE VIEW vw_user_roles AS
SELECT
    u.user_id,
    u.full_name,
    u.username,
    u.email,
    u.phone,
    r.role_name,
    u.status,
    u.created_at
FROM users u
JOIN roles r ON u.role_id = r.role_id;

-- VIEW TRẠNG THÁI AO NUÔI
CREATE VIEW vw_pond_status AS
SELECT
    pond_id,
    pond_code,
    pond_name,
    area_m2,
    depth_m,
    status,
    created_at
FROM ponds;

-- VIEW TỔNG CHI PHÍ THEO MÙA VỤ
CREATE VIEW vw_total_expense_by_season AS
SELECT
    s.season_id,
    s.season_name,
    p.pond_name,
    COALESCE(SUM(e.amount), 0) AS total_expense
FROM seasons s
LEFT JOIN ponds p ON s.pond_id = p.pond_id
LEFT JOIN expense_details e ON s.season_id = e.season_id
GROUP BY s.season_id, s.season_name, p.pond_name;

-- VIEW CÔNG VIỆC
CREATE VIEW vw_task_overview AS
SELECT
    t.task_id,
    t.task_title,
    p.pond_name,
    s.season_name,
    u.full_name AS assigned_to,
    t.due_date,
    t.status
FROM tasks t
LEFT JOIN ponds p ON t.pond_id = p.pond_id
LEFT JOIN seasons s ON t.season_id = s.season_id
LEFT JOIN users u ON t.assigned_to = u.user_id;

-- VIEW DỮ LIỆU MÔI TRƯỜNG MỚI NHẤT
CREATE VIEW vw_latest_environment AS
SELECT
    m.env_id,
    p.pond_name,
    m.ph,
    m.temperature,
    m.salinity,
    m.oxygen,
    m.turbidity,
    m.recorded_at
FROM manual_environment_logs m
JOIN ponds p ON m.pond_id = p.pond_id;


-- VIEW GIÁ TRỊ CẢM BIẾN MỚI NHẤT
CREATE VIEW vw_sensor_latest_readings AS
SELECT
    sr.reading_id,
    s.serial_number,
    s.sensor_type,
    p.pond_name,
    sr.value,
    sr.recorded_at
FROM sensor_readings sr
JOIN sensors s ON sr.sensor_id = s.sensor_id
JOIN ponds p ON s.pond_id = p.pond_id;

-- VIEW KẾT QUẢ AI DỰ ĐOÁN BỆNH
CREATE VIEW vw_disease_prediction_result AS
SELECT
    dp.prediction_id,
    sd.disease_name,
    dp.confidence,
    ar.recommendation,
    ui.image_url,
    dp.predicted_at
FROM disease_predictions dp
JOIN shrimp_diseases sd
    ON dp.disease_id = sd.disease_id
LEFT JOIN ai_recommendations ar
    ON dp.prediction_id = ar.prediction_id
LEFT JOIN uploaded_images ui
    ON dp.image_id = ui.image_id;

-- VIEW DASHBOARD TỔNG QUAN
CREATE VIEW vw_dashboard_summary AS
SELECT
    (SELECT COUNT(*) FROM ponds) AS total_ponds,
    (SELECT COUNT(*) FROM seasons WHERE status = 'RUNNING') AS active_seasons,
    (SELECT COUNT(*) FROM users WHERE status = TRUE) AS active_users,
    (SELECT COUNT(*) FROM tasks WHERE status = 'PENDING') AS pending_tasks,
    (SELECT COUNT(*) FROM notifications WHERE is_read = FALSE) AS unread_notifications;

-- KIỂM TRA DỮ LIỆU
SELECT * FROM roles;
SELECT * FROM farms;
SELECT * FROM users;
SELECT * FROM ponds;
SELECT * FROM inventory_categories;
SELECT * FROM products;
SELECT * FROM seasons;
SELECT * FROM cultivation_logs;
SELECT * FROM manual_environment_logs;
SELECT * FROM sensors;
SELECT * FROM sensor_thresholds;
SELECT * FROM sensor_readings;
SELECT * FROM tasks;
SELECT * FROM task_images;
SELECT * FROM expense_categories;
SELECT * FROM expense_details;
SELECT * FROM notifications;
SELECT * FROM uploaded_images;
SELECT * FROM shrimp_diseases;
SELECT * FROM disease_predictions;
SELECT * FROM ai_recommendations;
SELECT * FROM vw_user_roles;
SELECT * FROM vw_pond_status;
SELECT * FROM vw_dashboard_summary;

-- THÊM DỮ LIỆU
-- Thêm tài khoản admin
CREATE EXTENSION IF NOT EXISTS pgcrypto;	-- Bật extension mã hóa

INSERT INTO roles (role_name, description)
VALUES
    ('ADMIN', 'Quan tri he thong'),
    ('OWNER', 'Chu trai nuoi, quan ly nhan su va van hanh trang trai'),
    ('MANAGER', 'Quan ly van hanh theo trai'),
    ('STOREKEEPER', 'Quan ly kho'),
    ('ACCOUNTANT', 'Quan ly chi phi'),
    ('TECHNICIAN', 'Ky thuat vien cam bien'),
    ('WORKER', 'Nhan vien thao tac')
ON CONFLICT (role_name) DO NOTHING;

INSERT INTO users (full_name, username, password_hash, email, phone, role_id)
VALUES ('Administrator', 'admin', crypt('admin123', gen_salt('bf')), 'admin@gmail.com', '0395800581', (SELECT role_id FROM roles WHERE role_name = 'ADMIN'));