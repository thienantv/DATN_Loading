const express = require('express')
const router = express.Router()
const { authorize } = require('../middlewares/authorize')
const { sensorController } = require('../controllers/index')

// QUẢN LÝ/KỸ THUẬT VIÊN: Lấy tất cả cảm biến
router.get('/', authorize(['MANAGER', 'TECHNICIAN']), sensorController.getAllSensors)

// QUẢN LÝ/KỸ THUẬT VIÊN: Tạo cảm biến mới
router.post('/', authorize(['MANAGER', 'TECHNICIAN']), sensorController.createSensor)

// QUẢN LÝ/KỸ THUẬT VIÊN: Sinh dữ liệu realtime giả cho cảm biến trong ao
router.post('/fake-realtime', authorize(['MANAGER', 'TECHNICIAN']), sensorController.generateFakeRealtimeData)

// QUẢN LÝ/KỸ THUẬT VIÊN: Lấy danh sách cảm biến theo ao
router.get('/pond/:pondId', authorize(['MANAGER', 'TECHNICIAN']), sensorController.getSensorsByPondId)

// QUẢN LÝ/KỸ THUẬT VIÊN: Lấy dữ liệu cảm biến theo khoảng thời gian (phải đặt trước /:sensorId/readings)
router.get('/:sensorId/readings/range', authorize(['MANAGER', 'TECHNICIAN']), sensorController.getSensorReadingsByRange)

// QUẢN LÝ/KỸ THUẬT VIÊN: Lấy dữ liệu realtime từ cảm biến
router.get('/:sensorId/readings', authorize(['MANAGER', 'TECHNICIAN']), sensorController.getSensorReadings)

// Simulator: Tạo dữ liệu đọc cảm biến (cho testing)
router.post('/:sensorId/readings', sensorController.createSensorReading)

// QUẢN LÝ/KỸ THUẬT VIÊN: Cập nhật cảm biến
router.put('/:sensorId', authorize(['MANAGER', 'TECHNICIAN']), sensorController.updateSensor)

// QUẢN LÝ: Xóa cảm biến
router.delete('/:sensorId', authorize(['MANAGER']), sensorController.deleteSensor)

module.exports = router
