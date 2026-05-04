const express = require('express')
const router = express.Router()
const { authorize } = require('../middlewares/authorize')
const { taskController } = require('../controllers/index')

// MANAGER + STAFF: Lấy danh sách công việc
router.get('/', authorize(['MANAGER', 'STAFF']), taskController.getAllTasks)

// MANAGER: Tạo công việc mới
router.post('/', authorize(['MANAGER']), taskController.createTask)

// STAFF: Lấy công việc được giao cho mình
router.get('/assigned-to-me', authorize(['STAFF']), taskController.getMyTasks)

// STAFF: Cập nhật trạng thái công việc
router.patch('/:taskId/status', authorize(['STAFF']), taskController.updateTaskStatus)

// STAFF: Upload hình ảnh hoàn thành công việc
router.post('/:taskId/upload-image', authorize(['STAFF']), taskController.uploadTaskImage)

// MANAGER + STAFF: Lấy chi tiết công việc
router.get('/:taskId', authorize(['MANAGER', 'STAFF']), taskController.getTaskDetail)

// MANAGER: Sửa công việc
router.put('/:taskId', authorize(['MANAGER']), taskController.updateTask)

// MANAGER: Xóa công việc
router.delete('/:taskId', authorize(['MANAGER']), taskController.deleteTask)

module.exports = router
