const express = require('express')
const router = express.Router()
const { authorize } = require('../middlewares/authorize')
const { sensorController } = require('../controllers/index')

// KỸ THUẬT VIÊN: Lấy tất cả cảm biến
router.get('/', authorize(['TECHNICIAN']), sensorController.getAllSensors)

// KỸ THUẬT VIÊN: Tạo cảm biến mới
router.post('/', authorize(['TECHNICIAN']), sensorController.createSensor)

// KỸ THUẬT VIÊN: Lấy danh sách cảm biến theo ao
router.get('/pond/:pondId', authorize(['TECHNICIAN']), sensorController.getSensorsByPondId)

// KỸ THUẬT VIÊN: Lấy dữ liệu realtime từ cảm biến
router.get('/:sensorId/readings', authorize(['TECHNICIAN']), sensorController.getSensorReadings)

// KỸ THUẬT VIÊN: Cập nhật cảm biến
router.put('/:sensorId', authorize(['TECHNICIAN']), sensorController.updateSensor)

// KỸ THUẬT VIÊN: Xóa cảm biến
router.delete('/:sensorId', authorize(['TECHNICIAN']), sensorController.deleteSensor)

module.exports = router
