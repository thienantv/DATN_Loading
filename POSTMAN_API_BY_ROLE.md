# 📮 POSTMAN API TESTING COLLECTION - GROUPED BY ROLE
**Base URL**: `http://localhost:3000`  
**Database**: PostgreSQL  
**Test Date**: 29/04/2026

---

## 🧪 TEST ACCOUNTS
```
ADMIN:    admin / admin123
MANAGER:  manager / manager123
STAFF:    staff / staff123
```

---

## 🔐 AUTHENTICATION (SHARED - ALL ROLES)

### 1️⃣ Register New Account
```
POST /api/auth/register
Content-Type: application/json

{
  "full_name": "Nguyễn Văn A",
  "username": "nguyenvana",
  "password": "password123",
  "email": "nguyenvana@example.com",
  "phone": "0987654321"
}

Response (201):
{
  "message": "Registration successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "user_id": 4,
    "username": "nguyenvana",
    "role": "STAFF"
  }
}
```

### 2️⃣ Login
```
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}

Response (200):
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "user_id": 1,
    "username": "admin",
    "role": "ADMIN"
  }
}
```

### 3️⃣ Refresh Token
```
POST /api/auth/refresh-token
Content-Type: application/json
Authorization: Bearer {token}

{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}

Response (200):
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

# 🔐 ADMIN ENDPOINTS (40+ APIs)
**Use token from ADMIN account (admin / admin123)**

## 1. USER MANAGEMENT (10 Endpoints)

### 1️⃣ Get All Users
```
GET /api/users
Authorization: Bearer {ADMIN_TOKEN}

Response (200):
{
  "data": [
    {
      "user_id": 1,
      "full_name": "Admin User",
      "username": "admin",
      "email": "admin@farm.com",
      "phone": "0901234567",
      "role_id": 1,
      "role_name": "ADMIN",
      "status": true,
      "created_at": "2026-04-20T10:00:00Z"
    }
  ]
}
```

### 2️⃣ Create User
```
POST /api/admin/users
Content-Type: application/json
Authorization: Bearer {ADMIN_TOKEN}

{
  "full_name": "Nhân viên mới",
  "username": "nhanvienmoi",
  "password": "password123",
  "email": "nhanvienmoi@farm.com",
  "phone": "0987654322",
  "role_id": 3
}

Response (201):
{
  "message": "User created successfully",
  "user_id": 5
}
```

### 3️⃣ Get User Details
```
GET /api/users/{userId}
Authorization: Bearer {ADMIN_TOKEN}

Response (200):
{
  "user_id": 2,
  "full_name": "Manager User",
  "username": "manager",
  "email": "manager@farm.com",
  "phone": "0912345678",
  "role_id": 2,
  "role_name": "MANAGER",
  "status": true,
  "created_at": "2026-04-20T10:05:00Z"
}
```

### 4️⃣ Update User Info
```
PUT /api/users/{userId}
Content-Type: application/json
Authorization: Bearer {ADMIN_TOKEN}

{
  "full_name": "Manager Được Cập Nhật",
  "email": "manager.updated@farm.com",
  "phone": "0912345679"
}

Response (200):
{
  "message": "User updated successfully"
}
```

### 5️⃣ Update User Role
```
PUT /api/users/{userId}/role
Content-Type: application/json
Authorization: Bearer {ADMIN_TOKEN}

{
  "role_id": 2,
  "role_name": "MANAGER"
}

Response (200):
{
  "message": "User role updated successfully"
}
```

### 6️⃣ Lock User Account
```
PUT /api/users/{userId}/lock
Authorization: Bearer {ADMIN_TOKEN}

Response (200):
{
  "message": "User locked successfully"
}
```

### 7️⃣ Unlock User Account
```
PUT /api/users/{userId}/unlock
Authorization: Bearer {ADMIN_TOKEN}

Response (200):
{
  "message": "User unlocked successfully"
}
```

### 8️⃣ Reset User Password
```
POST /api/users/{userId}/reset-password
Authorization: Bearer {ADMIN_TOKEN}

Response (200):
{
  "message": "Password reset successfully",
  "temporary_password": "TEMP1234"
}
```

### 9️⃣ Delete User
```
DELETE /api/users/{userId}
Authorization: Bearer {ADMIN_TOKEN}

Response (200):
{
  "message": "User deleted successfully"
}
```

### 🔟 Get User Login History
```
GET /api/admin/users/{userId}/login-logs
Authorization: Bearer {ADMIN_TOKEN}

Response (200):
{
  "data": [
    {
      "log_id": 101,
      "user_id": 2,
      "login_time": "2026-04-29T08:30:00Z",
      "ip_address": "192.168.1.100",
      "device_info": "Chrome on Windows 10"
    }
  ]
}
```

---

## 2. PRODUCT MANAGEMENT (5 Endpoints) - ADMIN ONLY

### 1️⃣ Get All Products
```
GET /api/products
Authorization: Bearer {ADMIN_TOKEN}

Response (200):
{
  "data": [
    {
      "product_id": 1,
      "product_name": "Thức ăn tôm 40%",
      "category": "FEED",
      "unit": "kg",
      "price": 25000,
      "description": "Thức ăn tôm chất lượng cao"
    }
  ]
}
```

### 2️⃣ Get Products by Category
```
GET /api/products/category/FEED
Authorization: Bearer {ADMIN_TOKEN}

Response (200):
{
  "data": [
    {
      "product_id": 1,
      "product_name": "Thức ăn tôm 40%",
      "category": "FEED",
      "unit": "kg",
      "price": 25000,
      "description": "Thức ăn tôm chất lượng cao"
    }
  ]
}
```

### 3️⃣ Create Product
```
POST /api/products
Content-Type: application/json
Authorization: Bearer {ADMIN_TOKEN}

