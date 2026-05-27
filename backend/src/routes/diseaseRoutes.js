const express = require('express')
const router = express.Router()
const { authorize } = require('../middlewares/authorize')
const { diseaseController } = require('../controllers/index')

// Tất cả: Lấy danh sách bệnh
router.get('/', diseaseController.getAllDiseases)

// Tất cả: Lấy chi tiết bệnh
router.get('/:diseaseId', diseaseController.getDiseaseDetail)

// CÔNG NHÂN + QUẢN LÝ: Tải ảnh tôm bệnh lên
router.post('/upload-image', authorize(['WORKER', 'OWNER']), diseaseController.uploadDiseaseImage)

// Tất cả: Lấy kết quả dự đoán bệnh từ AI
router.get('/predictions/:imageId', diseaseController.getPredictions)

// QUẢN LÝ: Thêm loại bệnh mới
// (Đã bỏ các route CRUD và xác nhận chỉ dành cho quản lý)

// Tất cả: Xem lịch sử bệnh theo ao
router.get('/history/:pondId', diseaseController.getDiseaseHistory)

module.exports = router
