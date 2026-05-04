const db = require('../config/database')
const logger = require('../utils/logger')

const expenseService = {
  async createExpense(seasonId, categoryId, description, amount, createdBy) {
    try {
      const result = await db.query(`
        INSERT INTO expense_details (season_id, category_id, note, amount, expense_date, created_by, approval_status, created_at)
        VALUES ($1, $2, $3, $4, CURRENT_DATE, $5, $6, CURRENT_TIMESTAMP)
        RETURNING *
      `, [seasonId, categoryId, description, amount, createdBy, 'PENDING'])
      return result.rows[0]
    } catch (error) {
      logger.error('Error in createExpense:', error)
      throw error
    }
  },

  async getExpensesBySeasonId(seasonId) {
    try {
      const result = await db.query(`
        SELECT ed.*, COALESCE(ec.category_name, 'Khác') as category_name
        FROM expense_details ed
        LEFT JOIN expense_categories ec ON ed.category_id = ec.category_id
        WHERE ed.season_id = $1
        ORDER BY ed.created_at DESC
      `, [seasonId])
      return result.rows || []
    } catch (error) {
      logger.error('Error in getExpensesBySeasonId:', error)
      // Return empty array instead of throwing to prevent 500 error
      return []
    }
  },

  async getExpensesByCategory(seasonId, categoryId) {
    try {
      const result = await db.query(`
        SELECT * FROM expense_details
        WHERE season_id = $1 AND category_id = $2
        ORDER BY created_at DESC
      `, [seasonId, categoryId])
      return result.rows || []
    } catch (error) {
      logger.error('Error in getExpensesByCategory:', error)
      return []
    }
  },

  async getExpenseStats(seasonId) {
    try {
      const result = await db.query(`
        SELECT 
          COALESCE(SUM(amount), 0) as total_amount,
          COALESCE(COUNT(*), 0) as total_expenses,
          COALESCE(AVG(amount), 0) as avg_amount
        FROM expense_details
        WHERE season_id = $1
      `, [seasonId])
      return result.rows[0] || { total_amount: 0, total_expenses: 0, avg_amount: 0 }
    } catch (error) {
      logger.error('Error in getExpenseStats:', error)
      return { total_amount: 0, total_expenses: 0, avg_amount: 0 }
    }
  },

  async getExpenseById(expenseId) {
    try {
      const result = await db.query(`
        SELECT * FROM expense_details WHERE expense_id = $1
      `, [expenseId])
      return result.rows[0]
    } catch (error) {
      logger.error('Error in getExpenseById:', error)
      throw error
    }
  },

  async updateExpense(expenseId, { categoryId, description, amount }) {
    try {
      // Kiểm tra xem expense đã được duyệt hay chưa
      const expense = await this.getExpenseById(expenseId)
      if (!expense) {
        throw new Error('Chi phí không tồn tại')
      }

      if (expense.approval_status === 'APPROVED') {
        throw new Error('Không thể sửa chi phí đã được phê duyệt')
      }

      if (expense.approval_status === 'REJECTED') {
        throw new Error('Không thể sửa chi phí đã bị từ chối')
      }

      const result = await db.query(`
        UPDATE expense_details 
        SET category_id = $1, note = $2, amount = $3, updated_at = CURRENT_TIMESTAMP
        WHERE expense_id = $4
        RETURNING *
      `, [
        categoryId || expense.category_id,
        description || expense.note,
        amount || expense.amount,
        expenseId
      ])
      return result.rows[0]
    } catch (error) {
      logger.error('Error in updateExpense:', error)
      throw error
    }
  },

  async approveExpense(expenseId, managerId) {
    try {
      const result = await db.query(`
        UPDATE expense_details 
        SET approval_status = $1, approved_by = $2, approved_at = CURRENT_TIMESTAMP
        WHERE expense_id = $3
        RETURNING *
      `, ['APPROVED', managerId, expenseId])
      return result.rows[0]
    } catch (error) {
      logger.error('Error in approveExpense:', error)
      throw error
    }
  },

  async rejectExpense(expenseId, reason, managerId) {
    try {
      const result = await db.query(`
        UPDATE expense_details 
        SET approval_status = $1, rejected_by = $2, rejected_reason = $3, rejected_at = CURRENT_TIMESTAMP
        WHERE expense_id = $4
        RETURNING *
      `, ['REJECTED', managerId, reason, expenseId])
      return result.rows[0]
    } catch (error) {
      logger.error('Error in rejectExpense:', error)
      throw error
    }
  },

  async deleteExpense(expenseId) {
    try {
      const expense = await this.getExpenseById(expenseId)
      if (!expense) {
        throw new Error('Chi phí không tồn tại')
      }

      // Chỉ cho phép xóa nếu chưa được duyệt/từ chối
      if (expense.approval_status !== 'PENDING') {
        throw new Error(`Không thể xóa chi phí đã ${expense.approval_status.toLowerCase()}`)
      }

      await db.query('DELETE FROM expense_details WHERE expense_id = $1', [expenseId])
      return { success: true, message: 'Đã xóa chi phí' }
    } catch (error) {
      logger.error('Error in deleteExpense:', error)
      throw error
    }
  },
}

module.exports = expenseService