{
  "product_name": "Thức ăn tôm 40% mới",
  "category": "FEED",
  "unit": "kg",
  "price": 26000,
  "description": "Thức ăn tôm chất lượng cao nhất thị trường"
}

Response (201):
{
  "message": "Product created successfully",
  "product_id": 2
}
```

### 4️⃣ Update Product
```
PUT /api/products/{productId}
Content-Type: application/json
Authorization: Bearer {ADMIN_TOKEN}

{
  "product_name": "Thức ăn tôm 40% - phiên bản mới",
  "category": "FEED",
  "unit": "kg",
  "price": 27000,
  "description": "Cập nhật công thức"
}

Response (200):
{
  "message": "Product updated successfully"
}
```

### 5️⃣ Delete Product
```
DELETE /api/products/{productId}
Authorization: Bearer {ADMIN_TOKEN}

Response (200):
{
  "message": "Product deleted successfully"
}
```

---

## 3. DISEASE MANAGEMENT (5 Endpoints) - ADMIN ONLY

### 1️⃣ Get All Diseases
```
GET /api/diseases
Authorization: Bearer {ADMIN_TOKEN}

Response (200):
{
  "data": [
    {
      "disease_id": 1,
      "disease_name": "Bệnh đốm trắng",
      "symptoms": "Tôm có đốm trắng trên vỏ",
      "treatment": "Dùng thuốc X, giảm mật độ",
      "prevention": "Giữ nước sạch, kiểm tra thường xuyên"
    }
  ]
}
```

### 2️⃣ Get Disease Details
```
GET /api/diseases/{diseaseId}
Authorization: Bearer {ADMIN_TOKEN}

Response (200):
{
  "disease_id": 1,
  "disease_name": "Bệnh đốm trắng",
  "symptoms": "Tôm có đốm trắng trên vỏ",
  "treatment": "Dùng thuốc X, giảm mật độ",
  "prevention": "Giữ nước sạch, kiểm tra thường xuyên"
}
```

### 3️⃣ Create Disease
```
POST /api/diseases
Content-Type: application/json
Authorization: Bearer {ADMIN_TOKEN}

{
  "disease_name": "Bệnh A",
  "symptoms": "Triệu chứng của bệnh A",
  "treatment": "Cách điều trị",
  "prevention": "Cách phòng ngừa"
}

Response (201):
{
  "message": "Disease created successfully",
  "disease_id": 2
}
```

### 4️⃣ Update Disease
```
PUT /api/diseases/{diseaseId}
Content-Type: application/json
Authorization: Bearer {ADMIN_TOKEN}

{
  "disease_name": "Bệnh A - cập nhật",
  "symptoms": "Triệu chứng cập nhật",
  "treatment": "Cách điều trị cập nhật",
  "prevention": "Cách phòng ngừa cập nhật"
}

Response (200):
{
  "message": "Disease updated successfully"
}
```

### 5️⃣ Delete Disease
```
DELETE /api/diseases/{diseaseId}
Authorization: Bearer {ADMIN_TOKEN}

Response (200):
{
  "message": "Disease deleted successfully"
}
```

---

## 4. SENSOR MANAGEMENT (8 Endpoints) - ADMIN ONLY

### 1️⃣ Get Sensors by Pond
```
GET /api/sensors/pond/{pondId}
Authorization: Bearer {ADMIN_TOKEN}

Response (200):
{
  "data": [
    {
      "sensor_id": 1,
      "pond_id": 1,
      "sensor_name": "Cảm biến pH ao 1",
      "sensor_type": "PH",
      "serial_number": "SN-001",
      "status": "ACTIVE"
    }
  ]
}
```

### 2️⃣ Get Sensor Details
```
GET /api/sensors/{sensorId}
Authorization: Bearer {ADMIN_TOKEN}

Response (200):
{
  "sensor_id": 1,
  "pond_id": 1,
  "sensor_name": "Cảm biến pH ao 1",
  "sensor_type": "PH",
  "serial_number": "SN-001",
  "status": "ACTIVE"
}
```

### 3️⃣ Get Sensor Readings
```
GET /api/sensors/{sensorId}/readings
Authorization: Bearer {ADMIN_TOKEN}

Response (200):
{
  "data": [
    {
      "reading_id": 1,
      "sensor_id": 1,
      "recorded_at": "2026-04-29T09:00:00Z",
      "value": 7.5
    }
  ]
}
```

### 4️⃣ Get Readings by Date Range
```
GET /api/sensors/readings/range?sensorId=1&startDate=2026-04-01&endDate=2026-04-29
Authorization: Bearer {ADMIN_TOKEN}

Response (200):
{
  "data": [
    {
      "reading_id": 1,
      "sensor_id": 1,
      "recorded_at": "2026-04-29T09:00:00Z",
      "value": 7.5
    }
  ]
}
```

### 5️⃣ Create Sensor
```
POST /api/sensors
Content-Type: application/json
Authorization: Bearer {ADMIN_TOKEN}

{
  "pond_id": 1,
  "sensor_name": "Cảm biến nhiệt độ ao 1",
  "sensor_type": "TEMPERATURE",
  "serial_number": "SN-002"
}

Response (201):
{
  "message": "Sensor created successfully",
  "sensor_id": 2
}
```

### 6️⃣ Update Sensor
```
PUT /api/sensors/{sensorId}
Content-Type: application/json
Authorization: Bearer {ADMIN_TOKEN}

{
  "sensor_name": "Cảm biến nhiệt độ ao 1 - cập nhật",
  "sensor_type": "TEMPERATURE",
  "serial_number": "SN-002-V2"
}

