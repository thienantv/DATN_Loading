const express = require('express')
const router = express.Router()
const { authorize } = require('../middlewares/authorize')
const pondController = require('../controllers/pondController')

// Tất cả user: Lấy danh sách ao
router.get('/', pondController.getAllPonds)

// Tất cả user: Lấy chi tiết ao
router.get('/:pondId', pondController.getPondDetail)

// QUẢN LÝ/OWNER: Tạo ao mới trong phạm vi trang trại của mình
router.post('/', authorize(['MANAGER', 'OWNER']), pondController.createPond)

// QUẢN LÝ/OWNER: Sửa thông tin ao
router.put('/:pondId', authorize(['MANAGER', 'OWNER']), pondController.updatePond)

// QUẢN LÝ/OWNER: Xóa ao
router.delete('/:pondId', authorize(['MANAGER', 'OWNER']), pondController.deletePond)

// QUẢN LÝ/OWNER: Cập nhật trạng thái ao
router.patch('/:pondId/status', authorize(['MANAGER', 'OWNER']), pondController.updatePondStatus)

module.exports = router
