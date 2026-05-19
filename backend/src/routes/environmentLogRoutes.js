const express = require('express')
const router = express.Router()
const { authorize } = require('../middlewares/authorize')
const { environmentLogController } = require('../controllers/index')

// TECHNICIAN: Nhập chỉ số môi trường thủ công
router.post('/', authorize(['TECHNICIAN']), environmentLogController.createEnvironmentLog)

// Tất cả: Lấy chỉ số môi trường theo mùa vụ
router.get('/season/:seasonId', environmentLogController.getEnvironmentLogsBySeasonId)

// Tất cả: Lấy chỉ số môi trường theo ao
router.get('/pond/:pondId', environmentLogController.getEnvironmentLogsByPondId)

// Tất cả: Lấy chỉ số môi trường realtime
router.get('/season/:seasonId/latest', environmentLogController.getLatestEnvironmentLog)

// (Removed manager-only threshold-setting route)

// Tất cả: Lấy ngưỡng cảnh báo theo mùa vụ (deprecated)
router.get('/season/:seasonId/thresholds', environmentLogController.getEnvironmentThresholds)

// Tất cả: Lấy ngưỡng cảnh báo theo ao
router.get('/pond/:pondId/thresholds', environmentLogController.getEnvironmentThresholds)

// TECHNICIAN: Thiết lập ngưỡng cảnh báo theo ao
router.put('/pond/:pondId/thresholds', authorize(['TECHNICIAN']), environmentLogController.setEnvironmentThresholds)

module.exports = router
