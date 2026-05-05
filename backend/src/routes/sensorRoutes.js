const express = require('express')
const router = express.Router()
const { authorize } = require('../middlewares/authorize')
const { sensorController } = require('../controllers/index')

// MANAGER: Get all sensors
router.get('/', authorize(['MANAGER']), sensorController.getAllSensors)

// Tất cả: Lấy danh sách cảm biến theo ao
router.get('/pond/:pondId', sensorController.getSensorsByPondId)

// Tất cả: Lấy dữ liệu realtime từ cảm biến
router.get('/:sensorId/readings', sensorController.getSensorReadings)

// Tất cả: Lấy dữ liệu cảm biến theo thời gian
router.get('/:sensorId/readings/range', sensorController.getSensorReadingsByRange)

// MANAGER: Tạo cảm biến mới
router.post('/', authorize(['MANAGER']), sensorController.createSensor)

// MANAGER: Sửa thông tin cảm biến
router.put('/:sensorId', authorize(['MANAGER']), sensorController.updateSensor)

// MANAGER: Xóa cảm biến
router.delete('/:sensorId', authorize(['MANAGER']), sensorController.deleteSensor)

// Simulator: Tạo dữ liệu đọc cảm biến (cho testing)
router.post('/:sensorId/readings', sensorController.createSensorReading)

module.exports = router
