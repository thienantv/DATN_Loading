const express = require('express')
const router = express.Router()
const { notificationController } = require('../controllers/index')

// Lấy danh sách thông báo của user
router.get('/', notificationController.getMyNotifications)

// Đánh dấu thông báo đã đọc
router.put('/:notificationId/read', notificationController.markAsRead)

// Xóa thông báo
router.delete('/:notificationId', notificationController.deleteNotification)

// Xóa tất cả thông báo
router.delete('/', notificationController.deleteAllNotifications)

module.exports = router
