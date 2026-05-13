const express = require('express')
const router = express.Router()
const { authorize } = require('../middlewares/authorize')
const { seasonController } = require('../controllers/index')

// Tất cả người dùng: Lấy danh sách mùa vụ
router.get('/', seasonController.getAllSeasons)

// Tất cả người dùng: Lấy chi tiết mùa vụ
router.get('/:seasonId', seasonController.getSeasonDetail)

// QUẢN LÝ: Tạo mùa vụ mới
router.post('/', authorize(['MANAGER']), seasonController.createSeason)

// QUẢN LÝ: Sửa thông tin mùa vụ
router.put('/:seasonId', authorize(['MANAGER']), seasonController.updateSeason)

// QUẢN LÝ: Kết thúc mùa vụ (thu hoạch)
router.post('/:seasonId/harvest', authorize(['MANAGER']), seasonController.harvestSeason)

// QUẢN LÝ: Xóa mùa vụ (nếu chưa chạy)
router.delete('/:seasonId', authorize(['MANAGER']), seasonController.deleteSeason)

module.exports = router
