const express = require('express')
const router = express.Router()
const { authorize } = require('../middlewares/authorize')
const { seasonController } = require('../controllers/index')

// Tất cả user: Lấy danh sách mùa vụ
router.get('/', seasonController.getAllSeasons)

// Tất cả user: Lấy chi tiết mùa vụ
router.get('/:seasonId', seasonController.getSeasonDetail)

// MANAGER: Tạo mùa vụ mới
router.post('/', authorize(['MANAGER']), seasonController.createSeason)

// MANAGER: Sửa thông tin mùa vụ
router.put('/:seasonId', authorize(['MANAGER']), seasonController.updateSeason)

// MANAGER: Kết thúc mùa vụ (harvest)
router.post('/:seasonId/harvest', authorize(['MANAGER']), seasonController.harvestSeason)

// MANAGER: Xóa mùa vụ (nếu chưa chạy)
router.delete('/:seasonId', authorize(['MANAGER']), seasonController.deleteSeason)

module.exports = router
