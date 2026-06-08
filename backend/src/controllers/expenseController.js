const pool = require('../config/database');

const expenseController = {
  getAllExpenses: async (req, res) => {
    try {
      const farmId = req.user.farm_id;
      
      const query = `
        SELECT 
          'MATERIAL' AS category,
          p.product_name AS name,
          pul.total_amount AS amount,
          pul.created_at::VARCHAR AS expense_date,
          pul.note AS note,
          'Tự động từ công việc' AS source,
          COALESCE(t1.pond_id, t2.pond_id, t3.pond_id)::VARCHAR AS pond_id,
          COALESCE(t1.season_id, t2.season_id, t3.season_id)::VARCHAR AS season_id,
          pul.category_id::VARCHAR AS product_category_id,
          pc.category_name AS product_category_name  -- 🌟 THÊM LẤY TÊN DANH MỤC
        FROM product_usage_logs pul
        LEFT JOIN products p ON pul.product_id = p.product_id
        LEFT JOIN product_categories pc ON pul.category_id = pc.category_id -- 🌟 NỐI VỚI BẢNG DANH MỤC
        
        LEFT JOIN tasks t1 ON (
          pul.source_ref = t1.task_code 
          OR pul.source_ref = t1.task_id::VARCHAR
          OR REPLACE(pul.source_ref, 'TASK_CODE_ID_', '') = t1.task_id::VARCHAR
        )
        
        LEFT JOIN task_product_usage tpu ON pul.source_ref = tpu.id::VARCHAR
        LEFT JOIN tasks t2 ON tpu.task_id = t2.task_id
        
        LEFT JOIN task_workers tw ON pul.source_ref = tw.task_worker_id::VARCHAR
        LEFT JOIN tasks t3 ON tw.task_id = t3.task_id
        
        WHERE pul.farm_id = $1

        UNION ALL

        SELECT 
          expense_category AS category,
          CASE 
            WHEN expense_category = 'ELECTRICITY' THEN 'Tiền điện'
            WHEN expense_category = 'LABOR' THEN 'Tiền nhân công'
            WHEN expense_category = 'MAINTENANCE' THEN 'Tiền bảo trì/sửa chữa'
            ELSE 'Chi phí khác'
          END AS name,
          amount,
          expense_date::VARCHAR AS expense_date,
          note,
          'Nhập thủ công' AS source,
          NULL AS pond_id,
          NULL AS season_id,
          NULL AS product_category_id,
          NULL AS product_category_name -- 🌟 GÁN NULL ĐỂ TRÁNH LỖI GỘP BẢNG
        FROM farm_expenses
        WHERE farm_id = $1

        ORDER BY expense_date DESC
      `;
      
      const { rows } = await pool.query(query, [farmId]);
      res.json({ success: true, data: rows });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // ... (Hàm addExpense giữ nguyên như cũ)
  addExpense: async (req, res) => {
    try {
      const farmId = req.user.farm_id;
      const userId = req.user.user_id;
      const { category, amount, expense_date, note } = req.body;
      if (!amount || amount <= 0) throw new Error("Số tiền không hợp lệ");
      const query = `
        INSERT INTO farm_expenses (farm_id, expense_category, amount, expense_date, note, created_by)
        VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
      `;
      await pool.query(query, [farmId, category, amount, expense_date, note, userId]);
      res.json({ success: true, message: "Thêm chi phí thành công!" });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
};

module.exports = expenseController;