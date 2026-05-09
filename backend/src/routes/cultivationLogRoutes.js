const express = require('express')
const router = express.Router()
const { authorize } = require('../middlewares/authorize')
const { cultivationLogController } = require('../controllers/index')


// Tất cả: Lấy nhật ký canh tác theo mùa vụ
router.get('/season/:seasonId', cultivationLogController.getCultivationLogsBySeasonId)

// Tất cả: Lấy nhật ký canh tác theo ao
router.get('/pond/:pondId', cultivationLogController.getCultivationLogsByPondId)

// Tất cả: Lấy chi tiết nhật ký canh tác
router.get('/:logId', cultivationLogController.getCultivationLogDetail)

// NOTE: Staff submission/editing endpoints removed — only manager/admin endpoints kept

// MANAGER: Duyệt nhật ký canh tác
router.post('/:logId/approve', authorize(['MANAGER']), cultivationLogController.approveCultivationLog)

// MANAGER: Từ chối nhật ký canh tác
router.post('/:logId/reject', authorize(['MANAGER']), cultivationLogController.rejectCultivationLog)

// MANAGER: Khóa nhật ký theo ngày
router.post('/season/:seasonId/lock-date', authorize(['MANAGER']), cultivationLogController.lockDateLogs)

module.exports = router
