const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')
const http = require('http')
const socketIO = require('socket.io')
const path = require('path')
require('dotenv').config()
const cron = require('node-cron')

// Config
const db = require('./config/database')

// Utils
const logger = require('./utils/logger')

// Middleware
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler')
const { authenticateToken } = require('./middlewares/auth')

// Routes
const authRoutes = require('./routes/authRoutes')
const userRoutes = require('./routes/userRoutes')
const pondRoutes = require('./routes/pondRoutes')
const seasonRoutes = require('./routes/seasonRoutes')
const cultivationLogRoutes = require('./routes/cultivationLogRoutes')
const environmentLogRoutes = require('./routes/environmentLogRoutes')
const taskRoutes = require('./routes/taskRoutes')
const expenseRoutes = require('./routes/expenseRoutes');
const sensorRoutes = require('./routes/sensorRoutes')
const notificationRoutes = require('./routes/notificationRoutes')
const diseaseRoutes = require('./routes/diseaseRoutes')
const productRoutes = require('./routes/productRoutes')

// Scheduler jobs
const { run: syncSeasonsAndPonds } = require('../scripts/sync_seasons_and_ponds')
const { generateFakeSensorReadings } = require('./services/sensorReadingService')
const { autoUpdateOverdueTasks } = require('./middlewares/cronTaskJob')

// Initialize Express
const app = express()

// Security
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'same-origin' },
}))
app.set('trust proxy', true)

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || '*',
  credentials: true,
}))

// Body parser
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ limit: '50mb', extended: true }))
app.use('/uploads', (req, res, next) => {
  res.setHeader('CrossOrigin-Resource-Policy', 'cross-origin')
  next()
})
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

// Logging
app.use(morgan('combined'))

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date() })
})

// ============================================================================
// HỆ THỐNG ĐƯỜNG DẪN API (ROUTES)
// ============================================================================

// 1. Route không cần khóa bảo mật (Public)
app.use('/api/auth', authRoutes)

// 2. Các route yêu cầu phải đăng nhập (Bảo mật bằng authenticateToken)
app.use('/api/users/matrix', authenticateToken, require('./routes/userRoutes'));
app.use('/api/users', authenticateToken, userRoutes)
app.use('/api/ponds', authenticateToken, pondRoutes)
app.use('/api/seasons', authenticateToken, seasonRoutes)
app.use('/api/cultivation-logs', authenticateToken, cultivationLogRoutes)
app.use('/api/environment-logs', authenticateToken, environmentLogRoutes)
app.use('/api/tasks', authenticateToken, taskRoutes)
app.use('/api/sensors', authenticateToken, sensorRoutes)
app.use('/api/notifications', authenticateToken, notificationRoutes)
app.use('/api/diseases', authenticateToken, diseaseRoutes)
app.use('/api/products', authenticateToken, productRoutes)

// ĐÃ THÊM LỚP XÁC THỰC CHO ROUTE CHI PHÍ Ở ĐÂY CHÍNH XÁC:
app.use('/api/expenses', authenticateToken, expenseRoutes);

// Error handling
app.use(notFoundHandler)
app.use(errorHandler)

// HTTP Server + Socket.io
const PORT = process.env.PORT || 3000
const server = http.createServer(app)

const io = socketIO(server, {
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})

// Socket.io authentication
io.use((socket, next) => {
  const token = socket.handshake.auth.token
  if (!token) {
    return next(new Error('Authentication error'))
  }
  next()
})

// Socket.io events
io.on('connection', (socket) => {
  logger.info(`🔌 Client connected: ${socket.id}`)

  socket.on('join_pond', (pondId) => {
    socket.join(`pond_${pondId}`)
    logger.info(`📍 Client ${socket.id} joined pond ${pondId}`)
  })

  socket.on('leave_pond', (pondId) => {
    socket.leave(`pond_${pondId}`)
    logger.info(`📍 Client ${socket.id} left pond ${pondId}`)
  })

  socket.on('subscribe_alerts', () => {
    socket.join('alerts')
    logger.info(`🔔 Client ${socket.id} subscribed to alerts`)
  })

  socket.on('disconnect', () => {
    logger.info(`🔌 Client disconnected: ${socket.id}`)
  })
})

// Export for use in services
app.locals.io = io

