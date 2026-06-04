const pool = require('../config/database');

const expenseController = {
  // Lấy toàn bộ danh sách chi phí (Gộp Vật tư tự động + Chi phí nhập tay)
  getAllExpenses: async (req, res) => {
    try {
      const farmId = req.user.farm_id;
      
      const query = `
        SELECT 
          'MATERIAL' AS category,
          p.product_name AS name,
          pul.total_amount AS amount,
          pul.created_at::DATE AS expense_date,
          pul.note AS note,
          'Tự động từ công việc' AS source
        FROM product_usage_logs pul
        LEFT JOIN products p ON pul.product_id = p.product_id
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
          expense_date,
          note,
          'Nhập thủ công' AS source
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

  // Nhập thêm chi phí thủ công
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