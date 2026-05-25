const express = require('express')
const router = express.Router()
const { authorize } = require('../middlewares/authorize')
const { expenseController } = require('../controllers/index')

// Tất cả: Lấy danh mục chi phí từ bảng expense_categories
router.get('/categories', authorize(['WORKER', 'OWNER', 'ACCOUNTANT']), expenseController.getExpenseCategories)

// KẾ TOÁN/QUẢN TRỊ VIÊN: Tạo danh mục chi phí
router.post('/categories', authorize(['ACCOUNTANT', 'OWNER']), expenseController.createExpenseCategory)

// KẾ TOÁN/QUẢN TRỊ VIÊN: Cập nhật danh mục chi phí
router.put('/categories/:categoryId', authorize(['ACCOUNTANT', 'OWNER']), expenseController.updateExpenseCategory)

// KẾ TOÁN/QUẢN TRỊ VIÊN: Xóa danh mục chi phí
router.delete('/categories/:categoryId', authorize(['ACCOUNTANT', 'OWNER']), expenseController.deleteExpenseCategory)

// CÔNG NHÂN + QUẢN TRỊ VIÊN: Tạo chi phí / đề xuất chi phí
router.post('/', authorize(['WORKER', 'OWNER', 'ACCOUNTANT']), expenseController.createExpense)

// Tất cả: Lấy chi phí theo mùa vụ
router.get('/season/:seasonId', expenseController.getExpensesBySeasonId)

// Tất cả: Lấy chi phí theo hạng mục
router.get('/season/:seasonId/category/:categoryId', expenseController.getExpensesByCategory)

// Tất cả: Thống kê chi phí
router.get('/season/:seasonId/stats', expenseController.getExpenseStats)

// Tất cả: Tổng chi phí theo mùa vụ từ view
router.get('/season/:seasonId/total', expenseController.getTotalExpenseBySeason)

// (Đã bỏ các route cập nhật/xóa/duyệt/từ chối chỉ dành cho quản lý - quản lý sẽ không xử lý chi phí ở đây)

module.exports = router
