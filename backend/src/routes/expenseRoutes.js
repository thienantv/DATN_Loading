const express = require('express')
const router = express.Router()
const { authorize } = require('../middlewares/authorize')
const { expenseController } = require('../controllers/index')

// STAFF + MANAGER + ADMIN: Tạo chi phí / đề xuất chi phí
router.post('/', authorize(['STAFF', 'MANAGER', 'ADMIN']), expenseController.createExpense)

// Tất cả: Lấy chi phí theo mùa vụ
router.get('/season/:seasonId', expenseController.getExpensesBySeasonId)

// Tất cả: Lấy chi phí theo hạng mục
router.get('/season/:seasonId/category/:categoryId', expenseController.getExpensesByCategory)

// Tất cả: Thống kê chi phí
router.get('/season/:seasonId/stats', expenseController.getExpenseStats)

// MANAGER + ADMIN: Sửa chi phí
router.put('/:expenseId', authorize(['MANAGER', 'ADMIN']), expenseController.updateExpense)

// MANAGER + ADMIN: Xóa chi phí
router.delete('/:expenseId', authorize(['MANAGER', 'ADMIN']), expenseController.deleteExpense)

// MANAGER: Duyệt / phê duyệt chi phí
router.post('/:expenseId/approve', authorize(['MANAGER']), expenseController.approveExpense)

// MANAGER: Từ chối chi phí
router.post('/:expenseId/reject', authorize(['MANAGER']), expenseController.rejectExpense)

module.exports = router
