const express = require('express')
const router = express.Router()
const { authorize } = require('../middlewares/authorize')
const { sensorController } = require('../controllers/index')

// ADMIN: Get all sensors
router.get('/', authorize(['ADMIN']), sensorController.getAllSensors)

// Tất cả: Lấy danh sách cảm biến theo ao
router.get('/pond/:pondId', sensorController.getSensorsByPondId)

// Tất cả: Lấy dữ liệu realtime từ cảm biến
router.get('/:sensorId/readings', sensorController.getSensorReadings)

// Tất cả: Lấy dữ liệu cảm biến theo thời gian
router.get('/:sensorId/readings/range', sensorController.getSensorReadingsByRange)

// ADMIN: Tạo cảm biến mới (1.2)
router.post('/', authorize(['ADMIN']), sensorController.createSensor)

// ADMIN: Sửa thông tin cảm biến (1.2)
router.put('/:sensorId', authorize(['ADMIN']), sensorController.updateSensor)

// ADMIN: Xóa cảm biến (1.2)
router.delete('/:sensorId', authorize(['ADMIN']), sensorController.deleteSensor)

// Simulator: Tạo dữ liệu đọc cảm biến (cho testing)
router.post('/:sensorId/readings', sensorController.createSensorReading)

module.exports = router
