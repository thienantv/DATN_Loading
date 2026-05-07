const express = require('express')
const router = express.Router()
const { authorize } = require('../middlewares/authorize')
const pondController = require('../controllers/pondController')

// Tất cả user: Lấy danh sách ao
router.get('/', pondController.getAllPonds)

// Tất cả user: Lấy chi tiết ao
router.get('/:pondId', pondController.getPondDetail)

// MANAGER: Tạo ao mới
router.post('/', authorize(['MANAGER']), pondController.createPond)

// MANAGER: Sửa thông tin ao
router.put('/:pondId', authorize(['MANAGER']), pondController.updatePond)

// MANAGER: Xóa ao
router.delete('/:pondId', authorize(['MANAGER']), pondController.deletePond)

// MANAGER: Cập nhật trạng thái ao
router.patch('/:pondId/status', authorize(['MANAGER']), pondController.updatePondStatus)

module.exports = router
