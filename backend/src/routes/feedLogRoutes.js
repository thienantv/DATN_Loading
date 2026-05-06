const express = require('express')
const router = express.Router()
const { authorize } = require('../middlewares/authorize')
const { feedLogController } = require('../controllers/index')

// STAFF: Ghi nhật ký cho ăn
router.post('/', authorize(['STAFF']), feedLogController.createFeedLog)

// Tất cả: Lấy nhật ký cho ăn theo mùa vụ
router.get('/season/:seasonId', feedLogController.getFeedLogsBySeasonId)

// Tất cả: Lấy chi tiết nhật ký cho ăn
router.get('/:feedLogId', feedLogController.getFeedLogDetail)

// STAFF: Sửa nhật ký (nếu chưa duyệt)
router.put('/:feedLogId', authorize(['STAFF']), feedLogController.updateFeedLog)

module.exports = router
