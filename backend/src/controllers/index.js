const { seasonController, productController } = require('./commonController')
const { adminController } = require('./adminController')
const cultivationLogController = require('./cultivationLogController')
const expenseController = require('./expenseController')
const sensorController = require('./sensorController')
const diseaseController = require('./diseaseController')
const taskController = require('./taskController')
const notificationController = require('./notificationController')
const environmentLogService = require('../services/environmentLogService')
const feedLogService = require('../services/feedLogService')
const logger = require('../utils/logger')

// Feed Log Controller
const feedLogController = {
  async createFeedLog(req, res) {
    try {
      const { seasonId, productId, feedingDate, feedingTime, mealNo, quantityKg, note } = req.body
      const feedLog = await feedLogService.createFeedLog(seasonId, productId, feedingDate, feedingTime, mealNo, quantityKg, req.user.user_id, note)
      res.status(201).json({ success: true, message: 'Đã ghi nhật ký cho ăn', data: feedLog })
    } catch (error) {
      logger.error('Error in createFeedLog:', error)
      res.status(400).json({ success: false, message: error.message })
    }
  },

  async getFeedLogsBySeasonId(req, res) {
    try {
      const { seasonId } = req.params
      const feedLogs = await feedLogService.getFeedLogsBySeasonId(seasonId)
      res.json({ success: true, data: feedLogs })
    } catch (error) {
      logger.error('Error in getFeedLogsBySeasonId:', error)
      res.status(500).json({ success: false, message: error.message })
    }
  },

  async getFeedLogDetail(req, res) {
    try {
      const { feedLogId } = req.params
      const feedLog = await feedLogService.getFeedLogDetail(feedLogId)
      if (!feedLog) return res.status(404).json({ success: false, message: 'Nhật ký không tồn tại' })
      res.json({ success: true, data: feedLog })
    } catch (error) {
      logger.error('Error in getFeedLogDetail:', error)
      res.status(500).json({ success: false, message: error.message })
    }
  },

  async updateFeedLog(req, res) {
    try {
      const { feedLogId } = req.params
      const updates = req.body
      const feedLog = await feedLogService.updateFeedLog(feedLogId, updates)
      res.json({ success: true, message: 'Đã cập nhật nhật ký cho ăn', data: feedLog })
    } catch (error) {
      logger.error('Error in updateFeedLog:', error)
      res.status(400).json({ success: false, message: error.message })
    }
  },
}

// Environment Log Controller
const environmentLogController = {
  async createEnvironmentLog(req, res) {
    try {
      const { seasonId, ph, temperature, salinity, oxygen, nh3 } = req.body
      const log = await environmentLogService.createEnvironmentLog(seasonId, ph, temperature, salinity, oxygen, nh3, req.user.user_id)
      res.status(201).json({ success: true, message: 'Đã ghi chỉ số môi trường', data: log })
    } catch (error) {
      logger.error('Error in createEnvironmentLog:', error)
      res.status(400).json({ success: false, message: error.message })
    }
  },

  async getEnvironmentLogsBySeasonId(req, res) {
    try {
      const { seasonId } = req.params
      const logs = await environmentLogService.getEnvironmentLogsBySeasonId(seasonId)
      res.json({ success: true, data: logs })
    } catch (error) {
      logger.error('Error in getEnvironmentLogsBySeasonId:', error)
      res.status(500).json({ success: false, message: error.message })
    }
  },

  async getEnvironmentLogsByPondId(req, res) {
    try {
      const { pondId } = req.params
      const logs = await environmentLogService.getEnvironmentLogsByPondId(pondId)
      res.json({ success: true, data: logs })
    } catch (error) {
      logger.error('Error in getEnvironmentLogsByPondId:', error)
      res.status(500).json({ success: false, message: error.message })
    }
  },

  async getLatestEnvironmentLog(req, res) {
    try {
      const { seasonId } = req.params
      const log = await environmentLogService.getLatestEnvironmentLog(seasonId)
      res.json({ success: true, data: log || {} })
    } catch (error) {
      logger.error('Error in getLatestEnvironmentLog:', error)
      res.status(500).json({ success: false, message: error.message })
    }
  },

  async setEnvironmentThresholds(req, res) {
    try {
      const { seasonId } = req.params
      const thresholds = req.body
      const result = await environmentLogService.setEnvironmentThresholds(seasonId, thresholds)
      res.status(201).json({ success: true, message: 'Đã thiết lập ngưỡng cảnh báo', data: result })
    } catch (error) {
      logger.error('Error in setEnvironmentThresholds:', error)
      res.status(400).json({ success: false, message: error.message })
    }
  },

  async getEnvironmentThresholds(req, res) {
    try {
      const { seasonId } = req.params
      const thresholds = await environmentLogService.getEnvironmentThresholds(seasonId)
      res.json({ success: true, data: thresholds || {} })
    } catch (error) {
      logger.error('Error in getEnvironmentThresholds:', error)
      res.status(500).json({ success: false, message: error.message })
    }
  },
}


// Admin Controller is imported from adminController.js

module.exports = {
  feedLogController,
  cultivationLogController,
  environmentLogController,
  taskController,
  expenseController,
  sensorController,
  notificationController,
  diseaseController,
  adminController,
  seasonController,
  productController,
}
