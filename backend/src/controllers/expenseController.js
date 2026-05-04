const expenseService = require('../services/expenseService')
const logger = require('../utils/logger')

const expenseController = {
  async createExpense(req, res) {
    try {
      const { seasonId, categoryId, description, amount } = req.body
      const expense = await expenseService.createExpense(
        seasonId,
        categoryId,
        description,
        amount,
        req.user.user_id
      )
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
      const { categoryId, description, amount } = req.body
      const expense = await expenseService.updateExpense(expenseId, { categoryId, description, amount })
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
}

module.exports = expenseController
