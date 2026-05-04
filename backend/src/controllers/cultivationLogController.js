const cultivationLogService = require('../services/cultivationLogService')
const logger = require('../utils/logger')

const cultivationLogController = {
  async createCultivationLog(req, res) {
    try {
      const { seasonId, logDate, actionType, description } = req.body
      const log = await cultivationLogService.createCultivationLog(
        seasonId,
        logDate,
        actionType,
        description,
        req.user.user_id
      )
      res.status(201).json({ success: true, message: 'Đã ghi nhật ký canh tác', data: log })
    } catch (error) {
      logger.error('Error in createCultivationLog:', error)
      res.status(400).json({ success: false, message: error.message })
    }
  },

  async getCultivationLogsBySeasonId(req, res) {
    try {
      const { seasonId } = req.params
      const logs = await cultivationLogService.getCultivationLogsBySeasonId(seasonId)
      res.json({ success: true, data: logs })
    } catch (error) {
      logger.error('Error in getCultivationLogsBySeasonId:', error)
      res.status(500).json({ success: false, message: error.message })
    }
  },

  async getCultivationLogDetail(req, res) {
    try {
      const { logId } = req.params
      const log = await cultivationLogService.getCultivationLogById(logId)
      if (!log) return res.status(404).json({ success: false, message: 'Nhật ký không tồn tại' })
      res.json({ success: true, data: log })
    } catch (error) {
      logger.error('Error in getCultivationLogDetail:', error)
      res.status(500).json({ success: false, message: error.message })
    }
  },

  async updateCultivationLog(req, res) {
    try {
      const { logId } = req.params
      const { description, actionType } = req.body
      const log = await cultivationLogService.updateCultivationLog(logId, { description, actionType })
      res.json({ success: true, message: 'Đã cập nhật nhật ký canh tác', data: log })
    } catch (error) {
      logger.error('Error in updateCultivationLog:', error)
      res.status(400).json({ success: false, message: error.message })
    }
  },

  async approveCultivationLog(req, res) {
    try {
      const { logId } = req.params
      const log = await cultivationLogService.approveCultivationLog(logId, req.user.user_id)
      res.json({ success: true, message: 'Đã phê duyệt nhật ký canh tác', data: log })
    } catch (error) {
      logger.error('Error in approveCultivationLog:', error)
      res.status(400).json({ success: false, message: error.message })
    }
  },

  async rejectCultivationLog(req, res) {
    try {
      const { logId } = req.params
      const { reason } = req.body
      const log = await cultivationLogService.rejectCultivationLog(logId, reason, req.user.user_id)
      res.json({ success: true, message: 'Đã từ chối nhật ký canh tác', data: log })
    } catch (error) {
      logger.error('Error in rejectCultivationLog:', error)
      res.status(400).json({ success: false, message: error.message })
    }
  },

  async lockDateLogs(req, res) {
    try {
      const { seasonId } = req.params
      const { lockDate } = req.body
      const logs = await cultivationLogService.lockDateLogs(seasonId, lockDate, req.user.user_id)
      res.json({ success: true, message: `Đã khóa ${logs.length} nhật ký ngày ${lockDate}`, data: logs })
    } catch (error) {
      logger.error('Error in lockDateLogs:', error)
      res.status(400).json({ success: false, message: error.message })
    }
  },

  async getCultivationLogsByPondId(req, res) {
    try {
      const { pondId } = req.params
      const logs = await cultivationLogService.getCultivationLogsByPondId(pondId)
      res.json({ success: true, data: logs })
    } catch (error) {
      logger.error('Error in getCultivationLogsByPondId:', error)
      res.status(500).json({ success: false, message: error.message })
    }
  },
}

module.exports = cultivationLogController
