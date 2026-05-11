const express = require('express')
const router = express.Router()
const { authorize } = require('../middlewares/authorize')
const { taskController } = require('../controllers/index')

// MANAGER + STAFF: Lấy danh sách công việc
router.get('/', authorize(['MANAGER', 'STAFF']), taskController.getAllTasks)

// MANAGER: Tạo công việc mới
router.post('/', authorize(['MANAGER']), taskController.createTask)

// NOTE: Endpoints specific to STAFF (assigned-to-me / status update / upload image) removed

// MANAGER + STAFF: Lấy chi tiết công việc
router.get('/:taskId', authorize(['MANAGER', 'STAFF']), taskController.getTaskDetail)

// MANAGER + STAFF: Cập nhật trạng thái công việc
router.patch('/:taskId/status', authorize(['MANAGER', 'STAFF']), taskController.updateTaskStatus)

// MANAGER + STAFF: Upload ảnh minh chứng công việc
router.post('/:taskId/upload-image', authorize(['MANAGER', 'STAFF']), taskController.uploadTaskImage)

// MANAGER: Sửa công việc
router.put('/:taskId', authorize(['MANAGER']), taskController.updateTask)

// MANAGER: Xóa công việc
router.delete('/:taskId', authorize(['MANAGER']), taskController.deleteTask)

module.exports = router
