# 📮 POSTMAN API TESTING COLLECTION
**Base URL**: `http://localhost:3000`  
**Database**: PostgreSQL  
**Test Date**: 29/04/2026

---

## � API CLASSIFICATION BY ROLE

### 🔐 ADMIN (Quản trị hệ thống) - 40+ Endpoints
- User Management (8 endpoints): Create, read, update, delete users, manage roles, lock/unlock, reset password
- Master Data: Products, Diseases, Sensors (12 endpoints)
- System Management: Backups, activity logs (4 endpoints)
- AI Management: Training data, predictions, model updates (6 endpoints)
- Reports & Stats (7 endpoints)
- Login history (1 endpoint)

### 🧠 MANAGER (Quản lý nông trại) - 30+ Endpoints
- Pond Management: Create, read, update, manage status (5 endpoints)
- Season Management: Create, read, update, harvest, delete (6 endpoints)
- Cultivation Logs: Approve, reject, lock-date (3 endpoints)
- Environment Logs: Set thresholds (1 endpoint)
- Expense Management: Approve, reject, update, delete PENDING (3 endpoints)
- Task Management: Create, update, delete (3 endpoints)
- Disease Confirmation: Confirm diagnosis (1 endpoint)
- Read-only: Cultivation logs, environment data, feed logs, expenses, tasks, diseases, products, sensors, notifications

### 👷 STAFF (Nhân viên vận hành) - 20+ Endpoints
- Pond Viewing: Get assigned ponds only (2 endpoints)
- Cultivation Logs: Create, update PENDING logs (2 endpoints)
- Environment Logs: Create manual entries (1 endpoint)
- Feed Logs: Create, update (2 endpoints)
- Tasks: Get assigned, update status, upload images (3 endpoints)
- Expense Requests: Create expense proposals (1 endpoint)
- Disease Reporting: Upload images, view predictions (2 endpoints)
- Read-only: View all notifications, ponds (with filtering), seasons, products, sensors (readings only)

---

## �🔐 AUTHENTICATION

### 1. Register New Account (STAFF by default)
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

### 2. Login
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

### 3. Refresh Token
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

## ⭐ ADMIN ONLY ENDPOINTS (40+ APIs)