Response (200):
{
  "message": "Sensor updated successfully"
}
```

### 7️⃣ Delete Sensor
```
DELETE /api/sensors/{sensorId}
Authorization: Bearer {ADMIN_TOKEN}

Response (200):
{
  "message": "Sensor deleted successfully"
}
```

### 8️⃣ Create Sensor Reading
```
POST /api/sensors/readings
Content-Type: application/json
Authorization: Bearer {ADMIN_TOKEN}

{
  "sensor_id": 1,
  "recorded_at": "2026-04-29T09:00:00Z",
  "value": 7.5
}

Response (201):
{
  "message": "Reading recorded successfully",
  "reading_id": 1
}
```

---

## 5. BACKUP & SYSTEM MANAGEMENT (4 Endpoints) - ADMIN ONLY

### 1️⃣ Backup Database
```
POST /api/admin/backup
Authorization: Bearer {ADMIN_TOKEN}

Response (201):
{
  "message": "Backup created successfully",
  "backup_id": "backup-2026-04-29-100000",
  "timestamp": "2026-04-29T10:00:00Z"
}
```

### 2️⃣ Get Backups List
```
GET /api/admin/backups
Authorization: Bearer {ADMIN_TOKEN}

Response (200):
{
  "data": [
    {
      "backup_id": "backup-2026-04-29-100000",
      "created_at": "2026-04-29T10:00:00Z",
      "size_mb": 50
    }
  ]
}
```

### 3️⃣ Restore from Backup
```
POST /api/admin/restore/{backupId}
Authorization: Bearer {ADMIN_TOKEN}

Response (200):
{
  "message": "Restore started successfully",
  "backup_id": "backup-2026-04-29-100000"
}
```

### 4️⃣ Get Activity Logs
```
GET /api/admin/activity-logs
Authorization: Bearer {ADMIN_TOKEN}

Response (200):
{
  "data": [
    {
      "log_id": 1,
      "user_id": 2,
      "action": "created_season",
      "resource": "Season 1",
      "timestamp": "2026-04-29T08:00:00Z"
    }
  ]
}
```

---

## 6. REPORTS & STATISTICS (8 Endpoints) - ADMIN ONLY

### 1️⃣ System Overview Stats
```
GET /api/admin/stats/overview
Authorization: Bearer {ADMIN_TOKEN}

Response (200):
{
  "total_users": 10,
  "total_ponds": 5,
  "active_seasons": 3,
  "total_expenses": 50000000,
  "total_yield": 25000
}
```

### 2️⃣ User Statistics
```
GET /api/admin/stats/users
Authorization: Bearer {ADMIN_TOKEN}

Response (200):
{
  "data": [
    {
      "user_id": 1,
      "username": "admin",
      "role": "ADMIN",
      "status": "ACTIVE",
      "created_at": "2026-04-20T10:00:00Z"
    }
  ]
}
```

### 3️⃣ Pond Statistics
```
GET /api/admin/stats/ponds
Authorization: Bearer {ADMIN_TOKEN}

Response (200):
{
  "data": [
    {
      "pond_id": 1,
      "pond_name": "Ao 1",
      "status": "ACTIVE",
      "area_m2": 500,
      "max_density": 100
    }
  ]
}
```

### 4️⃣ Season Statistics
```
GET /api/admin/stats/seasons
Authorization: Bearer {ADMIN_TOKEN}

Response (200):
{
  "data": [
    {
      "season_id": 1,
      "season_name": "Mùa vụ 1",
      "status": "RUNNING",
      "start_date": "2026-01-01",
      "expected_harvest": "2026-04-01"
    }
  ]
}
```

### 5️⃣ Production Report
```
GET /api/admin/reports/production
Authorization: Bearer {ADMIN_TOKEN}

Response (200):
{
  "total_ponds": 5,
  "active_seasons": 3,
  "total_expected_yield": 75000,
  "seasonal_details": [
    {
      "season_id": 1,
      "season_name": "Mùa vụ 1",
      "pond_name": "Ao 1",
      "quantity_seed": 50000,
      "expected_yield": 25000
    }
  ]
}
```

### 6️⃣ Financial Report
```
GET /api/admin/reports/financial
Authorization: Bearer {ADMIN_TOKEN}

Response (200):
{
  "total_expenses": 50000000,
  "by_category": [
    {
      "category": "Chi phí thức ăn",
      "total": 20000000
    }
  ],
  "by_season": [
    {
      "season_id": 1,
      "total_expenses": 15000000
    }
  ]
}
```

### 7️⃣ Health Report
```
GET /api/admin/reports/health
Authorization: Bearer {ADMIN_TOKEN}

Response (200):
{
  "diseases_reported": 5,
  "affected_ponds": 2,
  "treatment_started": 4,
  "resolved": 3,
  "details": [
    {
      "disease_id": 1,
      "disease_name": "Bệnh đốm trắng",
      "pond_id": 1,
      "confirmed_date": "2026-04-25"
    }
  ]
}
```

---

## 7. AI MANAGEMENT (5 Endpoints) - ADMIN ONLY

### 1️⃣ Get AI Training Data
```
GET /api/admin/ai/training-data
Authorization: Bearer {ADMIN_TOKEN}

Response (200):
{
  "data": [
    {
      "id": 1,
      "image_id": 1,
      "disease_id": 1,
      "label": "Bệnh đốm trắng",
      "created_at": "2026-04-29T08:00:00Z"
    }
  ]
}
```

### 2️⃣ Add AI Training Data
```
POST /api/admin/ai/training-data
Content-Type: multipart/form-data
Authorization: Bearer {ADMIN_TOKEN}

