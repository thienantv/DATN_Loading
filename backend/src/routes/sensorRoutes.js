const express = require('express')
const router = express.Router()
const { authorize } = require('../middlewares/authorize')
const { sensorController } = require('../controllers/index')

// MANAGER: Get all sensors
router.get('/', authorize(['MANAGER']), sensorController.getAllSensors)

// MANAGER: Tạo cảm biến mới
router.post('/', authorize(['MANAGER']), sensorController.createSensor)

// MANAGER: Sinh dữ liệu realtime giả cho cảm biến trong ao
router.post('/fake-realtime', authorize(['MANAGER']), sensorController.generateFakeRealtimeData)

// Tất cả: Lấy danh sách cảm biến theo ao
router.get('/pond/:pondId', sensorController.getSensorsByPondId)

// Tất cả: Lấy dữ liệu cảm biến theo thời gian (MUST come before /:sensorId/readings)
router.get('/:sensorId/readings/range', sensorController.getSensorReadingsByRange)

// Tất cả: Lấy dữ liệu realtime từ cảm biến
router.get('/:sensorId/readings', sensorController.getSensorReadings)

// Simulator: Tạo dữ liệu đọc cảm biến (cho testing)
router.post('/:sensorId/readings', sensorController.createSensorReading)

// MANAGER: Update sensor
router.put('/:sensorId', authorize(['MANAGER']), sensorController.updateSensor)

// MANAGER: Delete sensor
router.delete('/:sensorId', authorize(['MANAGER']), sensorController.deleteSensor)

module.exports = router