const startServer = async () => {

  server.listen(PORT, () => {
    logger.info(`
    ===================================
    ✅ Server started on port ${PORT}
    🌍 Environment: ${process.env.NODE_ENV}
    📡 API URL: ${process.env.API_URL || `http://localhost:${PORT}`}
    ===================================
  `)
  })

  // Schedule tự động kiểm tra và cập nhật công việc quá hạn (Chạy vào 00:00 mỗi ngày)
  try {
    cron.schedule('0 0 * * *', async () => {
      logger.info('🕒 Đang chạy tiến trình ngầm kiểm tra công việc quá hạn...');
      try {
        await autoUpdateOverdueTasks();
        logger.info('✅ Đã cập nhật trạng thái quá hạn cho các công việc hết hạn.');
      } catch (err) {
        logger.error('❌ Tiến trình kiểm tra công việc quá hạn thất bại:', err);
      }
    });
    logger.info('📅 Hệ thống tự động quét Task quá hạn đã được thiết lập thành công (00:00 hàng ngày).');
  } catch (err) {
    logger.error('Không thể cấu hình lịch trình quét Task quá hạn:', err);
  }

  // =========================================================================
  // TỰ ĐỘNG CHUYỂN TRẠNG THÁI "ĐANG THỰC HIỆN" KHI ĐẾN GIỜ
  // =========================================================================
  try {
    cron.schedule('* * * * *', async () => { 
      try {
        const updateTasksQuery = `
          UPDATE tasks 
          SET status = 'IN_PROGRESS', updated_at = NOW()
          WHERE status = 'PENDING' 
            AND start_date <= NOW()
          RETURNING task_id
        `;
        const result = await db.query(updateTasksQuery);
        
        if (result.rows.length > 0) {
          const taskIds = result.rows.map(r => r.task_id);
          await db.query(`
            UPDATE task_workers 
            SET status = 'DOING', started_at = NOW()
            WHERE task_id = ANY($1) AND status = 'ASSIGNED'
          `, [taskIds]);

          logger.info(`🔄 [CRON JOB] Đã tự động chuyển ${result.rowCount} công việc sang trạng thái ĐANG THỰC HIỆN.`);
        }
      } catch (err) {
        logger.error('❌ Lỗi khi tự động cập nhật trạng thái IN_PROGRESS:', err);
      }
    });
    logger.info('🕒 Hệ thống tự động quét công việc đến giờ đã được thiết lập (chạy mỗi phút).');
  } catch (err) {
    logger.error('Không thể cấu hình lịch trình quét Task đến giờ:', err);
  }

  // Schedule background sync job for seasons/ponds
  try {
    const cronExpr = process.env.SYNC_CRON === 'disabled' ? null : (process.env.SYNC_CRON || '*/1 * * * *')
    if (cronExpr) {
      cron.schedule(cronExpr, async () => {
        logger.info(`Running scheduled sync job (${cronExpr})`)
        try {
          await syncSeasonsAndPonds()
        } catch (err) {
          logger.error('Scheduled sync job failed', err)
        }
      })
      logger.info(`Scheduled sync job configured: ${cronExpr}`)
    } else {
      logger.info('Scheduled sync job is disabled (SYNC_CRON=disabled)')
    }
  } catch (err) {
    logger.error('Failed to configure scheduled sync job', err)
  }

  // Schedule fake sensor readings every 30 seconds
  try {
    const sensorCronExpr = process.env.SENSOR_READING_CRON === 'disabled'
      ? null
      : (process.env.SENSOR_READING_CRON || '*/30 * * * * *')

    if (sensorCronExpr) {
      cron.schedule(sensorCronExpr, async () => {
        logger.info(`Running scheduled fake sensor data job (${sensorCronExpr})`)
        try {
          await generateFakeSensorReadings()
        } catch (err) {
          logger.error('Scheduled fake sensor data job failed', err)
        }
      })
      logger.info(`Scheduled fake sensor data job configured: ${sensorCronExpr}`)
    } else {
      logger.info('Scheduled fake sensor data job is disabled (SENSOR_READING_CRON=disabled)')
    }
  } catch (err) {
    logger.error('Failed to configure scheduled fake sensor data job', err)
  }
}

startServer().catch((error) => {
  logger.error('Failed to start server:', error)
  process.exit(1)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully')
  server.close(() => {
    logger.info('Server closed')
    process.exit(0)
  })
})

module.exports = { app, server, io }