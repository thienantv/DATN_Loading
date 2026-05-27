const express = require('express')
const router = express.Router()
const { authorize } = require('../middlewares/authorize')
const { taskController } = require('../controllers/index')

// OWNER + CÔNG NHÂN: Lấy danh sách công việc
router.get('/', authorize(['OWNER', 'WORKER']), taskController.getAllTasks)

// OWNER: Tạo công việc mới
router.post('/', authorize(['OWNER']), taskController.createTask)

// NOTE: Endpoints specific to WORKER (assigned-to-me / status update / upload image) removed

// OWNER + CÔNG NHÂN: Lấy chi tiết công việc
router.get('/:taskId', authorize(['OWNER', 'WORKER']), taskController.getTaskDetail)

// OWNER + CÔNG NHÂN: Cập nhật trạng thái công việc
router.patch('/:taskId/status', authorize(['OWNER', 'WORKER']), taskController.updateTaskStatus)

// OWNER + CÔNG NHÂN: Tải ảnh minh chứng công việc lên
router.post('/:taskId/upload-image', authorize(['OWNER', 'WORKER']), taskController.uploadTaskImage)

// OWNER: Sửa công việc
router.put('/:taskId', authorize(['OWNER']), taskController.updateTask)

// OWNER: Xóa công việc
router.delete('/:taskId', authorize(['OWNER']), taskController.deleteTask)

module.exports = router
