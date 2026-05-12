const express = require('express')
const router = express.Router()
const { authorize } = require('../middlewares/authorize')
const { taskController } = require('../controllers/index')

// MANAGER + WORKER: Lấy danh sách công việc
router.get('/', authorize(['MANAGER', 'WORKER']), taskController.getAllTasks)

// MANAGER: Tạo công việc mới
router.post('/', authorize(['MANAGER']), taskController.createTask)

// NOTE: Endpoints specific to WORKER (assigned-to-me / status update / upload image) removed

// MANAGER + WORKER: Lấy chi tiết công việc
router.get('/:taskId', authorize(['MANAGER', 'WORKER']), taskController.getTaskDetail)

// MANAGER + WORKER: Cập nhật trạng thái công việc
router.patch('/:taskId/status', authorize(['MANAGER', 'WORKER']), taskController.updateTaskStatus)

// MANAGER + WORKER: Upload ảnh minh chứng công việc
router.post('/:taskId/upload-image', authorize(['MANAGER', 'WORKER']), taskController.uploadTaskImage)

// MANAGER: Sửa công việc
router.put('/:taskId', authorize(['MANAGER']), taskController.updateTask)

// MANAGER: Xóa công việc
router.delete('/:taskId', authorize(['MANAGER']), taskController.deleteTask)

module.exports = router