### User Management (8)
- [4. Get All Users](#4-get-all-users)
- [5. Create User](#5-create-user-admin)
- [6. Get User Details](#6-get-user-details)
- [7. Update User Info](#7-update-user-info-admin)
- [8. Update User Role](#8-update-user-role-admin)
- [9. Lock User Account](#9-lock-user-account-admin)
- [10. Unlock User Account](#10-unlock-user-account-admin)
- [11. Reset User Password](#11-reset-user-password-admin)
- [12. Delete User](#12-delete-user-admin)
- [13. Get User Login History](#13-get-user-login-history-admin)

### Master Data Management (12)
- [64-68. Products CRUD](#🛠️-product-management) (5)
- [55-59. Diseases CRUD](#🦐-disease-management) (5)
- [69-75. Sensors CRUD](#📡-sensor-management) (7)

### System Management (4)
- [88. Backup Database](#88-backup-database-admin)
- [89. Get Backups List](#89-get-backups-list-admin)
- [90. Restore from Backup](#90-restore-from-backup-admin)
- [87. Get Activity Logs](#87-get-activity-logs-admin)

### Reports & Statistics (8)
- [80. System Overview Stats](#80-get-system-overview-stats-admin)
- [81. User Statistics](#81-get-user-statistics-admin)
- [82. Pond Statistics](#82-get-pond-statistics-admin)
- [83. Season Statistics](#83-get-season-statistics-admin)
- [84. Production Report](#84-get-production-report-admin)
- [85. Financial Report](#85-get-financial-report-admin)
- [86. Health Report](#86-get-health-report-admin)

### AI Management (6)
- [91. Get AI Training Data](#91-get-ai-training-data-admin)
- [92. Add AI Training Data](#92-add-ai-training-data-admin)
- [93. Get AI Predictions](#93-get-ai-predictions-admin)
- [94. Update AI Model](#94-update-ai-model-admin)
- [95. Get AI Model Status](#95-get-ai-model-status-admin)

---

## 🧠 MANAGER ENDPOINTS (30+ APIs)

### Pond Management (5)
- [14. Get All Ponds](#14-get-all-ponds)
- [15. Create Pond](#15-create-pond-manager-admin)
- [16. Get Pond Details](#16-get-pond-details)
- [17. Update Pond](#17-update-pond-manager-admin)
- [18. Update Pond Status (MANAGER ONLY)](#18-update-pond-status-manager-only)
- [19. Delete Pond](#19-delete-pond-manager-admin)

### Season Management (6)
- [20. Get All Seasons](#20-get-all-seasons)
- [21. Get Season Details](#21-get-season-details)
- [22. Create Season](#22-create-season-manager)
- [23. Update Season](#23-update-season-manager)
- [24. Harvest Season](#24-harvest-season-close-season-manager)
- [25. Delete Season](#25-delete-season-manager)

### Cultivation Log Approval (3)
- [30. Approve Cultivation Log](#30-approve-cultivation-log-manager)
- [31. Reject Cultivation Log](#31-reject-cultivation-log-manager)
- [32. Lock Date Logs](#32-lock-date-logs-manager)

### Expense Approval (3)
- [45. Approve Expense](#45-approve-expense-manager)
- [46. Reject Expense](#46-reject-expense-manager)
- [44. Update Expense (MANAGER)](#44-update-expense-manager-admin---before-approval)
- [47. Delete Expense](#47-delete-expense-manager-admin---pending-only)

### Task Management (4)
- [50. Create Task](#50-create-task-manager)
- [51. Update Task](#51-update-task-manager)
- [54. Delete Task](#54-delete-task-manager)

### Environment Management (1)
- [37. Set Environment Thresholds](#37-set-environment-thresholds-manager)

### Disease Management (1)
- [62. Confirm Disease Diagnosis](#62-confirm-disease-diagnosis-manager)

### Read-Only Access
- [26-29. Cultivation Logs (view, create, update PENDING)](#📋-cultivation-logs-staff-manager)
- [33-35. Environment Logs (view, create)](#🌡️-environment-logs)
- [38-40. Feed Logs (view, create, update)](#🍎-feed-logs)
- [41-43. Expenses (view, create)](#💰-expense-management)
- [48-49. Tasks (view assigned)](#📋-tasks)
- [55-63. Diseases (view, upload, predict)](#🦐-disease-management)
- [64-68. Products (view by category)](#🛠️-product-management)
- [69-72. Sensors (view, readings)](#📡-sensor-management)
- [77-79. Notifications](#📢-notifications)

---

## 👷 STAFF ENDPOINTS (20+ APIs)

### Pond Access (READ-ONLY - Assigned Ponds Only)
- [14. Get All Ponds (Filtered by assigned_staff)](#14-get-all-ponds)
- [16. Get Pond Details](#16-get-pond-details)

### Cultivation Log Operations (2)
- [28. Create Cultivation Log](#28-create-cultivation-log-staff-manager)
- [29. Update Cultivation Log (PENDING only)](#29-update-cultivation-log-staff-manager---before-approval)
- [26. Get Cultivation Logs (view)](#26-get-cultivation-logs-by-season)

### Environment Data Entry (1)
- [35. Create Environment Log](#35-create-environment-log-staff-manager-admin)
- [33-34. View Environment (read-only)](#🌡️-environment-logs)

### Feed Log Operations (2)
- [39. Create Feed Log](#39-create-feed-log-staff-manager-admin)
- [40. Update Feed Log](#40-update-feed-log-staff-manager)
- [38. Get Feed Logs (view)](#38-get-feed-logs-by-season)

### Task Operations (3)
- [49. Get Assigned Tasks (STAFF only)](#49-get-assigned-tasks-staff)
- [52. Update Task Status](#52-update-task-status-staff)
- [53. Upload Task Image](#53-upload-task-image-staff)

### Expense Requests (1)
- [43. Create Expense](#43-create-expense-staff-manager-admin)

### Disease Reporting (2)
- [60. Upload Disease Image](#60-upload-disease-image-staff-manager)
- [61. Get AI Disease Prediction](#61-get-ai-disease-prediction)

### Read-Only Access
- [20-21. Seasons (view)](#🌾-season-management-manager-only)
- [36. Get Environment Thresholds (view)](#36-get-environment-thresholds-manager)
- [55. Get All Diseases (view)](#55-get-all-diseases)
- [56. Get Disease Details](#56-get-disease-details)
- [63. Get Disease History](#63-get-disease-history-by-pond)
- [64-65. Products (view by category)](#🛠️-product-management)
- [69-72. Sensors (view readings only)](#📡-sensor-management)
- [77-79. Notifications](#📢-notifications)

---

### 4. Get All Users
**🔓 ADMIN ONLY**
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
    },
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
  ]
}
```

### 5. Create User (ADMIN)
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

### 6. Get User Details
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

### 7. Update User Info (ADMIN)
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

### 8. Update User Role (ADMIN)
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

### 9. Lock User Account (ADMIN)
```
PUT /api/users/{userId}/lock
Authorization: Bearer {ADMIN_TOKEN}

Response (200):
{
  "message": "User locked successfully"
}
```

### 10. Unlock User Account (ADMIN)
```
PUT /api/users/{userId}/unlock
Authorization: Bearer {ADMIN_TOKEN}

Response (200):
{
  "message": "User unlocked successfully"
}
```

### 11. Reset User Password (ADMIN)
```
POST /api/users/{userId}/reset-password
Authorization: Bearer {ADMIN_TOKEN}

Response (200):
{
  "message": "Password reset successfully",
  "temporary_password": "TEMP1234"
}
```

### 12. Delete User (ADMIN)
```
DELETE /api/users/{userId}
Authorization: Bearer {ADMIN_TOKEN}

Response (200):
{
  "message": "User deleted successfully"
}
```

### 13. Get User Login History (ADMIN)
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

## 🏞️ POND MANAGEMENT

### 14. Get All Ponds
```
GET /api/ponds
Authorization: Bearer {TOKEN}

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

### 15. Create Pond (MANAGER, ADMIN)
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

### 16. Get Pond Details
```
GET /api/ponds/{pondId}
Authorization: Bearer {TOKEN}

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

### 17. Update Pond (MANAGER, ADMIN)
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

### 18. Update Pond Status (MANAGER Only)
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

### 19. Delete Pond (MANAGER, ADMIN)
```
DELETE /api/ponds/{pondId}
Authorization: Bearer {MANAGER_TOKEN}

Response (200):
{
  "message": "Pond deleted successfully"
}
```

---

## 🌾 SEASON MANAGEMENT (MANAGER Only)

### 20. Get All Seasons
```
GET /api/seasons
Authorization: Bearer {TOKEN}

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

### 21. Get Season Details
```
GET /api/seasons/{seasonId}
Authorization: Bearer {TOKEN}

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

### 22. Create Season (MANAGER)
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

### 23. Update Season (MANAGER)
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

### 24. Harvest Season (Close season) (MANAGER)
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

### 25. Delete Season (MANAGER)
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

## 📋 CULTIVATION LOGS (STAFF, MANAGER)

### 26. Get Cultivation Logs by Season
```
GET /api/cultivation-logs/season/{seasonId}
Authorization: Bearer {TOKEN}

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

### 27. Get Cultivation Log Details
```
GET /api/cultivation-logs/{logId}
Authorization: Bearer {TOKEN}

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

### 28. Create Cultivation Log (STAFF, MANAGER)
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

### 29. Update Cultivation Log (STAFF, MANAGER - Before Approval)
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

### 30. Approve Cultivation Log (MANAGER)
```
POST /api/cultivation-logs/{logId}/approve
Authorization: Bearer {MANAGER_TOKEN}

Response (200):
{
  "message": "Cultivation log approved successfully"
}

Effect: approval_status = "APPROVED", approved_by = manager_id, approved_at = now()
```

### 31. Reject Cultivation Log (MANAGER)
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

Effect: approval_status = "REJECTED", rejected_by = manager_id, rejected_reason = reason
```

### 32. Lock Date Logs (MANAGER)
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

## 🌡️ ENVIRONMENT LOGS

### 33. Get Environment Logs by Season
```
GET /api/environment-logs/season/{seasonId}
Authorization: Bearer {TOKEN}

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

### 34. Get Latest Environment Data
```
GET /api/environment-logs/season/{seasonId}/latest
Authorization: Bearer {TOKEN}

Response (200):
{
  "env_id": 1,
  "season_id": 1,
  "recorded_at": "2026-04-29T09:00:00Z",
  "ph": 7.5,
  "temperature": 28.5,
  "salinity": 25,
  "oxygen": 6.8,
  "nh3": 0.02,
  "created_by": 3
}
```

### 35. Create Environment Log (STAFF, MANAGER, ADMIN)
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

### 36. Get Environment Thresholds (MANAGER)
```
GET /api/environment-logs/season/{seasonId}/thresholds
Authorization: Bearer {MANAGER_TOKEN}

Response (200):
{
  "threshold_id": 1,
  "season_id": 1,
  "ph_min": 7.0,
  "ph_max": 8.0,
  "temperature_min": 26,
  "temperature_max": 30,
  "salinity_min": 20,
  "salinity_max": 30,
  "oxygen_min": 6.0,
  "nh3_max": 0.05
}
```

### 37. Set Environment Thresholds (MANAGER)
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

## 🍎 FEED LOGS

### 38. Get Feed Logs by Season
```
GET /api/feed-logs/season/{seasonId}
Authorization: Bearer {TOKEN}

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

### 39. Create Feed Log (STAFF, MANAGER, ADMIN)
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

### 40. Update Feed Log (STAFF, MANAGER)
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

## 💰 EXPENSE MANAGEMENT

### 41. Get Expenses by Season
```
GET /api/expenses/season/{seasonId}
Authorization: Bearer {TOKEN}

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

### 42. Get Expense Details
```
GET /api/expenses/{expenseId}
Authorization: Bearer {TOKEN}

Response (200):
{
  "expense_id": 1,
  "season_id": 1,
  "category_id": 1,
  "category_name": "Chi phí thức ăn",
  "amount": 5000000,
  "expense_date": "2026-04-29",
  "note": "Mua thức ăn tôm",
  "created_by": 3,
  "approval_status": "PENDING"
}
```

### 43. Create Expense (STAFF, MANAGER, ADMIN)
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

Note: Tự động tạo với approval_status = "PENDING"
```

### 44. Update Expense (MANAGER, ADMIN - Before Approval)
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

### 45. Approve Expense (MANAGER)
```
POST /api/expenses/{expenseId}/approve
Authorization: Bearer {MANAGER_TOKEN}

Response (200):
{
  "message": "Expense approved successfully"
}

Effect: approval_status = "APPROVED", approved_by = manager_id, approved_at = now()
```

### 46. Reject Expense (MANAGER)
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

Effect: approval_status = "REJECTED", rejected_by = manager_id, rejected_reason = reason
```

### 47. Delete Expense (MANAGER, ADMIN - PENDING Only)
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

## 📋 TASKS

### 48. Get All Tasks
```
GET /api/tasks
Authorization: Bearer {TOKEN}

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

### 49. Get Assigned Tasks (STAFF)
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

### 50. Create Task (MANAGER)
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

### 51. Update Task (MANAGER)
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

### 52. Update Task Status (STAFF)
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

### 53. Upload Task Image (STAFF)
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

### 54. Delete Task (MANAGER)
```
DELETE /api/tasks/{taskId}
Authorization: Bearer {MANAGER_TOKEN}

Response (200):
{
  "message": "Task deleted successfully"
}
```

---

## 🦐 DISEASE MANAGEMENT

### 55. Get All Diseases
```
GET /api/diseases
Authorization: Bearer {TOKEN}

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

### 56. Get Disease Details
```
GET /api/diseases/{diseaseId}
Authorization: Bearer {TOKEN}

Response (200):
{
  "disease_id": 1,
  "disease_name": "Bệnh đốm trắng",
  "symptoms": "Tôm có đốm trắng trên vỏ",
  "treatment": "Dùng thuốc X, giảm mật độ",
  "prevention": "Giữ nước sạch, kiểm tra thường xuyên"
}
```

### 57. Create Disease (ADMIN)
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

### 58. Update Disease (ADMIN)
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

### 59. Delete Disease (ADMIN)
```
DELETE /api/diseases/{diseaseId}
Authorization: Bearer {ADMIN_TOKEN}

Response (200):
{
  "message": "Disease deleted successfully"
}
```

### 60. Upload Disease Image (STAFF, MANAGER)
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

### 61. Get AI Disease Prediction
```
GET /api/diseases/predictions/{imageId}
Authorization: Bearer {TOKEN}

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

### 62. Confirm Disease Diagnosis (MANAGER)
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

### 63. Get Disease History by Pond
```
GET /api/diseases/history/{pondId}
Authorization: Bearer {TOKEN}

Response (200):
{
  "data": [
    {
      "history_id": 1,
      "pond_id": 1,
      "disease_id": 1,
      "disease_name": "Bệnh đốm trắng",
      "confirmed_date": "2026-04-29",
      "treatment_started": true,
      "notes": "Bắt đầu điều trị"
    }
  ]
}
```

---

## 🛠️ PRODUCT MANAGEMENT

### 64. Get All Products
```
GET /api/products
Authorization: Bearer {TOKEN}

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

### 65. Get Products by Category
```
GET /api/products/category/{category}
Authorization: Bearer {TOKEN}

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

Note: Categories: FEED, MEDICINE, PROBIOTIC
```

### 66. Create Product (ADMIN)
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

### 67. Update Product (ADMIN)
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

### 68. Delete Product (ADMIN)
```
DELETE /api/products/{productId}
Authorization: Bearer {ADMIN_TOKEN}

Response (200):
{
  "message": "Product deleted successfully"
}
```

---

## 📡 SENSOR MANAGEMENT

### 69. Get Sensors by Pond
```
GET /api/sensors/pond/{pondId}
Authorization: Bearer {TOKEN}

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

### 70. Get Sensor Details
```
GET /api/sensors/{sensorId}
Authorization: Bearer {TOKEN}

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

### 71. Get Sensor Readings
```
GET /api/sensors/{sensorId}/readings
Authorization: Bearer {TOKEN}

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

### 72. Get Readings by Date Range
```
GET /api/sensors/readings/range?sensorId={sensorId}&startDate=2026-04-01&endDate=2026-04-29
Authorization: Bearer {TOKEN}

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

### 73. Create Sensor (ADMIN)
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

Note: sensor_type: PH, TEMPERATURE, SALINITY, OXYGEN, NH3
```

### 74. Update Sensor (ADMIN)
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

### 75. Delete Sensor (ADMIN)
```
DELETE /api/sensors/{sensorId}
Authorization: Bearer {ADMIN_TOKEN}

Response (200):
{
  "message": "Sensor deleted successfully"
}
```

### 76. Create Sensor Reading (Simulator / API)
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

## 📢 NOTIFICATIONS

### 77. Get My Notifications
```
GET /api/notifications
Authorization: Bearer {TOKEN}

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

### 78. Mark Notification as Read
```
PUT /api/notifications/{notificationId}/read
Authorization: Bearer {TOKEN}

Response (200):
{
  "message": "Notification marked as read"
}
```

### 79. Delete Notification
```
DELETE /api/notifications/{notificationId}
Authorization: Bearer {TOKEN}

Response (200):
{
  "message": "Notification deleted successfully"
}
```

---

## 📊 ADMIN REPORTS & STATISTICS

### 80. Get System Overview Stats (ADMIN)
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

### 81. Get User Statistics (ADMIN)
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

### 82. Get Pond Statistics (ADMIN)
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

### 83. Get Season Statistics (ADMIN)
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

### 84. Get Production Report (ADMIN)
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

### 85. Get Financial Report (ADMIN)
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

### 86. Get Health Report (ADMIN)
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

### 87. Get Activity Logs (ADMIN)
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

### 88. Backup Database (ADMIN)
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

### 89. Get Backups List (ADMIN)
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

### 90. Restore from Backup (ADMIN)
```
POST /api/admin/restore/{backupId}
Authorization: Bearer {ADMIN_TOKEN}

Response (200):
{
  "message": "Restore started successfully",
  "backup_id": "backup-2026-04-29-100000"
}
```

### 91. Get AI Training Data (ADMIN)
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

### 92. Add AI Training Data (ADMIN)
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

### 93. Get AI Predictions (ADMIN)
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

### 94. Update AI Model (ADMIN)
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

### 95. Get AI Model Status (ADMIN)
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

## 🔒 AUTHENTICATION HEADERS

All protected endpoints require:
```
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json
```

Example JWT Token (from login response):
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoyLCJ1c2VybmFtZSI6Im1hbmFnZXIiLCJyb2xlX2lkIjoyLCJyb2xlX25hbWUiOiJNQU5BR0VSIiwiaWF0IjoxNjcyMjAwMDAwLCJleHAiOjE2NzIyODY0MDB9.signature
```

---

## 🧪 TEST ACCOUNTS

| Username | Password | Role | User ID |
|----------|----------|------|---------|
| admin | admin123 | ADMIN | 1 |
| manager | manager123 | MANAGER | 2 |
| staff | staff123 | STAFF | 3 |

---

## 📊 API QUICK REFERENCE TABLE

| # | Endpoint | Method | ADMIN | MANAGER | STAFF | Description |
|----|----------|--------|-------|---------|-------|-------------|
| **AUTHENTICATION** ||||||||
| 1 | /api/auth/register | POST | ✅ | ✅ | ✅ | Register new account (default STAFF) |
| 2 | /api/auth/login | POST | ✅ | ✅ | ✅ | Login & get JWT token |
| 3 | /api/auth/refresh-token | POST | ✅ | ✅ | ✅ | Refresh JWT token |
| **USER MANAGEMENT (ADMIN ONLY)** ||||||||
| 4 | /api/users | GET | ✅ | ❌ | ❌ | Get all users |
| 5 | /api/admin/users | POST | ✅ | ❌ | ❌ | Create new user |
| 6 | /api/users/{userId} | GET | ✅ | ❌ | ❌ | Get user details |
| 7 | /api/users/{userId} | PUT | ✅ | ❌ | ❌ | Update user info |
| 8 | /api/users/{userId}/role | PUT | ✅ | ❌ | ❌ | Update user role |
| 9 | /api/users/{userId}/lock | PUT | ✅ | ❌ | ❌ | Lock user account |
| 10 | /api/users/{userId}/unlock | PUT | ✅ | ❌ | ❌ | Unlock user account |
| 11 | /api/users/{userId}/reset-password | POST | ✅ | ❌ | ❌ | Reset user password |
| 12 | /api/users/{userId} | DELETE | ✅ | ❌ | ❌ | Delete user |
| 13 | /api/admin/users/{userId}/login-logs | GET | ✅ | ❌ | ❌ | Get user login history |
| **POND MANAGEMENT** ||||||||
| 14 | /api/ponds | GET | ✅ | ✅ | ✅🔒 | Get ponds (STAFF: assigned only) |
| 15 | /api/ponds | POST | ✅ | ✅ | ❌ | Create pond |
| 16 | /api/ponds/{pondId} | GET | ✅ | ✅ | ✅🔒 | Get pond details (STAFF: assigned only) |
| 17 | /api/ponds/{pondId} | PUT | ✅ | ✅ | ❌ | Update pond |
| 18 | /api/ponds/{pondId}/status | PATCH | ❌ | ✅ | ❌ | Update pond status (MANAGER ONLY) |
| 19 | /api/ponds/{pondId} | DELETE | ✅ | ✅ | ❌ | Delete pond |
| **SEASON MANAGEMENT** ||||||||
| 20 | /api/seasons | GET | ✅ | ✅ | ✅ | Get all seasons |
| 21 | /api/seasons/{seasonId} | GET | ✅ | ✅ | ✅ | Get season details |
| 22 | /api/seasons | POST | ❌ | ✅ | ❌ | Create season (MANAGER ONLY) |
| 23 | /api/seasons/{seasonId} | PUT | ❌ | ✅ | ❌ | Update season (MANAGER ONLY) |
| 24 | /api/seasons/{seasonId}/harvest | POST | ❌ | ✅ | ❌ | Harvest season (MANAGER ONLY) |
| 25 | /api/seasons/{seasonId} | DELETE | ❌ | ✅ | ❌ | Delete season (MANAGER ONLY) |
| **CULTIVATION LOGS** ||||||||
| 26 | /api/cultivation-logs/season/{seasonId} | GET | ✅ | ✅ | ✅ | Get logs by season |
| 27 | /api/cultivation-logs/{logId} | GET | ✅ | ✅ | ✅ | Get log details |
| 28 | /api/cultivation-logs | POST | ❌ | ✅ | ✅ | Create log (STAFF/MANAGER) |
| 29 | /api/cultivation-logs/{logId} | PUT | ❌ | ✅ | ✅🔒 | Update log if PENDING (STAFF/MANAGER) |
| 30 | /api/cultivation-logs/{logId}/approve | POST | ❌ | ✅ | ❌ | Approve log (MANAGER ONLY) |
| 31 | /api/cultivation-logs/{logId}/reject | POST | ❌ | ✅ | ❌ | Reject log (MANAGER ONLY) |
| 32 | /api/cultivation-logs/season/{seasonId}/lock-date | POST | ❌ | ✅ | ❌ | Lock date logs (MANAGER ONLY) |
| **ENVIRONMENT LOGS** ||||||||
| 33 | /api/environment-logs/season/{seasonId} | GET | ✅ | ✅ | ✅ | Get environment logs |
| 34 | /api/environment-logs/season/{seasonId}/latest | GET | ✅ | ✅ | ✅ | Get latest env data |
| 35 | /api/environment-logs | POST | ✅ | ✅ | ✅ | Create env log |
| 36 | /api/environment-logs/season/{seasonId}/thresholds | GET | ✅ | ✅ | ✅ | Get thresholds |
| 37 | /api/environment-logs/season/{seasonId}/thresholds | POST | ❌ | ✅ | ❌ | Set thresholds (MANAGER ONLY) |
| **FEED LOGS** ||||||||
| 38 | /api/feed-logs/season/{seasonId} | GET | ✅ | ✅ | ✅ | Get feed logs |
| 39 | /api/feed-logs | POST | ✅ | ✅ | ✅ | Create feed log |
| 40 | /api/feed-logs/{feedLogId} | PUT | ✅ | ✅ | ✅ | Update feed log |
| **EXPENSE MANAGEMENT** ||||||||
| 41 | /api/expenses/season/{seasonId} | GET | ✅ | ✅ | ✅ | Get expenses |
| 42 | /api/expenses/{expenseId} | GET | ✅ | ✅ | ✅ | Get expense details |
| 43 | /api/expenses | POST | ✅ | ✅ | ✅ | Create expense request |
| 44 | /api/expenses/{expenseId} | PUT | ✅ | ✅ | ❌ | Update expense if PENDING (MANAGER/ADMIN) |
| 45 | /api/expenses/{expenseId}/approve | POST | ❌ | ✅ | ❌ | Approve expense (MANAGER ONLY) |
| 46 | /api/expenses/{expenseId}/reject | POST | ❌ | ✅ | ❌ | Reject expense (MANAGER ONLY) |
| 47 | /api/expenses/{expenseId} | DELETE | ✅ | ✅ | ❌ | Delete expense if PENDING |
| **TASKS** ||||||||
| 48 | /api/tasks | GET | ✅ | ✅ | ✅ | Get all tasks |
| 49 | /api/tasks/assigned-to-me | GET | ❌ | ❌ | ✅ | Get STAFF's assigned tasks |
| 50 | /api/tasks | POST | ❌ | ✅ | ❌ | Create task (MANAGER ONLY) |
| 51 | /api/tasks/{taskId} | PUT | ❌ | ✅ | ❌ | Update task (MANAGER ONLY) |
| 52 | /api/tasks/{taskId}/status | PATCH | ❌ | ❌ | ✅ | Update task status (STAFF ONLY) |
| 53 | /api/tasks/{taskId}/upload-image | POST | ❌ | ❌ | ✅ | Upload task image (STAFF ONLY) |
| 54 | /api/tasks/{taskId} | DELETE | ❌ | ✅ | ❌ | Delete task (MANAGER ONLY) |
| **DISEASE MANAGEMENT** ||||||||
| 55 | /api/diseases | GET | ✅ | ✅ | ✅ | Get all diseases |
| 56 | /api/diseases/{diseaseId} | GET | ✅ | ✅ | ✅ | Get disease details |
| 57 | /api/diseases | POST | ✅ | ❌ | ❌ | Create disease (ADMIN ONLY) |
| 58 | /api/diseases/{diseaseId} | PUT | ✅ | ❌ | ❌ | Update disease (ADMIN ONLY) |
| 59 | /api/diseases/{diseaseId} | DELETE | ✅ | ❌ | ❌ | Delete disease (ADMIN ONLY) |
| 60 | /api/diseases/upload-image | POST | ❌ | ✅ | ✅ | Upload disease image |
| 61 | /api/diseases/predictions/{imageId} | GET | ✅ | ✅ | ✅ | Get AI prediction |
| 62 | /api/diseases/{diseaseId}/confirm | POST | ❌ | ✅ | ❌ | Confirm diagnosis (MANAGER ONLY) |
| 63 | /api/diseases/history/{pondId} | GET | ✅ | ✅ | ✅ | Get disease history |
| **PRODUCTS** ||||||||
| 64 | /api/products | GET | ✅ | ✅ | ✅ | Get all products |
| 65 | /api/products/category/{category} | GET | ✅ | ✅ | ✅ | Get by category |
| 66 | /api/products | POST | ✅ | ❌ | ❌ | Create product (ADMIN ONLY) |
| 67 | /api/products/{productId} | PUT | ✅ | ❌ | ❌ | Update product (ADMIN ONLY) |
| 68 | /api/products/{productId} | DELETE | ✅ | ❌ | ❌ | Delete product (ADMIN ONLY) |
| **SENSORS** ||||||||
| 69 | /api/sensors/pond/{pondId} | GET | ✅ | ✅ | ✅ | Get sensors by pond |
| 70 | /api/sensors/{sensorId} | GET | ✅ | ✅ | ✅ | Get sensor details |
| 71 | /api/sensors/{sensorId}/readings | GET | ✅ | ✅ | ✅ | Get sensor readings |
| 72 | /api/sensors/readings/range | GET | ✅ | ✅ | ✅ | Get readings by date range |
| 73 | /api/sensors | POST | ✅ | ❌ | ❌ | Create sensor (ADMIN ONLY) |
| 74 | /api/sensors/{sensorId} | PUT | ✅ | ❌ | ❌ | Update sensor (ADMIN ONLY) |
| 75 | /api/sensors/{sensorId} | DELETE | ✅ | ❌ | ❌ | Delete sensor (ADMIN ONLY) |
| 76 | /api/sensors/readings | POST | ✅ | ❌ | ❌ | Create sensor reading (ADMIN ONLY) |
| **NOTIFICATIONS** ||||||||
| 77 | /api/notifications | GET | ✅ | ✅ | ✅ | Get notifications |
| 78 | /api/notifications/{notificationId}/read | PUT | ✅ | ✅ | ✅ | Mark read |
| 79 | /api/notifications/{notificationId} | DELETE | ✅ | ✅ | ✅ | Delete notification |
| **ADMIN REPORTS & STATS** ||||||||
| 80 | /api/admin/stats/overview | GET | ✅ | ❌ | ❌ | System overview (ADMIN ONLY) |
| 81 | /api/admin/stats/users | GET | ✅ | ❌ | ❌ | User stats (ADMIN ONLY) |
| 82 | /api/admin/stats/ponds | GET | ✅ | ❌ | ❌ | Pond stats (ADMIN ONLY) |
| 83 | /api/admin/stats/seasons | GET | ✅ | ❌ | ❌ | Season stats (ADMIN ONLY) |
| 84 | /api/admin/reports/production | GET | ✅ | ❌ | ❌ | Production report (ADMIN ONLY) |
| 85 | /api/admin/reports/financial | GET | ✅ | ❌ | ❌ | Financial report (ADMIN ONLY) |
| 86 | /api/admin/reports/health | GET | ✅ | ❌ | ❌ | Health report (ADMIN ONLY) |
| 87 | /api/admin/activity-logs | GET | ✅ | ❌ | ❌ | Activity logs (ADMIN ONLY) |
| 88 | /api/admin/backup | POST | ✅ | ❌ | ❌ | Backup database (ADMIN ONLY) |
| 89 | /api/admin/backups | GET | ✅ | ❌ | ❌ | List backups (ADMIN ONLY) |
| 90 | /api/admin/restore/{backupId} | POST | ✅ | ❌ | ❌ | Restore backup (ADMIN ONLY) |
| 91 | /api/admin/ai/training-data | GET | ✅ | ❌ | ❌ | Get training data (ADMIN ONLY) |
| 92 | /api/admin/ai/training-data | POST | ✅ | ❌ | ❌ | Add training data (ADMIN ONLY) |
| 93 | /api/admin/ai/predictions | GET | ✅ | ❌ | ❌ | Get AI predictions (ADMIN ONLY) |
| 94 | /api/admin/ai/model/update | POST | ✅ | ❌ | ❌ | Update AI model (ADMIN ONLY) |
| 95 | /api/admin/ai/model/status | GET | ✅ | ❌ | ❌ | Get model status (ADMIN ONLY) |

**Legend**: ✅ = Allowed | ❌ = Not Allowed | ✅🔒 = Allowed with restrictions | 🔒 = STAFF filtered access

---

## 🧪 TEST ACCOUNTS

| Username | Password | Role | User ID |
|----------|----------|------|---------|
| admin | admin123 | ADMIN | 1 |
| manager | manager123 | MANAGER | 2 |
| staff | staff123 | STAFF | 3 |

---

## ✅ TESTING CHECKLIST

- [ ] Authentication flows (login, register, refresh token)
- [ ] User management (create, update, lock, unlock, reset password)
- [ ] Pond management (CRUD, status update, STAFF visibility filtering)
- [ ] Season management (CRUD, harvest, cascade delete)
- [ ] Cultivation logs (create, approve, reject, lock-date)
- [ ] Environment logs (manual entry, thresholds)
- [ ] Feed logs (create, update)
- [ ] Expense management (create, approve, reject, delete PENDING only)
- [ ] Tasks (create, assign, update status, upload images)
- [ ] Disease management (CRUD, upload image, AI prediction)
- [ ] Products (CRUD by category)
- [ ] Sensors (CRUD, readings)
- [ ] Notifications (get, mark read, delete)
- [ ] Admin reports (stats, production, financial, health)
- [ ] Admin backups (create, restore)
- [ ] AI management (training data, predictions, model update)

---

## 📌 IMPORTANT NOTES

1. **STAFF Data Isolation**: STAFF can only see ponds assigned to them (assigned_staff = user_id)
2. **Approval Workflows**: 
   - Cultivation logs start as PENDING, only MANAGER can approve/reject
   - Expense items start as PENDING, only MANAGER can approve/reject
   - Cannot edit after approval
3. **Cascade Delete**: Deleting a season deletes all related cultivation logs, expenses, feed logs, tasks, environment logs
4. **Status Validation**: Cannot delete RUNNING seasons
5. **Role Restrictions**:
   - ADMIN cannot create/approve operational logs
   - MANAGER cannot manage users
   - STAFF cannot access other users' data

---

**Generated**: 29/04/2026  
**API Version**: v1.0  
**Total Endpoints**: 95