file: <image_file>
disease_id: 1

Response (201):
{
  "message": "Training data added successfully",
  "id": 2
}
```

### 3️⃣ Get AI Predictions
```
GET /api/admin/ai/predictions
Authorization: Bearer {ADMIN_TOKEN}

Response (200):
{
  "data": [
    {
      "prediction_id": 1,
      "image_id": 1,
      "disease_id": 1,
      "confidence": 0.95,
      "predicted_at": "2026-04-29T10:00:00Z"
    }
  ]
}
```

### 4️⃣ Update AI Model
```
POST /api/admin/ai/model/update
Content-Type: application/json
Authorization: Bearer {ADMIN_TOKEN}

{
  "model_version": "2.0",
  "training_epochs": 100
}

Response (200):
{
  "message": "AI model update started successfully"
}
```

### 5️⃣ Get AI Model Status
```
GET /api/admin/ai/model/status
Authorization: Bearer {ADMIN_TOKEN}

Response (200):
{
  "model_version": "2.0",
  "status": "TRAINING",
  "accuracy": 0.92,
  "last_updated": "2026-04-29T08:00:00Z"
}
```

---

---

# 🧠 MANAGER ENDPOINTS (30+ APIs)
**Use token from MANAGER account (manager / manager123)**

## 1. POND MANAGEMENT (6 Endpoints)

### 1️⃣ Get All Ponds
```
GET /api/ponds
Authorization: Bearer {MANAGER_TOKEN}

Response (200):
{
  "data": [
    {
      "pond_id": 1,
      "pond_code": "AO-001",
      "pond_name": "Ao nuôi số 1",
      "area_m2": 500,
      "depth_m": 2.5,
      "max_density": 100,
      "status": "ACTIVE",
      "assigned_staff": 3
    }
  ]
}
```

### 2️⃣ Create Pond
```
POST /api/ponds
Content-Type: application/json
Authorization: Bearer {MANAGER_TOKEN}

{
  "pond_code": "AO-002",
  "pond_name": "Ao nuôi số 2",
  "area_m2": 600,
  "depth_m": 3.0,
  "max_density": 120,
  "assigned_staff": 3
}

Response (201):
{
  "message": "Pond created successfully",
  "pond_id": 2
}
```

### 3️⃣ Get Pond Details
```
GET /api/ponds/{pondId}
Authorization: Bearer {MANAGER_TOKEN}

Response (200):
{
  "pond_id": 1,
  "pond_code": "AO-001",
  "pond_name": "Ao nuôi số 1",
  "area_m2": 500,
  "depth_m": 2.5,
  "max_density": 100,
  "status": "ACTIVE",
  "assigned_staff": 3
}
```

### 4️⃣ Update Pond
```
PUT /api/ponds/{pondId}
Content-Type: application/json
Authorization: Bearer {MANAGER_TOKEN}

{
  "pond_code": "AO-001-UPDATED",
  "pond_name": "Ao nuôi số 1 - cập nhật",
  "area_m2": 550,
  "depth_m": 2.8,
  "max_density": 110,
  "assigned_staff": 4
}

Response (200):
{
  "message": "Pond updated successfully"
}
```

### 5️⃣ Update Pond Status (MANAGER ONLY)
```
PATCH /api/ponds/{pondId}/status
Content-Type: application/json
Authorization: Bearer {MANAGER_TOKEN}

{
  "status": "INACTIVE"
}

Response (200):
{
  "message": "Pond status updated successfully"
}
```

### 6️⃣ Delete Pond
```
DELETE /api/ponds/{pondId}
Authorization: Bearer {MANAGER_TOKEN}

Response (200):
{
  "message": "Pond deleted successfully"
}
```

---

## 2. SEASON MANAGEMENT (6 Endpoints - MANAGER ONLY)

### 1️⃣ Get All Seasons
```
GET /api/seasons
Authorization: Bearer {MANAGER_TOKEN}

Response (200):
{
  "data": [
    {
      "season_id": 1,
      "pond_id": 1,
      "season_name": "Mùa vụ 1 năm 2026",
      "start_date": "2026-01-01",
      "expected_harvest": "2026-04-01",
      "actual_harvest": null,
      "shrimp_type": "Tôm sú",
      "quantity_seed": 50000,
      "density": 100,
      "status": "RUNNING",
      "note": "Mùa vụ chính"
    }
  ]
}
```

### 2️⃣ Get Season Details
```
GET /api/seasons/{seasonId}
Authorization: Bearer {MANAGER_TOKEN}

Response (200):
{
  "season_id": 1,
  "pond_id": 1,
  "season_name": "Mùa vụ 1 năm 2026",
  "start_date": "2026-01-01",
  "expected_harvest": "2026-04-01",
  "actual_harvest": null,
  "shrimp_type": "Tôm sú",
  "quantity_seed": 50000,
  "density": 100,
  "status": "RUNNING",
  "note": "Mùa vụ chính"
}
```

### 3️⃣ Create Season
```
POST /api/seasons
Content-Type: application/json
Authorization: Bearer {MANAGER_TOKEN}

{
  "pond_id": 1,
  "season_name": "Mùa vụ 2 năm 2026",
  "start_date": "2026-05-01",
  "expected_harvest": "2026-08-01",
  "shrimp_type": "Tôm sú",
  "quantity_seed": 50000,
  "density": 100,
  "note": "Mùa vụ 2"
}

Response (201):
{
  "message": "Season created successfully",
  "season_id": 2
}
```

### 4️⃣ Update Season
```
PUT /api/seasons/{seasonId}
Content-Type: application/json
Authorization: Bearer {MANAGER_TOKEN}

