const express = require('express')
const router = express.Router()
const { authorize } = require('../middlewares/authorize')
const { taskController } = require('../controllers/index')

// QUẢN LÝ + CÔNG NHÂN: Lấy danh sách công việc
router.get('/', authorize(['MANAGER', 'WORKER']), taskController.getAllTasks)

// QUẢN LÝ: Tạo công việc mới
router.post('/', authorize(['MANAGER']), taskController.createTask)

// NOTE: Endpoints specific to WORKER (assigned-to-me / status update / upload image) removed

// QUẢN LÝ + CÔNG NHÂN: Lấy chi tiết công việc
router.get('/:taskId', authorize(['MANAGER', 'WORKER']), taskController.getTaskDetail)

// QUẢN LÝ + CÔNG NHÂN: Cập nhật trạng thái công việc
router.patch('/:taskId/status', authorize(['MANAGER', 'WORKER']), taskController.updateTaskStatus)

// QUẢN LÝ + CÔNG NHÂN: Tải ảnh minh chứng công việc lên
router.post('/:taskId/upload-image', authorize(['MANAGER', 'WORKER']), taskController.uploadTaskImage)

// QUẢN LÝ: Sửa công việc
router.put('/:taskId', authorize(['MANAGER']), taskController.updateTask)

// QUẢN LÝ: Xóa công việc
router.delete('/:taskId', authorize(['MANAGER']), taskController.deleteTask)

module.exports = router
