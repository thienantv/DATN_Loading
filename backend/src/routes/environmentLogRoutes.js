const express = require('express')
const router = express.Router()
const { authorize } = require('../middlewares/authorize')
const { environmentLogController } = require('../controllers/index')

// STAFF: Nhập chỉ số môi trường thủ công
router.post('/', authorize(['STAFF']), environmentLogController.createEnvironmentLog)

// Tất cả: Lấy chỉ số môi trường theo mùa vụ
router.get('/season/:seasonId', environmentLogController.getEnvironmentLogsBySeasonId)

// Tất cả: Lấy chỉ số môi trường theo ao
router.get('/pond/:pondId', environmentLogController.getEnvironmentLogsByPondId)

// Tất cả: Lấy chỉ số môi trường realtime
router.get('/season/:seasonId/latest', environmentLogController.getLatestEnvironmentLog)

// (Removed manager-only threshold-setting route)

// Tất cả: Lấy ngưỡng cảnh báo
router.get('/season/:seasonId/thresholds', environmentLogController.getEnvironmentThresholds)

module.exports = router