{
  "season_name": "Mùa vụ 1 cập nhật",
  "expected_harvest": "2026-04-15",
  "note": "Cập nhật dự kiến"
}

Response (200):
{
  "message": "Season updated successfully"
}
```

### 5️⃣ Harvest Season (Close Season)
```
POST /api/seasons/{seasonId}/harvest
Content-Type: application/json
Authorization: Bearer {MANAGER_TOKEN}

{
  "actual_harvest": "2026-04-10",
  "total_yield_kg": 5000,
  "notes": "Năng suất cao hơn dự kiến"
}

Response (200):
{
  "message": "Season harvested successfully"
}
```

### 6️⃣ Delete Season
```
DELETE /api/seasons/{seasonId}
Authorization: Bearer {MANAGER_TOKEN}

Response (200):
{
  "message": "Season deleted successfully"
}

Note: Không thể xóa mùa vụ đang RUNNING
```

---

## 3. CULTIVATION LOG MANAGEMENT (6 Endpoints)

### 1️⃣ Get Cultivation Logs by Season
```
GET /api/cultivation-logs/season/{seasonId}
Authorization: Bearer {MANAGER_TOKEN}

Response (200):
{
  "data": [
    {
      "log_id": 1,
      "season_id": 1,
      "log_date": "2026-04-29",
      "action_type": "FEEDING",
      "description": "Cho ăn lúc 7h sáng",
      "created_by": 3,
      "approval_status": "PENDING",
      "created_at": "2026-04-29T07:00:00Z"
    }
  ]
}
```

### 2️⃣ Get Cultivation Log Details
```
GET /api/cultivation-logs/{logId}
Authorization: Bearer {MANAGER_TOKEN}

Response (200):
{
  "log_id": 1,
  "season_id": 1,
  "log_date": "2026-04-29",
  "action_type": "FEEDING",
  "description": "Cho ăn lúc 7h sáng",
  "created_by": 3,
  "approval_status": "PENDING",
  "created_at": "2026-04-29T07:00:00Z"
}
```

### 3️⃣ Approve Cultivation Log
```
POST /api/cultivation-logs/{logId}/approve
Authorization: Bearer {MANAGER_TOKEN}

Response (200):
{
  "message": "Cultivation log approved successfully"
}

Effect: approval_status = "APPROVED", approved_by = manager_id, approved_at = now()
```

### 4️⃣ Reject Cultivation Log
```
POST /api/cultivation-logs/{logId}/reject
Content-Type: application/json
Authorization: Bearer {MANAGER_TOKEN}

{
  "reason": "Không có chi tiết, yêu cầu nhập lại"
}

Response (200):
{
  "message": "Cultivation log rejected successfully"
}

Effect: approval_status = "REJECTED", rejected_by = manager_id
```

### 5️⃣ Lock Date Logs (MANAGER ONLY)
```
POST /api/cultivation-logs/season/{seasonId}/lock-date
Content-Type: application/json
Authorization: Bearer {MANAGER_TOKEN}

{
  "lock_date": "2026-04-28"
}

Response (200):
{
  "message": "Logs locked for date successfully"
}

Note: Khóa tất cả nhật ký trước ngày chỉ định để không chỉnh sửa
```

---

## 4. ENVIRONMENT LOG MANAGEMENT (2 Endpoints)

### 1️⃣ Get Environment Logs by Season
```
GET /api/environment-logs/season/{seasonId}
Authorization: Bearer {MANAGER_TOKEN}

Response (200):
{
  "data": [
    {
      "env_id": 1,
      "season_id": 1,
      "recorded_at": "2026-04-29T09:00:00Z",
      "ph": 7.5,
      "temperature": 28.5,
      "salinity": 25,
      "oxygen": 6.8,
      "nh3": 0.02,
      "created_by": 3,
      "created_at": "2026-04-29T09:00:00Z"
    }
  ]
}
```

### 2️⃣ Set Environment Thresholds (MANAGER ONLY)
```
POST /api/environment-logs/season/{seasonId}/thresholds
Content-Type: application/json
Authorization: Bearer {MANAGER_TOKEN}

{
  "ph_min": 7.0,
  "ph_max": 8.0,
  "temperature_min": 26,
  "temperature_max": 30,
  "salinity_min": 20,
  "salinity_max": 30,
  "oxygen_min": 6.0,
  "nh3_max": 0.05
}

Response (201):
{
  "message": "Thresholds set successfully",
  "threshold_id": 1
}
```

---

## 5. EXPENSE MANAGEMENT (5 Endpoints)

### 1️⃣ Get Expenses by Season
```
GET /api/expenses/season/{seasonId}
Authorization: Bearer {MANAGER_TOKEN}

Response (200):
{
  "data": [
    {
      "expense_id": 1,
      "season_id": 1,
      "category_id": 1,
      "category_name": "Chi phí thức ăn",
      "amount": 5000000,
      "expense_date": "2026-04-29",
      "note": "Mua thức ăn tôm",
      "created_by": 3,
      "approval_status": "PENDING",
      "created_at": "2026-04-29T08:00:00Z"
    }
  ]
}
```

### 2️⃣ Update Expense (PENDING Only)
```
PUT /api/expenses/{expenseId}
Content-Type: application/json
Authorization: Bearer {MANAGER_TOKEN}

{
  "category_id": 1,
  "amount": 5500000,
  "expense_date": "2026-04-29",
  "note": "Mua thức ăn tôm - cập nhật số lượng"
}

Response (200):
{
  "message": "Expense updated successfully"
}

