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
const expenseRoutes = require('./routes/expenseRoutes')
const sensorRoutes = require('./routes/sensorRoutes')
const notificationRoutes = require('./routes/notificationRoutes')
const diseaseRoutes = require('./routes/diseaseRoutes')
// adminRoutes removed
const inventoryRoutes = require('./routes/inventoryRoutes')
// Scheduler jobs
const { run: syncSeasonsAndPonds } = require('../scripts/sync_seasons_and_ponds')

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
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
  next()
})
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

// Logging
app.use(morgan('combined'))

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date() })
})

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/users', authenticateToken, userRoutes)
app.use('/api/ponds', authenticateToken, pondRoutes)
app.use('/api/seasons', authenticateToken, seasonRoutes)
app.use('/api/cultivation-logs', authenticateToken, cultivationLogRoutes)
app.use('/api/environment-logs', authenticateToken, environmentLogRoutes)
app.use('/api/tasks', authenticateToken, taskRoutes)
app.use('/api/expenses', authenticateToken, expenseRoutes)
app.use('/api/sensors', authenticateToken, sensorRoutes)
app.use('/api/notifications', authenticateToken, notificationRoutes)
app.use('/api/diseases', authenticateToken, diseaseRoutes)
// Admin routes removed
app.use('/api/inventory', authenticateToken, inventoryRoutes)

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

const ensureCultivationLogApprovalSchema = async () => {
  await db.query(`
    ALTER TABLE cultivation_logs
      ADD COLUMN IF NOT EXISTS approval_status VARCHAR(30) DEFAULT 'PENDING',
      ADD COLUMN IF NOT EXISTS approved_by BIGINT REFERENCES users(user_id),
      ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS rejected_by BIGINT REFERENCES users(user_id),
      ADD COLUMN IF NOT EXISTS rejected_reason TEXT,
      ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP
  `)

  await db.query(`
    UPDATE cultivation_logs
    SET approval_status = COALESCE(approval_status, 'PENDING')
    WHERE approval_status IS NULL
  `)
}

const startServer = async () => {
  await ensureCultivationLogApprovalSchema()

  server.listen(PORT, () => {
    logger.info(`
    ===================================
    ✅ Server started on port ${PORT}
    🌍 Environment: ${process.env.NODE_ENV}
    📡 API URL: ${process.env.API_URL || `http://localhost:${PORT}`}
    ===================================
  `)
  })

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
