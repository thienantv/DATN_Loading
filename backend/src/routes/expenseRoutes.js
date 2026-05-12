const express = require('express')
const router = express.Router()
const { authorize } = require('../middlewares/authorize')
const { expenseController } = require('../controllers/index')

// Tất cả: Lấy danh mục chi phí từ bảng expense_categories
router.get('/categories', authorize(['WORKER', 'MANAGER', 'ADMIN', 'ACCOUNTANT']), expenseController.getExpenseCategories)

// MANAGER/ACCOUNTANT/ADMIN: Tạo danh mục chi phí
router.post('/categories', authorize(['MANAGER', 'ACCOUNTANT', 'ADMIN']), expenseController.createExpenseCategory)

// MANAGER/ACCOUNTANT/ADMIN: Cập nhật danh mục chi phí
router.put('/categories/:categoryId', authorize(['MANAGER', 'ACCOUNTANT', 'ADMIN']), expenseController.updateExpenseCategory)

// MANAGER/ACCOUNTANT/ADMIN: Xóa danh mục chi phí
router.delete('/categories/:categoryId', authorize(['MANAGER', 'ACCOUNTANT', 'ADMIN']), expenseController.deleteExpenseCategory)

// WORKER + MANAGER + ADMIN: Tạo chi phí / đề xuất chi phí
router.post('/', authorize(['WORKER', 'MANAGER', 'ADMIN', 'ACCOUNTANT']), expenseController.createExpense)

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
