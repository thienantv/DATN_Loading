const express = require('express')
const router = express.Router()
const { authorize } = require('../middlewares/authorize')
const { adminController } = require('../controllers/index')

// ===== QUẢN LÝ TÀI KHOẢN (1.1) =====
// ADMIN: Quản lý user
router.get('/users', authorize(['ADMIN']), adminController.getAllUsers)
router.post('/users', authorize(['ADMIN']), adminController.createUser)

// ADMIN: Xem lịch sử đăng nhập (1.1)
router.get('/users/:userId/login-logs', authorize(['ADMIN']), adminController.getUserLoginLogs)

// ===== QUẢN LÝ HỆ THỐNG (1.3) =====
// ADMIN: Thống kê hệ thống
router.get('/stats/overview', authorize(['ADMIN']), adminController.getSystemStats)
router.get('/stats/users', authorize(['ADMIN']), adminController.getUserStats)
router.get('/stats/ponds', authorize(['ADMIN']), adminController.getPondStats)
router.get('/stats/seasons', authorize(['ADMIN']), adminController.getSeasonStats)

// ADMIN: Báo cáo (Dashboard)
router.get('/reports/production', authorize(['ADMIN']), adminController.getProductionReport)
router.get('/reports/financial', authorize(['ADMIN']), adminController.getFinancialReport)
router.get('/reports/health', authorize(['ADMIN']), adminController.getHealthReport)

// ADMIN: Sao lưu dữ liệu (1.3)
router.post('/backup', authorize(['ADMIN']), adminController.createBackup)
router.get('/backups', authorize(['ADMIN']), adminController.getBackups)

// ADMIN: Restore dữ liệu (1.3)
router.post('/restore/:backupId', authorize(['ADMIN']), adminController.restoreBackup)

// ADMIN: Xem audit log (1.3)
router.get('/activity-logs', authorize(['ADMIN']), adminController.getActivityLogs)

// ===== QUẢN LÝ DANH MỤC (1.2) - hiện có trong routes riêng =====
// Xem productRoutes.js, diseaseRoutes.js, sensorRoutes.js

// ===== QUẢN LÝ AI (1.4) =====
// ADMIN: Quản lý dữ liệu huấn luyện
router.get('/ai/training-data', authorize(['ADMIN']), adminController.getTrainingData)
router.post('/ai/training-data', authorize(['ADMIN']), adminController.uploadTrainingData)
router.delete('/ai/training-data/:dataId', authorize(['ADMIN']), adminController.deleteTrainingData)

// ADMIN: Xem lịch sử dự đoán
router.get('/ai/predictions', authorize(['ADMIN']), adminController.getPredictionHistory)

// ADMIN: Cập nhật model
router.post('/ai/model/update', authorize(['ADMIN']), adminController.updateAIModel)
router.get('/ai/model/status', authorize(['ADMIN']), adminController.getModelStatus)

// ADMIN: Xem toàn bộ dữ liệu
router.get('/data/summary', authorize(['ADMIN']), adminController.getDataSummary)

module.exports = router
