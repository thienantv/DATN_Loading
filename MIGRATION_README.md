## Migration: Pond ID Auto-Generation with Gap-Filling

### Mô tả
Thay đổi `pond_id` từ `BIGSERIAL` (tự động tăng) sang `BIGINT` (quản lý thủ công) để:
- Tự động điền lỗ (gap-filling): nếu thiếu số nào, sẽ tự động thêm vào
- Giống logic của `user_id`
- IDs luôn liên tục từ 1, 2, 3, ...

### Cách áp dụng Migration

#### Option 1: Sử dụng file MIGRATION_POND_ID.sql (Nếu có dữ liệu)
```bash
# Kết nối vào PostgreSQL
psql -U postgres -d shrimp_farm -f MIGRATION_POND_ID.sql
```

**Lưu ý:** File này sẽ backup dữ liệu cũ, xóa table, tạo lại table với schema mới, rồi restore dữ liệu với pond_id mới.

#### Option 2: Drop và Recreate (Nếu không có dữ liệu hoặc là dev environment)
```sql
-- Xóa table cũ
DROP TABLE IF EXISTS ponds CASCADE;

-- Tạo table mới
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
```

### Thay đổi Backend

**File:** `backend/src/services/pondService.js`
- Hàm `createPond()` bây giờ tự động:
  1. Tìm `pond_id` khả dụng đầu tiên (gap-filling)
  2. Tạo `pond_code` tự động nếu không được cung cấp (format: `AO-001`, `AO-002`, ...)
  3. Chèn vào database với cả pond_id và pond_code

### Ví dụ Hoạt động

**Trước Migration:**
- `pond_id` tự động tăng: 1, 2, 3, 4, 5, ...
- Xóa pond_id=3 → pond_id mới tạo sẽ là 6, 7, 8, ... (không điền lỗ)

**Sau Migration:**
- `pond_id` tự động điền lỗ: 1, 2, 3, 4, 5, ...
- Xóa pond_id=3 → pond_id mới tạo sẽ là 3 (tái sử dụng)
- Xóa pond_id=2 và 3 → pond_id mới tạo sẽ là 2, 3

### Frontend
✅ Không cần thay đổi - tự động hoạt động với backend mới

### Cách Thử Nghiệm
1. Thêm 5 ao: pond_id = 1, 2, 3, 4, 5
2. Xóa ao pond_id = 2 và 4
3. Thêm 2 ao mới:
   - Ao 6: pond_id = 2
   - Ao 7: pond_id = 4