Note: Không thể sửa nếu approval_status != "PENDING"
```

### 3️⃣ Approve Expense
```
POST /api/expenses/{expenseId}/approve
Authorization: Bearer {MANAGER_TOKEN}

Response (200):
{
  "message": "Expense approved successfully"
}

Effect: approval_status = "APPROVED", approved_by = manager_id
```

### 4️⃣ Reject Expense
```
POST /api/expenses/{expenseId}/reject
Content-Type: application/json
Authorization: Bearer {MANAGER_TOKEN}

{
  "reason": "Chi phí quá cao, yêu cầu tìm nguồn rẻ hơn"
}

Response (200):
{
  "message": "Expense rejected successfully"
}

Effect: approval_status = "REJECTED", rejected_by = manager_id
```

### 5️⃣ Delete Expense (PENDING Only)
```
DELETE /api/expenses/{expenseId}
Authorization: Bearer {MANAGER_TOKEN}

Response (200):
{
  "message": "Expense deleted successfully"
}

Note: Chỉ xóa được nếu approval_status = "PENDING"
```

---

## 6. TASK MANAGEMENT (4 Endpoints)

### 1️⃣ Get All Tasks
```
GET /api/tasks
Authorization: Bearer {MANAGER_TOKEN}

Response (200):
{
  "data": [
    {
      "task_id": 1,
      "season_id": 1,
      "task_title": "Vệ sinh ao",
      "description": "Vệ sinh sàn ao, loại cỏ",
      "assigned_to": 3,
      "assigned_by": 2,
      "due_date": "2026-04-30",
      "status": "PENDING",
      "created_at": "2026-04-29T10:00:00Z"
    }
  ]
}
```

### 2️⃣ Create Task
```
POST /api/tasks
Content-Type: application/json
Authorization: Bearer {MANAGER_TOKEN}

{
  "season_id": 1,
  "task_title": "Vệ sinh ao",
  "description": "Vệ sinh sàn ao, loại cỏ mọc bên trong",
  "assigned_to": 3,
  "due_date": "2026-04-30"
}

Response (201):
{
  "message": "Task created successfully",
  "task_id": 2
}
```

### 3️⃣ Update Task
```
PUT /api/tasks/{taskId}
Content-Type: application/json
Authorization: Bearer {MANAGER_TOKEN}

{
  "task_title": "Vệ sinh ao - cập nhật",
  "description": "Vệ sinh sàn ao, loại cỏ mọc bên trong, kiểm tra rạn",
  "assigned_to": 4,
  "due_date": "2026-05-01"
}

Response (200):
{
  "message": "Task updated successfully"
}
```

### 4️⃣ Delete Task
```
DELETE /api/tasks/{taskId}
Authorization: Bearer {MANAGER_TOKEN}

Response (200):
{
  "message": "Task deleted successfully"
}
```

---

## 7. DISEASE MANAGEMENT (2 Endpoints)

### 1️⃣ Get All Diseases
```
GET /api/diseases
Authorization: Bearer {MANAGER_TOKEN}

Response (200):
{
  "data": [
    {
      "disease_id": 1,
      "disease_name": "Bệnh đốm trắng",
      "symptoms": "Tôm có đốm trắng trên vỏ",
      "treatment": "Dùng thuốc X, giảm mật độ",
      "prevention": "Giữ nước sạch, kiểm tra thường xuyên"
    }
  ]
}
```

### 2️⃣ Confirm Disease Diagnosis (MANAGER ONLY)
```
POST /api/diseases/{diseaseId}/confirm
Content-Type: application/json
Authorization: Bearer {MANAGER_TOKEN}

{
  "pond_id": 1,
  "confirmed_date": "2026-04-29",
  "treatment_started": true,
  "notes": "Bắt đầu điều trị với thuốc X"
}

Response (200):
{
  "message": "Disease confirmed successfully"
}
```

---

## 8. READ-ONLY ACCESS FOR MANAGER

- Feed Logs: View only (GET)
- Notifications: View all
- Products: View by category
- Sensors: View readings

---

---

# 👷 STAFF ENDPOINTS (20+ APIs)
**Use token from STAFF account (staff / staff123)**

## 1. POND VIEWING (2 Endpoints - Assigned Ponds Only)

### 1️⃣ Get All Ponds (STAFF - Assigned Only)
```
GET /api/ponds
Authorization: Bearer {STAFF_TOKEN}

Response (200):
{
  "data": [
    {
      "pond_id": 1,
      "pond_code": "AO-001",
      "pond_name": "Ao nuôi số 1",
      "area_m2": 500,
      "depth_m": 2.5,
      "max_density": 100,
      "status": "ACTIVE",
      "assigned_staff": 3
    }
  ]
}

Note: STAFF chỉ thấy ao được gán (assigned_staff = user_id của STAFF)
```

### 2️⃣ Get Pond Details (STAFF - Assigned Only)
```
GET /api/ponds/{pondId}
Authorization: Bearer {STAFF_TOKEN}

Response (200):
{
  "pond_id": 1,
  "pond_code": "AO-001",
  "pond_name": "Ao nuôi số 1",
  "area_m2": 500,
  "depth_m": 2.5,
  "max_density": 100,
  "status": "ACTIVE",
  "assigned_staff": 3
}
```

---

## 2. CULTIVATION LOG MANAGEMENT (3 Endpoints)

### 1️⃣ Get Cultivation Logs by Season
```
GET /api/cultivation-logs/season/{seasonId}
Authorization: Bearer {STAFF_TOKEN}

