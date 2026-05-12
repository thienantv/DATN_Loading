const express = require('express')
const router = express.Router()
const { authorize } = require('../middlewares/authorize')
const { sensorController } = require('../controllers/index')

// MANAGER/TECHNICIAN: Get all sensors
router.get('/', authorize(['MANAGER', 'TECHNICIAN']), sensorController.getAllSensors)

// MANAGER/TECHNICIAN: Tạo cảm biến mới
router.post('/', authorize(['MANAGER', 'TECHNICIAN']), sensorController.createSensor)

// MANAGER/TECHNICIAN: Sinh dữ liệu realtime giả cho cảm biến trong ao
router.post('/fake-realtime', authorize(['MANAGER', 'TECHNICIAN']), sensorController.generateFakeRealtimeData)

// MANAGER/TECHNICIAN: Lấy danh sách cảm biến theo ao
router.get('/pond/:pondId', authorize(['MANAGER', 'TECHNICIAN']), sensorController.getSensorsByPondId)

// MANAGER/TECHNICIAN: Lấy dữ liệu cảm biến theo thời gian (MUST come before /:sensorId/readings)
router.get('/:sensorId/readings/range', authorize(['MANAGER', 'TECHNICIAN']), sensorController.getSensorReadingsByRange)

// MANAGER/TECHNICIAN: Lấy dữ liệu realtime từ cảm biến
router.get('/:sensorId/readings', authorize(['MANAGER', 'TECHNICIAN']), sensorController.getSensorReadings)

// Simulator: Tạo dữ liệu đọc cảm biến (cho testing)
router.post('/:sensorId/readings', sensorController.createSensorReading)

// MANAGER/TECHNICIAN: Update sensor
router.put('/:sensorId', authorize(['MANAGER', 'TECHNICIAN']), sensorController.updateSensor)

// MANAGER: Delete sensor
router.delete('/:sensorId', authorize(['MANAGER']), sensorController.deleteSensor)

module.exports = router
