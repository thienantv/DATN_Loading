const express = require('express')
const router = express.Router()
const { authorize } = require('../middlewares/authorize')
const { diseaseController } = require('../controllers/index')

// Tất cả: Lấy danh sách bệnh
router.get('/', diseaseController.getAllDiseases)

// Tất cả: Lấy chi tiết bệnh
router.get('/:diseaseId', diseaseController.getDiseaseDetail)

// WORKER + MANAGER: Upload hình ảnh tôm bệnh
router.post('/upload-image', authorize(['WORKER', 'MANAGER']), diseaseController.uploadDiseaseImage)

// Tất cả: Lấy kết quả dự đoán bệnh từ AI
router.get('/predictions/:imageId', diseaseController.getPredictions)

// MANAGER: Thêm loại bệnh mới
// (Removed manager-only disease CRUD and confirm routes)

// Tất cả: Xem lịch sử bệnh theo ao
router.get('/history/:pondId', diseaseController.getDiseaseHistory)

module.exports = router
