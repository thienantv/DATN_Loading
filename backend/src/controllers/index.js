const { seasonController } = require('./commonController')
const { seasonService } = require('../services/commonService')
const { adminController } = require('./adminController')
const cultivationLogController = require('./cultivationLogController')
const expenseController = require('./expenseController')
const sensorController = require('./sensorController')
const diseaseController = require('./diseaseController')
const taskController = require('./taskController')
const notificationController = require('./notificationController')
const inventoryController = require('./inventoryController')
const pool = require('../config/database')
const environmentLogService = require('../services/environmentLogService')
const feedLogService = require('../services/feedLogService')
const logger = require('../utils/logger')

// Feed Log Controller
const feedLogController = {
  async createFeedLog(req, res) {
    try {
      const { seasonId, productId, feedingDate, feedingTime, mealNo, quantityKg, note } = req.body

      if (!seasonId || !productId || !feedingDate || !feedingTime || !mealNo || !quantityKg) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng nhập đầy đủ mùa vụ, loại thức ăn, ngày/giờ, cữ ăn và số lượng',
        })
      }

      // Worker chỉ được ghi cho mùa vụ thuộc ao được phân công.
      const season = await seasonService.getSeasonById(seasonId, req.user.user_id, req.user.role)
      if (!season) {
        return res.status(403).json({
          success: false,
          message: 'Bạn chỉ được ghi nhật ký cho ao được phân công',
        })
      }

      const seasonStatus = String(season.status || '').toUpperCase()
      if (seasonStatus !== 'RUNNING' && seasonStatus !== 'ACTIVE') {
        return res.status(400).json({
          success: false,
          message: 'Chỉ được ghi nhật ký cho ăn cho mùa vụ đang chạy',
        })
      }

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

      if (String(req.user.role || '').toUpperCase() === 'WORKER') {
        const season = await seasonService.getSeasonById(seasonId, req.user.user_id, req.user.role)
        if (!season) {
          return res.status(403).json({ success: false, message: 'Bạn không có quyền xem dữ liệu mùa vụ này' })
        }
      }

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

      if (String(req.user.role || '').toUpperCase() === 'WORKER') {
        const season = await seasonService.getSeasonById(feedLog.season_id, req.user.user_id, req.user.role)
        if (!season) {
          return res.status(403).json({ success: false, message: 'Bạn không có quyền xem nhật ký này' })
        }
      }

      res.json({ success: true, data: feedLog })
    } catch (error) {
      logger.error('Error in getFeedLogDetail:', error)
      res.status(500).json({ success: false, message: error.message })
    }
  },

  async updateFeedLog(req, res) {
    try {
      const { feedLogId } = req.params
      const feedLog = await feedLogService.getFeedLogDetail(feedLogId)
      if (!feedLog) return res.status(404).json({ success: false, message: 'Nhật ký không tồn tại' })

      if (String(req.user.role || '').toUpperCase() === 'WORKER') {
        const season = await seasonService.getSeasonById(feedLog.season_id, req.user.user_id, req.user.role)
        if (!season) {
          return res.status(403).json({ success: false, message: 'Bạn không có quyền sửa nhật ký này' })
        }
      }

      const updates = req.body
      const updatedFeedLog = await feedLogService.updateFeedLog(feedLogId, updates)
      res.json({ success: true, message: 'Đã cập nhật nhật ký cho ăn', data: updatedFeedLog })
    } catch (error) {
      logger.error('Error in updateFeedLog:', error)
      res.status(400).json({ success: false, message: error.message })
    }
  },

  async deleteFeedLog(req, res) {
    try {
      const { feedLogId } = req.params
      const feedLog = await feedLogService.getFeedLogDetail(feedLogId)
      if (!feedLog) return res.status(404).json({ success: false, message: 'Nhật ký không tồn tại' })

      if (String(req.user.role || '').toUpperCase() === 'WORKER') {
        const season = await seasonService.getSeasonById(feedLog.season_id, req.user.user_id, req.user.role)
        if (!season) {
          return res.status(403).json({ success: false, message: 'Bạn không có quyền xoá nhật ký này' })
        }
      }

      await feedLogService.deleteFeedLog(feedLogId)
      res.json({ success: true, message: 'Đã xoá nhật ký cho ăn' })
    } catch (error) {
      logger.error('Error in deleteFeedLog:', error)
      res.status(400).json({ success: false, message: error.message })
    }
  },
}

