const express = require('express')
const router = express.Router()
const { authorize } = require('../middlewares/authorize')
const { diseaseController } = require('../controllers/index')

// Tất cả: Lấy danh sách bệnh
router.get('/', diseaseController.getAllDiseases)

// Tất cả: Lấy chi tiết bệnh
router.get('/:diseaseId', diseaseController.getDiseaseDetail)

// STAFF + MANAGER: Upload hình ảnh tôm bệnh
router.post('/upload-image', authorize(['STAFF', 'MANAGER']), diseaseController.uploadDiseaseImage)

// Tất cả: Lấy kết quả dự đoán bệnh từ AI
router.get('/predictions/:imageId', diseaseController.getPredictions)

// ADMIN: Thêm loại bệnh mới
router.post('/', authorize(['ADMIN']), diseaseController.createDisease)

// ADMIN: Sửa thông tin bệnh
router.put('/:diseaseId', authorize(['ADMIN']), diseaseController.updateDisease)

// ADMIN: Xóa loại bệnh
router.delete('/:diseaseId', authorize(['ADMIN']), diseaseController.deleteDisease)

// MANAGER: Xác nhận kết quả bệnh
router.post('/:diseaseId/confirm', authorize(['MANAGER']), diseaseController.confirmDiseaseResult)

// Tất cả: Xem lịch sử bệnh theo ao
router.get('/history/:pondId', diseaseController.getDiseaseHistory)

module.exports = router
