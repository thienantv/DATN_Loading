

-- ==================================================== --
-- HỆ THỐNG QUẢN LÝ AO TÔM THÔNG MINH + AI DỰ ĐOÁN BỆNH --
-- ==================================================== --

-- ============================================================
-- 1. PHÂN QUYỀN
-- ============================================================
CREATE TABLE roles (
    role_id SERIAL PRIMARY KEY,
    role_name VARCHAR(30) UNIQUE NOT NULL,
    description TEXT
);

SELECT * FROM roles;

-- ============================================================
-- 2. NGƯỜI DÙNG
-- ============================================================
CREATE TABLE users (
    user_id BIGSERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(20),
    role_id INT REFERENCES roles(role_id),
    status BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

SELECT * FROM users;

-- ============================================================
-- 3. LOG ĐĂNG NHẬP
-- ============================================================
CREATE TABLE user_login_logs (
    log_id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(user_id),
    login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(50),
    device_info TEXT
);

SELECT * FROM user_login_logs;

-- ============================================================
-- 4. AO NUÔI TÔM
-- ============================================================
CREATE TABLE ponds (
    pond_id BIGINT PRIMARY KEY,
    pond_code VARCHAR(30) UNIQUE NOT NULL,
    pond_name VARCHAR(100),
    area_m2 NUMERIC(12,2),
    depth_m NUMERIC(5,2),
    max_density INT,
    status VARCHAR(30) DEFAULT 'READY',
    assigned_staff BIGINT REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

SELECT * FROM ponds;

-- ============================================================
-- 5. MÙA VỤ
-- ============================================================
CREATE TABLE seasons (
    season_id BIGSERIAL PRIMARY KEY,
    pond_id BIGINT REFERENCES ponds(pond_id) ON DELETE CASCADE,
    season_name VARCHAR(100),
    start_date DATE NOT NULL,
    expected_harvest DATE,
    actual_harvest DATE,
    shrimp_type VARCHAR(100),
    quantity_seed INT,
    density NUMERIC(10,2),
    status VARCHAR(30) DEFAULT 'RUNNING',
    note TEXT
);

SELECT * FROM seasons;

-- ============================================================
-- 6. DANH MỤC SẢN PHẨM
-- (thức ăn / thuốc / vi sinh)
-- ============================================================
CREATE TABLE products (
    product_id BIGSERIAL PRIMARY KEY,
    product_name VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL,
    unit VARCHAR(30),
    price NUMERIC(12,2),
    description TEXT
);

SELECT * FROM products;

-- ============================================================
-- 7. NHẬT KÝ CHO ĂN
-- ============================================================
CREATE TABLE feed_logs (
    feed_log_id BIGSERIAL PRIMARY KEY,
    season_id BIGINT REFERENCES seasons(season_id) ON DELETE CASCADE,
    product_id BIGINT REFERENCES products(product_id),
    feeding_date DATE NOT NULL,
    feeding_time TIME,
    meal_no INT,
    quantity_kg NUMERIC(10,2),
    created_by BIGINT REFERENCES users(user_id),
    note TEXT
);

-- ============================================================
-- 8. NHẬT KÝ CANH TÁC
-- ============================================================
CREATE TABLE cultivation_logs (
    log_id BIGINT PRIMARY KEY,
    season_id BIGINT REFERENCES seasons(season_id) ON DELETE CASCADE,
    log_date DATE NOT NULL,
    action_type VARCHAR(50), -- thay nước, siphon, dùng thuốc...
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

SELECT * FROM cultivation_logs;

-- ============================================================
-- 9. CHỈ SỐ MÔI TRƯỜNG NHẬP TAY
-- ============================================================
CREATE TABLE manual_environment_logs (
    env_id BIGSERIAL PRIMARY KEY,
    season_id BIGINT REFERENCES seasons(season_id) ON DELETE CASCADE,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ph NUMERIC(4,2),
    temperature NUMERIC(5,2),
    salinity NUMERIC(5,2),
    oxygen NUMERIC(5,2),
    water_level NUMERIC(6,3),
    created_by BIGINT REFERENCES users(user_id)
);

SELECT * FROM manual_environment_logs;

-- ============================================================
-- 10. THIẾT BỊ CẢM BIẾN
-- ============================================================
CREATE TABLE sensors (
    sensor_id BIGSERIAL PRIMARY KEY,
    pond_id BIGINT REFERENCES ponds(pond_id) ON DELETE CASCADE,
    sensor_name VARCHAR(100),
    sensor_type VARCHAR(50), -- pH, Temp, DO...
    serial_number VARCHAR(100),
    status VARCHAR(30) DEFAULT 'ACTIVE'
);

SELECT * FROM sensors;

-- ============================================================
-- 11. DỮ LIỆU REALTIME TỪ CẢM BIẾN
-- ============================================================
CREATE TABLE sensor_readings (
    reading_id BIGSERIAL PRIMARY KEY,
    sensor_id BIGINT REFERENCES sensors(sensor_id) ON DELETE CASCADE,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    value NUMERIC(12,3)
);

SELECT * FROM sensor_readings;

-- ============================================================
-- 12. CÔNG VIỆC
-- ============================================================
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

SELECT * FROM tasks;

-- ============================================================
-- 13. ẢNH HOÀN THÀNH CÔNG VIỆC
-- ============================================================
CREATE TABLE task_images (
    image_id BIGSERIAL PRIMARY KEY,
    task_id BIGINT REFERENCES tasks(task_id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 14. DANH MỤC CHI PHÍ
-- ============================================================
CREATE TABLE expense_categories (
    category_id SERIAL PRIMARY KEY,
    category_name VARCHAR(100) UNIQUE NOT NULL
);

SELECT * FROM expense_categories;

-- ============================================================
-- 15. CHI PHÍ
-- ============================================================
CREATE TABLE expense_details (
    expense_id BIGSERIAL PRIMARY KEY,
    season_id BIGINT REFERENCES seasons(season_id),
    category_id INT REFERENCES expense_categories(category_id),
    amount NUMERIC(14,2) NOT NULL,
    expense_date DATE NOT NULL,
    note TEXT,
    created_by BIGINT REFERENCES users(user_id)
);

SELECT * FROM expense_details;

-- ============================================================
-- 16. THÔNG BÁO / CẢNH BÁO
-- ============================================================
CREATE TABLE notifications (
    notification_id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(user_id),
    title VARCHAR(200),
    content TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

SELECT * FROM notifications;

-- ============================================================
-- 17. ẢNH TẢI LÊN (AI)
-- ============================================================
CREATE TABLE uploaded_images (
    image_id BIGSERIAL PRIMARY KEY,
    uploaded_by BIGINT REFERENCES users(user_id),
    pond_id BIGINT REFERENCES ponds(pond_id),
    image_url TEXT NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 18. DANH MỤC BỆNH TÔM
-- ============================================================
CREATE TABLE shrimp_diseases (
    disease_id SERIAL PRIMARY KEY,
    disease_name VARCHAR(150) UNIQUE NOT NULL,
    symptoms TEXT,
    treatment TEXT,
    prevention TEXT
);

-- ============================================================
-- 19. KẾT QUẢ AI DỰ ĐOÁN BỆNH
-- ============================================================
CREATE TABLE disease_predictions (
    prediction_id BIGSERIAL PRIMARY KEY,
    image_id BIGINT REFERENCES uploaded_images(image_id),
    disease_id INT REFERENCES shrimp_diseases(disease_id),
    confidence NUMERIC(5,2),
    predicted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 20. AI TƯ VẤN XỬ LÝ
-- ============================================================
CREATE TABLE ai_recommendations (
    recommendation_id BIGSERIAL PRIMARY KEY,
    prediction_id BIGINT REFERENCES disease_predictions(prediction_id) ON DELETE CASCADE,
    recommendation TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- NHẬT KÝ HOẠT ĐỘNG (AUDIT LOG)
-- ============================================================
CREATE TABLE audit_logs (
    audit_id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(user_id),
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50),
    entity_label VARCHAR(100),   -- Nhãn hiển thị: Ao, Mùa vụ, Quản lý, Nhân viên...
    entity_id VARCHAR(100),
    description TEXT,
    details JSON,
    logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index để tăng tốc độ query
CREATE INDEX idx_audit_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logged_at ON audit_logs(logged_at);

SELECT * FROM audit_logs;

-- ============================================================
-- INDEX TĂNG TỐC ĐỘ
-- ============================================================
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_pond_code ON ponds(pond_code);
CREATE INDEX idx_sensor_time ON sensor_readings(recorded_at);
CREATE INDEX idx_task_status ON tasks(status);
CREATE INDEX idx_notification_user ON notifications(user_id);

-- ============================================================
-- VIEW THỐNG KÊ CHI PHÍ MÙA VỤ
-- ============================================================
CREATE VIEW vw_total_expense_by_season AS
SELECT 
    s.season_id,
    s.season_name,
    SUM(e.amount) AS total_expense
FROM seasons s
LEFT JOIN expense_details e ON s.season_id = e.season_id
GROUP BY s.season_id, s.season_name;

-- ============================================================
-- VIEW THỐNG KÊ AO NUÔI
-- ============================================================
CREATE VIEW vw_pond_status AS
SELECT 
    pond_id,
    pond_code,
    pond_name,
    status
FROM ponds;

-- ============================================================
-- 3 TÀI KHOẢN MẪU
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- ADMIN
-- username: admin
-- password: admin123
-- ============================================================
INSERT INTO users (
    full_name,
    username,
    password_hash,
    email,
    phone,
    role_id,
    status
)
VALUES (
    'Administrator',
    'admin',
    crypt('admin123', gen_salt('bf')),
    'admin@shrimpfarm.com',
    '0900000001',
    (SELECT role_id FROM roles WHERE role_name = 'ADMIN'),
    TRUE
);

-- ============================================================
-- QUẢN LÝ
-- username: manager
-- password: manager123
-- ============================================================
INSERT INTO users (
    full_name,
    username,
    password_hash,
    email,
    phone,
    role_id,
    status
)
VALUES (
    'Farm Manager',
    'manager',
    crypt('manager123', gen_salt('bf')),
    'manager@shrimpfarm.com',
    '0900000002',
    (SELECT role_id FROM roles WHERE role_name = 'MANAGER'),
    TRUE
);

-- ============================================================
-- NHÂN VIÊN
-- username: staff
-- password: staff123
-- ============================================================
INSERT INTO users (
    full_name,
    username,
    password_hash,
    email,
    phone,
    role_id,
    status
)
VALUES (
    'Farm Staff',
    'staff',
    crypt('staff123', gen_salt('bf')),
    'staff@shrimpfarm.com',
    '0900000003',
    (SELECT role_id FROM roles WHERE role_name = 'STAFF'),
    TRUE
);

-- ============================================================
-- KIỂM TRA DỮ LIỆU
-- ============================================================
SELECT 
    u.user_id,
    u.full_name,
    u.username,
    r.role_name,
    u.status
FROM users u
JOIN roles r ON u.role_id = r.role_id;