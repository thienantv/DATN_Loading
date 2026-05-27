const express = require('express')
const router = express.Router()
const { authorize } = require('../middlewares/authorize')
const { seasonController } = require('../controllers/index')

// Tất cả người dùng: Lấy danh sách mùa vụ
router.get('/', seasonController.getAllSeasons)

// Tất cả người dùng: Lấy chi tiết mùa vụ
router.get('/:seasonId', seasonController.getSeasonDetail)

// QUẢN LÝ: Tạo mùa vụ mới
// Allow only TECHNICIAN to manage seasons (with service-level checks)
router.post('/', authorize(['TECHNICIAN']), seasonController.createSeason)

// Update
router.put('/:seasonId', authorize(['TECHNICIAN']), seasonController.updateSeason)

// Harvest
router.post('/:seasonId/harvest', authorize(['TECHNICIAN']), seasonController.harvestSeason)

// Delete
router.delete('/:seasonId', authorize(['TECHNICIAN']), seasonController.deleteSeason)

module.exports = router
