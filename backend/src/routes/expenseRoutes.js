const express = require('express')
const router = express.Router()
const { authorize } = require('../middlewares/authorize')
const { expenseController } = require('../controllers/index')

// Tất cả: Lấy danh mục chi phí từ bảng expense_categories
router.get('/categories', authorize(['STAFF', 'MANAGER', 'ADMIN']), expenseController.getExpenseCategories)

// STAFF + MANAGER + ADMIN: Tạo chi phí / đề xuất chi phí
router.post('/', authorize(['STAFF', 'MANAGER', 'ADMIN']), expenseController.createExpense)

// Tất cả: Lấy chi phí theo mùa vụ
router.get('/season/:seasonId', expenseController.getExpensesBySeasonId)

// Tất cả: Lấy chi phí theo hạng mục
router.get('/season/:seasonId/category/:categoryId', expenseController.getExpensesByCategory)

// Tất cả: Thống kê chi phí
router.get('/season/:seasonId/stats', expenseController.getExpenseStats)

// Tất cả: Tổng chi phí theo mùa vụ từ view
router.get('/season/:seasonId/total', expenseController.getTotalExpenseBySeason)

// (Removed manager-only expense update/delete/approve/reject routes — managers will not manage expenses here)

module.exports = router
