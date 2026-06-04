const pool = require('../config/database');

const taskController = {

  // LẤY TOÀN BỘ DANH SÁCH CÔNG VIỆC
  getAllTasks: async (req, res) => {
    try {
      const userId = req.user.user_id;
      const farmId = req.user.farm_id; // Cần lấy farm_id để lọc cho Owner
      const role = String(req.user.role || '').toUpperCase();

      let query = `
      SELECT t.*, p.pond_name, p.pond_code, s.season_name, tt.type_name,
      u_assign.full_name AS creator_name, -- Lấy tên kỹ sư phụ trách
      (
        SELECT json_agg(json_build_object('worker_id', u.user_id, 'full_name', u.full_name))
        FROM task_workers tw
        INNER JOIN users u ON tw.worker_id = u.user_id
        WHERE tw.task_id = t.task_id
      ) AS assigned_workers_list,
      (
        SELECT json_agg(img.image_url)
        FROM task_images img
        WHERE img.task_id = t.task_id
      ) AS task_images,
      (
        SELECT json_build_object(
          'product_name', pr.product_name,
          'quantity', tpu.quantity,
          'unit', pr.unit
        )
        FROM task_product_usage tpu
        INNER JOIN products pr ON tpu.product_id = pr.product_id
        WHERE tpu.task_id = t.task_id
        LIMIT 1
      ) AS product_info
      FROM tasks t
      LEFT JOIN ponds p ON t.pond_id = p.pond_id
      LEFT JOIN seasons s ON t.season_id = s.season_id
      LEFT JOIN task_types tt ON t.type_id = tt.type_id
      LEFT JOIN users u_assign ON t.assigned_by = u_assign.user_id -- JOIN để lấy tên Kỹ sư
      `;

      let queryParams = [];

      // Phân quyền truy xuất dữ liệu
      if (role === 'WORKER') {
        query += ` INNER JOIN task_workers tw ON t.task_id = tw.task_id WHERE tw.worker_id = $1`;
        queryParams.push(userId);
      } else if (role === 'OWNER' || role === 'ADMIN') {
        // Owner/Admin xem toàn bộ công việc trong trại
        query += ` WHERE p.farm_id = $1`;
        queryParams.push(farmId);
      } else { 
        // TECHNICIAN chỉ xem việc mình giao
        query += ` WHERE t.assigned_by = $1`;
        queryParams.push(userId);
      }
      
      query += ` ORDER BY t.created_at DESC`;

      const { rows } = await pool.query(query, queryParams);
      return res.status(200).json({ success: true, data: rows });
    } catch (error) {
      return res.status(500).json({ message: "Lỗi hệ thống", error: error.message });
    }
  },

  // =========================================================================
  // LOGIC 1: LỌC AO NUÔI THÔNG MINH THEO LOẠI CÔNG VIỆC VÀ PHÂN QUYỀN KỸ SƯ
  // =========================================================================
  getPondsForTask: async (req, res) => {
  try {
    const technicianId = req.user.user_id; 
    const typeId = parseInt(req.query.type_id || req.query.type, 10);

    if (!typeId || isNaN(typeId)) {
      return res.status(400).json({ success: false, message: "Thiếu thông tin loại công việc (type_id)." });
    }

    let query = "";
    let queryParams = [technicianId];

    // ĐỒNG BỘ CHUẨN XÁC: Sử dụng 'assigned_staff' làm cột lọc theo ID Kỹ sư
    if (typeId === 1) { 
      // 1. NGHIỆP VỤ XỬ LÝ AO: Ao phải thuộc trạng thái 'DANG_XU_LY'
      query = `
        SELECT 
          p.pond_id, 
          p.pond_code, 
          p.pond_name, 
          p.status AS pond_status,
          NULL AS season_id -- Giai đoạn xử lý ao chưa vào vụ nuôi chính thức
        FROM ponds p
        WHERE p.status = 'DANG_XU_LY'
          AND p.assigned_staff = $1  -- FIX: Thay p.user_id thành p.assigned_staff theo đúng DB thực tế
        ORDER BY p.pond_code ASC;
      `;
    } 
    else if (typeId === 2 || typeId === 3) {
      // 2. NGHIỆP VỤ CHO ĂN / CHO THUỐC: Ao đang nuôi và bắt buộc phải có vụ nuôi hoạt động (INNER JOIN)
      query = `
        SELECT 
          p.pond_id, 
          p.pond_code, 
          p.pond_name, 
          p.status AS pond_status,
          s.season_id
        FROM ponds p
        INNER JOIN seasons s ON p.pond_id = s.pond_id AND s.status = 'DANG_NUOI'
        WHERE p.status = 'DANG_NUOI'
          AND p.assigned_staff = $1  -- FIX: Thay p.user_id thành p.assigned_staff theo đúng DB thực tế
        ORDER BY p.pond_code ASC;
      `;
    } 
    else {
      // 3. CÁC LOẠI CÔNG VIỆC KHÁC (Kiểm tra môi trường, Thu hoạch, Khác...): Lấy linh hoạt cả 2 trạng thái
      query = `
        SELECT 
          p.pond_id, 
          p.pond_code, 
          p.pond_name, 
          p.status AS pond_status,
          s.season_id
        FROM ponds p
        LEFT JOIN seasons s ON p.pond_id = s.pond_id AND s.status = 'DANG_NUOI'
        WHERE p.status IN ('DANG_NUOI', 'DANG_XU_LY')
          AND p.assigned_staff = $1  -- FIX: Thay p.user_id thành p.assigned_staff theo đúng DB thực tế
        ORDER BY p.pond_code ASC;
      `;
    }

    const result = await pool.query(query, queryParams);

    return res.status(200).json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error("Lỗi hệ thống khi lọc ao theo loại công việc:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Không thể tải danh sách ao nuôi đáp ứng điều kiện trạng thái.", 
      error: error.message 
    });
  }
},

  // =========================================================================
  // LOGIC 2: LẤY DANH SÁCH WORKER VÀ ĐÁNH DẤU TRẠNG THÁI BẬN/RẢNH
  // =========================================================================
  getWorkersStatus: async (req, res) => {
    try {
      const technicianId = req.user.user_id;

      // Lấy danh sách Worker thuộc quyền quản lý kèm thông tin trạng thái
      // QUY TẮC MỚI: Nếu công việc ĐÃ QUÁ HẠN (due_date <= NOW()) -> Công nhân tự động RẢNH
      const query = `
        SELECT u.user_id AS worker_id, u.full_name, u.username,
               CASE 
                   WHEN EXISTS (
                       SELECT 1 FROM task_workers tw
                       INNER JOIN tasks t ON tw.task_id = t.task_id
                       WHERE tw.worker_id = u.user_id 
                         AND tw.status IN ('ASSIGNED', 'DOING')
                         AND t.status IN ('PENDING', 'IN_PROGRESS')
                         AND t.due_date > NOW() -- FIX: Giải phóng công nhân ngay ở giây phút công việc bị trễ hạn
                   ) THEN 'BUSY'
                   ELSE 'AVAILABLE'
               END AS work_status
        FROM users u
        INNER JOIN technician_workers tw_rel ON u.user_id = tw_rel.worker_id
        WHERE tw_rel.technician_id = $1 AND u.status = TRUE
      `;
      const { rows } = await pool.query(query, [technicianId]);
      return res.status(200).json({ success: true, data: rows });
    } catch (error) {
      return res.status(500).json({ message: "Lỗi kiểm tra danh sách công nhân", error: error.message });
    }
  },

  // =========================================================================
  // LOGIC 3: TẠO VÀ PHÂN CÔNG CÔNG VIỆC (MÃ TỰ SINH + CHẶN TRÙNG LỊCH WORKER)
  // =========================================================================
  createTask: async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN'); // Bắt đầu Transaction mã hóa an toàn

      const assigned_by = req.user.user_id; // ID kỹ sư giao việc lấy từ token login
      const { type_id, season_id, pond_id, task_title, description, start_date, due_date, assigned_workers, product_id, quantity } = req.body;

      const start = new Date(start_date || new Date());
      const due = new Date(due_date);
      const now = new Date();

      if (start.getTime() < now.getTime() - (5 * 60000)) {
         throw new Error("Thời gian bắt đầu không được ở trong quá khứ.");
      }
      if (due.getTime() <= start.getTime()) {
         throw new Error("Thời gian kết thúc phải sau thời gian bắt đầu.");
      }
      const diffMins = (due.getTime() - start.getTime()) / 60000;
      if (diffMins < 30) {
         throw new Error("Thời lượng công việc tối thiểu là 30 phút.");
      }

      // 1. TỰ SINH MÃ CÔNG VIỆC CHUẨN (Khắc phục triệt để lỗi Not-Null của task_code)
      const year = new Date().getFullYear();
      const countCheck = await client.query(`SELECT COUNT(*) FROM tasks`);
      const nextSequence = parseInt(countCheck.rows[0].count) + 1;
      const task_code = `TSK-${year}-${String(nextSequence).padStart(4, '0')}`;

      // 2. INSERT VÀO BẢNG CHÍNH (tasks)
      const taskInsertQuery = `
      INSERT INTO tasks (task_code, season_id, pond_id, task_title, description, assigned_by, start_date, due_date, type_id, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'PENDING')
      RETURNING task_id
    `;
      const taskResult = await client.query(taskInsertQuery, [
        task_code,
        season_id || null,
        pond_id,
        task_title,
        description,
        assigned_by,
        start,
        due,
        type_id
      ]);
      const taskId = taskResult.rows[0].task_id;

      // 3. INSERT VÀO BẢNG PHÂN CÔNG (task_workers)
      if (assigned_workers && assigned_workers.length > 0) {
        for (const workerId of assigned_workers) {
          await client.query(
            `INSERT INTO task_workers (task_id, worker_id, status) VALUES ($1, $2, 'ASSIGNED')`,
            [taskId, workerId]
          );
        }
      }

      // 4. INSERT VÀO BẢNG VẬT TƯ (task_product_usage) - KHÔNG ĐƯỢC BỎ TRỐNG ĐƠN GIÁ MẶC ĐỊNH
      if (product_id && quantity > 0) {
        // Lấy đơn giá gốc hiện tại của sản phẩm từ kho để lưu vết
        const prodRes = await client.query(`SELECT unit_price FROM products WHERE product_id = $1`, [product_id]);
        const currentPrice = prodRes.rows[0]?.unit_price || 0;

        await client.query(
          `INSERT INTO task_product_usage (task_id, product_id, quantity, unit_price) VALUES ($1, $2, $3, $4)`,
          [taskId, product_id, quantity, currentPrice]
        );
      }

      await client.query('COMMIT'); // Hoàn tất ghi dữ liệu xuống DB
      return res.status(201).json({ message: "Phân công công việc ma trận thành công!", task_code });

    } catch (error) {
      await client.query('ROLLBACK'); // Hoàn tác dữ liệu nếu phát sinh bất kỳ lỗi nhỏ nào
      console.error("LỖI CHI TIẾT TẠI BACKEND:", error);
      return res.status(500).json({ message: "Lỗi hệ thống khi xử lý dữ liệu ma trận.", error: error.message });
    } finally {
      client.release(); // Giải phóng cổng kết nối cơ sở dữ liệu
    }
  },

  // =========================================================================
  // LOGIC 4: XÁC NHẬN HOÀN THÀNH & TỰ ĐỘNG HẠCH TOÁN CHI PHÍ KHO SẢN PHẨM
  // =========================================================================
  completeTask: async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { taskId } = req.params;
      const executorId = req.user.user_id;
      const farmId = req.user.farm_id;

      // 1. Cập nhật trạng thái công việc
      await client.query(`UPDATE tasks SET status = 'COMPLETED', updated_at = NOW() WHERE task_id = $1`, [taskId]);
      await client.query(
        `UPDATE task_workers SET status = 'DONE', completed_at = NOW() WHERE task_id = $1`,
        [taskId]
      );

      // 2. Kiểm tra xem công việc này có hao phí vật tư kho nào không
      const usageRes = await client.query(
        `SELECT tpu.*, p.category_id FROM task_product_usage tpu
         INNER JOIN products p ON tpu.product_id = p.product_id
         WHERE tpu.task_id = $1`,
        [taskId]
      );

      if (usageRes.rows.length > 0) {
        const usage = usageRes.rows[0];

        // 3. Đồng bộ hạch toán đẩy thẳng bản ghi chi phí sang bảng nhật ký kho `product_usage_logs` của toàn trại nuôi
        const insertLogQuery = `
          INSERT INTO product_usage_logs (farm_id, product_id, category_id, source_module, source_ref, quantity, unit_price, total_amount, note, created_by)
          VALUES ($1, $2, $3, 'TASK_MANAGEMENT', $4, $5, $6, $7, $8, $9)
        `;
        await client.query(insertLogQuery, [
          farmId,
          usage.product_id,
          usage.category_id,
          `TASK_CODE_ID_${taskId}`, // Lưu vết mã nguồn phát sinh chi phí
          usage.quantity,
          usage.unit_price,
          usage.total_amount,
          'Chi phí tự động kết chuyển khi công nhân báo cáo hoàn thành công việc nuôi tôm.',
          executorId
        ]);
      }

      await client.query('COMMIT');
      return res.status(200).json({ success: true, message: "Xác nhận hoàn thành công việc và hạch toán chi phí kho thành công!" });
    } catch (error) {
      await client.query('ROLLBACK');
      return res.status(500).json({ message: "Lỗi khi hoàn thành công việc", error: error.message });
    } finally {
      client.release();
    }
  },

  // =========================================================================
  // LOGIC 5: HỦY CÔNG VIỆC (CHỈ CHO HỦY KHI CHƯA PHÁT SINH THỰC TẾ - TRẠNG THÁI PENDING)
  // =========================================================================
  cancelTask: async (req, res) => {
    try {
      const { taskId } = req.params;

      // Kiểm tra trạng thái hiện tại
      const statusCheck = await pool.query(`SELECT status FROM tasks WHERE task_id = $1`, [taskId]);
      if (statusCheck.rows.length === 0) {
        return res.status(404).json({ message: "Không tìm thấy công việc tương ứng." });
      }

      if (statusCheck.rows[0].status !== 'PENDING') {
        return res.status(400).json({ message: "Không thể hủy! Công việc đã được thực hiện hoặc đã kết thúc." });
      }

      // Tiến hành hủy công việc đồng bộ
      await pool.query(`UPDATE tasks SET status = 'CANCELLED', updated_at = NOW() WHERE task_id = $1`, [taskId]);
      await pool.query(`UPDATE task_workers SET status = 'CANCELLED' WHERE task_id = $1`, [taskId]);

      return res.status(200).json({ success: true, message: "Đã hủy bỏ công việc phân công thành công." });
    } catch (error) {
      return res.status(500).json({ message: "Lỗi hệ thống khi hủy công việc", error: error.message });
    }
  }
};

module.exports = taskController;