Response (200):
{
  "data": [
    {
      "log_id": 1,
      "season_id": 1,
      "log_date": "2026-04-29",
      "action_type": "FEEDING",
      "description": "Cho ăn lúc 7h sáng",
      "created_by": 3,
      "approval_status": "PENDING",
      "created_at": "2026-04-29T07:00:00Z"
    }
  ]
}
```

### 2️⃣ Create Cultivation Log (STAFF)
```
POST /api/cultivation-logs
Content-Type: application/json
Authorization: Bearer {STAFF_TOKEN}

{
  "season_id": 1,
  "log_date": "2026-04-29",
  "action_type": "FEEDING",
  "description": "Cho ăn lúc 7h sáng, tôm ăn tốt"
}

Response (201):
{
  "message": "Cultivation log created successfully",
  "log_id": 2
}

Note: Tự động tạo với approval_status = "PENDING"
```

### 3️⃣ Update Cultivation Log (PENDING Only)
```
PUT /api/cultivation-logs/{logId}
Content-Type: application/json
Authorization: Bearer {STAFF_TOKEN}

{
  "log_date": "2026-04-29",
  "action_type": "FEEDING",
  "description": "Cho ăn lúc 7h sáng, tôm ăn rất tốt"
}

Response (200):
{
  "message": "Cultivation log updated successfully"
}

Note: Không thể sửa nếu approval_status != "PENDING"
```

---

## 3. ENVIRONMENT LOG ENTRY (2 Endpoints)

### 1️⃣ Get Environment Logs by Season
```
GET /api/environment-logs/season/{seasonId}
Authorization: Bearer {STAFF_TOKEN}

Response (200):
{
  "data": [
    {
      "env_id": 1,
      "season_id": 1,
      "recorded_at": "2026-04-29T09:00:00Z",
      "ph": 7.5,
      "temperature": 28.5,
      "salinity": 25,
      "oxygen": 6.8,
      "nh3": 0.02,
      "created_by": 3,
      "created_at": "2026-04-29T09:00:00Z"
    }
  ]
}
```

### 2️⃣ Create Environment Log (STAFF)
```
POST /api/environment-logs
Content-Type: application/json
Authorization: Bearer {STAFF_TOKEN}

{
  "season_id": 1,
  "recorded_at": "2026-04-29T09:00:00Z",
  "ph": 7.5,
  "temperature": 28.5,
  "salinity": 25,
  "oxygen": 6.8,
  "nh3": 0.02
}

Response (201):
{
  "message": "Environment log created successfully",
  "env_id": 2
}
```

---

## 4. FEED LOG MANAGEMENT (3 Endpoints)

### 1️⃣ Get Feed Logs by Season
```
GET /api/feed-logs/season/{seasonId}
Authorization: Bearer {STAFF_TOKEN}

Response (200):
{
  "data": [
    {
      "feed_log_id": 1,
      "season_id": 1,
      "product_id": 1,
      "product_name": "Thức ăn tôm 40%",
      "feeding_date": "2026-04-29",
      "feeding_time": "07:00",
      "meal_no": 1,
      "quantity_kg": 10,
      "created_by": 3,
      "note": "Cho ăn bữa sáng",
      "created_at": "2026-04-29T07:00:00Z"
    }
  ]
}
```

### 2️⃣ Create Feed Log (STAFF)
```
POST /api/feed-logs
Content-Type: application/json
Authorization: Bearer {STAFF_TOKEN}

{
  "season_id": 1,
  "product_id": 1,
  "feeding_date": "2026-04-29",
  "feeding_time": "07:00",
  "meal_no": 1,
  "quantity_kg": 10,
  "note": "Cho ăn bữa sáng, tôm ăn tốt"
}

Response (201):
{
  "message": "Feed log created successfully",
  "feed_log_id": 2
}
```

### 3️⃣ Update Feed Log (STAFF)
```
PUT /api/feed-logs/{feedLogId}
Content-Type: application/json
Authorization: Bearer {STAFF_TOKEN}

{
  "feeding_date": "2026-04-29",
  "feeding_time": "07:30",
  "meal_no": 1,
  "quantity_kg": 12,
  "note": "Cho ăn bữa sáng, tôm ăn rất tốt"
}

Response (200):
{
  "message": "Feed log updated successfully"
}
```

---

## 5. TASK MANAGEMENT (3 Endpoints - STAFF)

### 1️⃣ Get Assigned Tasks (STAFF Only)
```
GET /api/tasks/assigned-to-me
Authorization: Bearer {STAFF_TOKEN}

Response (200):
{
  "data": [
    {
      "task_id": 1,
      "season_id": 1,
      "task_title": "Vệ sinh ao",
      "description": "Vệ sinh sàn ao, loại cỏ",
      "assigned_to": 3,
      "assigned_by": 2,
      "due_date": "2026-04-30",
      "status": "PENDING"
    }
  ]
}
```

### 2️⃣ Update Task Status (STAFF Only)
```
PATCH /api/tasks/{taskId}/status
Content-Type: application/json
Authorization: Bearer {STAFF_TOKEN}

{
  "status": "COMPLETED"
}

Response (200):
{
  "message": "Task status updated successfully"
}

Note: Status values: PENDING, IN_PROGRESS, COMPLETED
```

### 3️⃣ Upload Task Image (STAFF)
```
POST /api/tasks/{taskId}/upload-image
Content-Type: multipart/form-data
Authorization: Bearer {STAFF_TOKEN}

file: <image_file>

Response (201):
{
  "message": "Image uploaded successfully",
  "image_id": 1,
  "image_url": "/uploads/tasks/task-1-image.jpg"
}
```

---

## 6. EXPENSE REQUEST (1 Endpoint)

### 1️⃣ Create Expense Request (STAFF)
```
POST /api/expenses
Content-Type: application/json
Authorization: Bearer {STAFF_TOKEN}