// Environment Log Controller
const environmentLogController = {
  async createEnvironmentLog(req, res) {
    try {
      const { pondId, ph, temperature, salinity, oxygen, turbidity } = req.body

      if (!pondId || ph === undefined || temperature === undefined || salinity === undefined || oxygen === undefined || turbidity === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng nhập đầy đủ ao, pH, nhiệt độ, oxy hòa tan, độ mặn và độ đục',
        })
      }

      const pond = await pool.query('SELECT * FROM ponds WHERE pond_id = $1', [pondId])
      if (!pond.rows.length) {
        return res.status(403).json({
          success: false,
          message: 'Bạn chỉ được nhập dữ liệu cho ao được phân công',
        })
      }

      const log = await environmentLogService.createEnvironmentLog(pondId, ph, temperature, salinity, oxygen, turbidity, req.user.user_id)

      try {
        const pondResult = await pool.query(
          `SELECT p.pond_code, p.pond_name, p.farm_id
           FROM ponds p
           WHERE p.pond_id = $1`,
          [pondId]
        )
        const pondInfo = pondResult.rows[0] || {}
        const thresholds = await environmentLogService.getEnvironmentThresholds(pondId)

        if (thresholds) {
          const alerts = []
          const pondLabel = pondInfo.pond_code || pondInfo.pond_name || `ao ${pondId}`
          const toNumber = (value) => {
            if (value === null || value === undefined || value === '') return null
            const parsed = Number(value)
            return Number.isNaN(parsed) ? null : parsed
          }

          const phValue = toNumber(ph)
          const tempValue = toNumber(temperature)
          const salinityValue = toNumber(salinity)
          const oxygenValue = toNumber(oxygen)
          const turbidityValue = toNumber(turbidity)
          const minPh = toNumber(thresholds.min_ph)
          const maxPh = toNumber(thresholds.max_ph)
          const minTemp = toNumber(thresholds.min_temp)
          const maxTemp = toNumber(thresholds.max_temp)
          const minSalinity = toNumber(thresholds.min_salinity)
          const maxSalinity = toNumber(thresholds.max_salinity)
          const minOxygen = toNumber(thresholds.min_oxygen)
          const maxOxygen = toNumber(thresholds.max_oxygen)
          const minTurbidity = toNumber(thresholds.min_turbidity)
          const maxTurbidity = toNumber(thresholds.max_turbidity)

          if (phValue !== null && minPh !== null && phValue < minPh) alerts.push(`pH thấp ở ${pondLabel}`)
          if (phValue !== null && maxPh !== null && phValue > maxPh) alerts.push(`pH cao ở ${pondLabel}`)
          if (tempValue !== null && minTemp !== null && tempValue < minTemp) alerts.push(`Nhiệt độ thấp ở ${pondLabel}`)
          if (tempValue !== null && maxTemp !== null && tempValue > maxTemp) alerts.push(`Nhiệt độ cao ở ${pondLabel}`)
          if (salinityValue !== null && minSalinity !== null && salinityValue < minSalinity) alerts.push(`Độ mặn thấp ở ${pondLabel}`)
          if (salinityValue !== null && maxSalinity !== null && salinityValue > maxSalinity) alerts.push(`Độ mặn cao ở ${pondLabel}`)
          if (oxygenValue !== null && minOxygen !== null && oxygenValue < minOxygen) alerts.push(`Oxy thấp ở ${pondLabel}`)
          if (oxygenValue !== null && maxOxygen !== null && oxygenValue > maxOxygen) alerts.push(`Oxy cao ở ${pondLabel}`)
          if (turbidityValue !== null && minTurbidity !== null && turbidityValue < minTurbidity) alerts.push(`Độ đục thấp ở ${pondLabel}`)
          if (turbidityValue !== null && maxTurbidity !== null && turbidityValue > maxTurbidity) alerts.push(`Độ đục cao ở ${pondLabel}`)

          if (alerts.length > 0) {
            // Notify managers (existing behaviour)
            await notificationController.notifyManagers('Cảnh báo môi trường', alerts.join(' | '))
            // Also notify technicians assigned to the same farm so on-duty techs receive realtime/manual alerts
            try {
              await notificationController.notifyTechnicians('Cảnh báo môi trường', alerts.join(' | '), pondInfo.farm_id)
            } catch (techNotifyErr) {
              logger.error('Error notifying technicians for manual entry:', techNotifyErr)
            }
          }
        }
      } catch (notificationError) {
        logger.error('Error creating environment notifications:', notificationError)
      }

      res.status(201).json({ success: true, message: 'Đã ghi chỉ số môi trường', data: log })
    } catch (error) {
      logger.error('Error in createEnvironmentLog:', error)
      res.status(400).json({ success: false, message: error.message })
    }
  },

  async getEnvironmentLogsBySeasonId(req, res) {
    try {
      const { seasonId } = req.params

      if (String(req.user.role || '').toUpperCase() === 'WORKER') {
        const season = await seasonService.getSeasonById(seasonId, req.user.user_id, req.user.role)
        if (!season) {
          return res.status(403).json({ success: false, message: 'Bạn không có quyền xem dữ liệu môi trường của mùa vụ này' })
        }
      }

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
      const { seasonId, pondId } = req.params
      const thresholds = req.body
      const result = await environmentLogService.setEnvironmentThresholds(pondId || seasonId, thresholds)
      res.status(201).json({ success: true, message: 'Đã thiết lập ngưỡng cảnh báo', data: result })
    } catch (error) {
      logger.error('Error in setEnvironmentThresholds:', error)
      res.status(400).json({ success: false, message: error.message })
    }
  },

  async getEnvironmentThresholds(req, res) {
    try {
      const { seasonId, pondId } = req.params
      const thresholds = await environmentLogService.getEnvironmentThresholds(pondId || seasonId)
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
  inventoryController,
  adminController,
  seasonController,
}
