const express = require('express')
const router = express.Router()
const { authorize } = require('../middlewares/authorize')
const { feedLogController } = require('../controllers/index')

// WORKER: Ghi nhật ký cho ăn
router.post('/', authorize(['WORKER']), feedLogController.createFeedLog)

// Tất cả: Lấy nhật ký cho ăn theo mùa vụ
router.get('/season/:seasonId', feedLogController.getFeedLogsBySeasonId)

// Tất cả: Lấy chi tiết nhật ký cho ăn
router.get('/:feedLogId', feedLogController.getFeedLogDetail)

// WORKER: Sửa nhật ký cho ăn thuộc ao được phân công
router.put('/:feedLogId', authorize(['WORKER']), feedLogController.updateFeedLog)

// WORKER: Xoá nhật ký cho ăn thuộc ao được phân công
router.delete('/:feedLogId', authorize(['WORKER']), feedLogController.deleteFeedLog)

module.exports = router