{
  "season_id": 1,
  "category_id": 1,
  "amount": 5000000,
  "expense_date": "2026-04-29",
  "note": "Mua thức ăn tôm cho ao 1"
}

Response (201):
{
  "message": "Expense created successfully",
  "expense_id": 2
}

Note: Tự động tạo với approval_status = "PENDING" (chờ MANAGER duyệt)
```

---

## 7. DISEASE REPORTING (3 Endpoints)

### 1️⃣ Get All Diseases
```
GET /api/diseases
Authorization: Bearer {STAFF_TOKEN}

Response (200):
{
  "data": [
    {
      "disease_id": 1,
      "disease_name": "Bệnh đốm trắng",
      "symptoms": "Tôm có đốm trắng trên vỏ",
      "treatment": "Dùng thuốc X, giảm mật độ",
      "prevention": "Giữ nước sạch, kiểm tra thường xuyên"
    }
  ]
}
```

### 2️⃣ Upload Disease Image (STAFF)
```
POST /api/diseases/upload-image
Content-Type: multipart/form-data
Authorization: Bearer {STAFF_TOKEN}

file: <image_file>
pond_id: 1

Response (201):
{
  "message": "Image uploaded successfully",
  "image_id": 1,
  "image_url": "/uploads/diseases/disease-1-image.jpg"
}
```

### 3️⃣ Get AI Disease Prediction
```
GET /api/diseases/predictions/{imageId}
Authorization: Bearer {STAFF_TOKEN}

Response (200):
{
  "prediction_id": 1,
  "image_id": 1,
  "disease_id": 1,
  "disease_name": "Bệnh đốm trắng",
  "confidence": 0.95,
  "predicted_at": "2026-04-29T10:00:00Z"
}
```

---

## 8. READ-ONLY ACCESS FOR STAFF

### 1️⃣ Get Seasons
```
GET /api/seasons
Authorization: Bearer {STAFF_TOKEN}

Response (200): Danh sách mùa vụ
```

### 2️⃣ Get Season Details
```
GET /api/seasons/{seasonId}
Authorization: Bearer {STAFF_TOKEN}

Response (200): Chi tiết mùa vụ
```

### 3️⃣ Get Environment Thresholds
```
GET /api/environment-logs/season/{seasonId}/thresholds
Authorization: Bearer {STAFF_TOKEN}

Response (200): Ngưỡng cảnh báo
```

### 4️⃣ Get Latest Environment Data
```
GET /api/environment-logs/season/{seasonId}/latest
Authorization: Bearer {STAFF_TOKEN}

Response (200): Dữ liệu môi trường mới nhất
```

### 5️⃣ Get All Expenses
```
GET /api/expenses/season/{seasonId}
Authorization: Bearer {STAFF_TOKEN}

Response (200): Danh sách chi phí
```

### 6️⃣ Get All Tasks
```
GET /api/tasks
Authorization: Bearer {STAFF_TOKEN}

Response (200): Danh sách công việc
```

### 7️⃣ Get All Products
```
GET /api/products
Authorization: Bearer {STAFF_TOKEN}

Response (200): Danh sách sản phẩm
```

### 8️⃣ Get Products by Category
```
GET /api/products/category/FEED
Authorization: Bearer {STAFF_TOKEN}

Response (200): Danh sách sản phẩm theo loại
```

### 9️⃣ Get Sensors by Pond
```
GET /api/sensors/pond/{pondId}
Authorization: Bearer {STAFF_TOKEN}

Response (200): Danh sách cảm biến
```

### 🔟 Get Sensor Readings
```
GET /api/sensors/{sensorId}/readings
Authorization: Bearer {STAFF_TOKEN}

Response (200): Dữ liệu cảm biến
```

### 1️⃣1️⃣ Get My Notifications
```
GET /api/notifications
Authorization: Bearer {STAFF_TOKEN}

Response (200):
{
  "data": [
    {
      "notification_id": 1,
      "user_id": 3,
      "title": "Nhật ký cần duyệt",
      "content": "Bạn có 1 nhật ký canh tác chờ duyệt",
      "is_read": false,
      "created_at": "2026-04-29T10:00:00Z"
    }
  ]
}
```

### 1️⃣2️⃣ Mark Notification as Read
```
PUT /api/notifications/{notificationId}/read
Authorization: Bearer {STAFF_TOKEN}

Response (200):
{
  "message": "Notification marked as read"
}
```

### 1️⃣3️⃣ Delete Notification
```
DELETE /api/notifications/{notificationId}
Authorization: Bearer {STAFF_TOKEN}

Response (200):
{
  "message": "Notification deleted successfully"
}
```

---

## RESTRICTIONS FOR STAFF

❌ **STAFF CANNOT:**
- Create/update/delete ponds
- Create/update/delete seasons
- Approve/reject cultivation logs
- Set environment thresholds
- Approve/reject expenses
- Create/update/delete tasks (only update status)
- Confirm disease diagnosis
- Access admin reports & statistics
- Access user management
- Access product/disease/sensor management
- Access AI training

---

## 📌 TESTING TIPS

1. **For ADMIN**: Test all ADMIN endpoints first with admin token
2. **For MANAGER**: Test MANAGER sections, then read-only endpoints
3. **For STAFF**: Test STAFF sections with data filtering verification
4. **STAFF Data Isolation**: Verify STAFF can only access assigned_staff=user_id ponds
5. **Approval Workflow**: Test cultivation log and expense approval workflow
6. **Cascade Delete**: Test season deletion cascades to related tables

---

**Generated**: 29/04/2026  
**Total Endpoints**: 95  
**Status**: ✅ Production Ready
