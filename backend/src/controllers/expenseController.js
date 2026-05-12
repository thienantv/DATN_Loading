const expenseService = require('../services/expenseService')
const logger = require('../utils/logger')

const expenseController = {
  async getExpenseCategories(req, res) {
    try {
      const categories = await expenseService.getExpenseCategories()
      res.json({ success: true, data: categories })
    } catch (error) {
      logger.error('Error in getExpenseCategories:', error)
      res.status(500).json({ success: false, message: error.message })
    }
  },

  async createExpenseCategory(req, res) {
    try {
      const categoryName = req.body.categoryName || req.body.category_name || req.body.name
      if (!categoryName || !String(categoryName).trim()) {
        return res.status(400).json({
          success: false,
          message: 'Tên danh mục không được để trống',
        })
      }

      const category = await expenseService.createExpenseCategory(categoryName)
      res.status(201).json({
        success: true,
        message: 'Đã tạo danh mục chi phí',
        data: category,
      })
    } catch (error) {
      logger.error('Error in createExpenseCategory:', error)
      if (error.code === '23505') {
        return res.status(409).json({
          success: false,
          message: 'Danh mục này đã tồn tại',
        })
      }

      res.status(400).json({ success: false, message: error.message })
    }
  },

  async createExpense(req, res) {
    try {
      const seasonId = req.body.seasonId || req.body.season_id
      const categoryId = req.body.categoryId || req.body.category_id
      const note = req.body.note || req.body.description || ''
      const amount = req.body.amount
      const expenseDate = req.body.expenseDate || req.body.expense_date

      if (!seasonId || !categoryId || !amount) {
        return res.status(400).json({
          success: false,
          message: 'Mùa vụ, danh mục và số tiền là bắt buộc',
        })
      }

      const expense = await expenseService.createExpense({
        seasonId,
        categoryId,
        note,
        amount,
        expenseDate,
        createdBy: req.user.user_id,
      })
      res.status(201).json({ success: true, message: 'Đã ghi nhận chi phí', data: expense })
    } catch (error) {
      logger.error('Error in createExpense:', error)
      res.status(400).json({ success: false, message: error.message })
    }
  },

  async getExpensesBySeasonId(req, res) {
    try {
      const { seasonId } = req.params
      const expenses = await expenseService.getExpensesBySeasonId(seasonId)
      res.json({ success: true, data: expenses })
    } catch (error) {
      logger.error('Error in getExpensesBySeasonId:', error)
      res.status(500).json({ success: false, message: error.message })
    }
  },

  async getExpensesByCategory(req, res) {
    try {
      const { seasonId, categoryId } = req.params
      const expenses = await expenseService.getExpensesByCategory(seasonId, categoryId)
      res.json({ success: true, data: expenses })
    } catch (error) {
      logger.error('Error in getExpensesByCategory:', error)
      res.status(500).json({ success: false, message: error.message })
    }
  },

  async getExpenseStats(req, res) {
    try {
      const { seasonId } = req.params
      const stats = await expenseService.getExpenseStats(seasonId)
      res.json({ success: true, data: stats })
    } catch (error) {
      logger.error('Error in getExpenseStats:', error)
      res.status(500).json({ success: false, message: error.message })
    }
  },

  async updateExpense(req, res) {
    try {
      const { expenseId } = req.params
      const categoryId = req.body.categoryId || req.body.category_id
      const note = req.body.note || req.body.description || ''
      const amount = req.body.amount
      const expenseDate = req.body.expenseDate || req.body.expense_date
      const expense = await expenseService.updateExpense(expenseId, { categoryId, note, amount, expenseDate })
      res.json({ success: true, message: 'Đã cập nhật chi phí', data: expense })
    } catch (error) {
      logger.error('Error in updateExpense:', error)
      res.status(400).json({ success: false, message: error.message })
    }
  },

  async deleteExpense(req, res) {
    try {
      const { expenseId } = req.params
      const result = await expenseService.deleteExpense(expenseId)
      res.json(result)
    } catch (error) {
      logger.error('Error in deleteExpense:', error)
      res.status(400).json({ success: false, message: error.message })
    }
  },

  async approveExpense(req, res) {
    try {
      const { expenseId } = req.params
      const expense = await expenseService.approveExpense(expenseId, req.user.user_id)
      res.json({ success: true, message: 'Đã phê duyệt chi phí', data: expense })
    } catch (error) {
      logger.error('Error in approveExpense:', error)
      res.status(400).json({ success: false, message: error.message })
    }
  },

  async rejectExpense(req, res) {
    try {
      const { expenseId } = req.params
      const { reason } = req.body
      const expense = await expenseService.rejectExpense(expenseId, reason, req.user.user_id)
      res.json({ success: true, message: 'Đã từ chối chi phí', data: expense })
    } catch (error) {
      logger.error('Error in rejectExpense:', error)
      res.status(400).json({ success: false, message: error.message })
    }
  },

  async getTotalExpenseBySeason(req, res) {
    try {
      const { seasonId } = req.params
      const summary = await expenseService.getTotalExpenseBySeason(seasonId)
      res.json({ success: true, data: summary })
    } catch (error) {
      logger.error('Error in getTotalExpenseBySeason:', error)
      res.status(500).json({ success: false, message: error.message })
    }
  },

  async updateExpenseCategory(req, res) {
    try {
      const { categoryId } = req.params
      const categoryName = req.body.categoryName || req.body.category_name || req.body.name
      if (!categoryName || !String(categoryName).trim()) {
        return res.status(400).json({ success: false, message: 'Tên danh mục không được để trống' })
      }

      const updated = await expenseService.updateExpenseCategory(categoryId, String(categoryName).trim())
      if (!updated) {
        return res.status(404).json({ success: false, message: 'Danh mục không tồn tại' })
      }

      res.json({ success: true, message: 'Đã cập nhật danh mục', data: updated })
    } catch (error) {
      logger.error('Error in updateExpenseCategory:', error)
      if (error.code === '23505') {
        return res.status(409).json({ success: false, message: 'Tên danh mục đã tồn tại' })
      }
      res.status(400).json({ success: false, message: error.message })
    }
  },

  async deleteExpenseCategory(req, res) {
    try {
      const { categoryId } = req.params
      await expenseService.deleteExpenseCategory(categoryId)
      res.json({ success: true, message: 'Đã xoá danh mục' })
    } catch (error) {
      logger.error('Error in deleteExpenseCategory:', error)
      if (String(error.message).includes('đang sử dụng')) {
        return res.status(400).json({ success: false, message: error.message })
      }
      res.status(400).json({ success: false, message: error.message })
    }
  },
}

module.exports = expenseController
