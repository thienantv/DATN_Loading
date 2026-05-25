const cultivationLogService = require('../services/cultivationLogService')
const { seasonService } = require('../services/commonService')
const logger = require('../utils/logger')
const db = require('../config/database')

const isAdmin = (role) => {
  const r = String(role || '').toUpperCase()
  return r === 'OWNER'
}

const WORKER_CULTIVATION_ACTIONS = new Map([
  ['water_change', 'Thay nước'],
  ['siphon_bottom', 'Siphon đáy'],
  ['medication', 'Dùng thuốc'],
  ['probiotics', 'Bổ sung vi sinh'],
  ['env_treatment', 'Xử lý môi trường'],
])

const cultivationLogController = {
  async createCultivationLog(req, res) {
    try {
      const { seasonId, logDate, actionType, description } = req.body

      if (!seasonId || !logDate || !actionType || !description) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng nhập đầy đủ mùa vụ, loại hoạt động, nội dung xử lý và ngày thực hiện',
        })
      }

      const season = await seasonService.getSeasonById(seasonId, req.user.user_id, req.user.role, req.user.farm_id)
      if (!season) {
        return res.status(403).json({
          success: false,
          message: 'Bạn chỉ được ghi nhật ký cho ao được phân công',
        })
      }

      const normalizedAction = String(actionType).trim().toLowerCase()
      const storedAction = WORKER_CULTIVATION_ACTIONS.get(normalizedAction)
      if (!storedAction) {
        return res.status(400).json({
          success: false,
          message: 'Loại hoạt động không hợp lệ',
        })
      }

      const log = await cultivationLogService.createCultivationLog(
        seasonId,
        logDate,
        storedAction,
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
      if (!isAdmin(req.user?.role)) {
        const season = await seasonService.getSeasonById(seasonId, req.user.user_id, req.user.role, req.user.farm_id)
        if (!season) {
          return res.status(403).json({ success: false, message: 'Bạn không có quyền xem dữ liệu mùa vụ này' })
        }
      }
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

      if (!isAdmin(req.user?.role)) {
        const season = await seasonService.getSeasonById(log.season_id, req.user.user_id, req.user.role, req.user.farm_id)
        if (!season) {
          return res.status(403).json({ success: false, message: 'Bạn không có quyền xem nhật ký này' })
        }
      }
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
      const existing = await cultivationLogService.getCultivationLogById(logId)
      if (!existing) return res.status(404).json({ success: false, message: 'Nhật ký không tồn tại' })

      const season = await seasonService.getSeasonById(existing.season_id, req.user.user_id, req.user.role, req.user.farm_id)
      if (!season) {
        return res.status(403).json({ success: false, message: 'Bạn không có quyền duyệt nhật ký của trại khác' })
      }

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
      if (!reason || !String(reason).trim()) {
        return res.status(400).json({ success: false, message: 'Vui lòng nhập lý do từ chối' })
      }
      const existing = await cultivationLogService.getCultivationLogById(logId)
      if (!existing) return res.status(404).json({ success: false, message: 'Nhật ký không tồn tại' })

      const season = await seasonService.getSeasonById(existing.season_id, req.user.user_id, req.user.role, req.user.farm_id)
      if (!season) {
        return res.status(403).json({ success: false, message: 'Bạn không có quyền từ chối nhật ký của trại khác' })
      }

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
      if (!lockDate) {
        return res.status(400).json({ success: false, message: 'Vui lòng chọn ngày cần khóa' })
      }
      const season = await seasonService.getSeasonById(seasonId, req.user.user_id, req.user.role, req.user.farm_id)
      if (!season) {
        return res.status(403).json({ success: false, message: 'Bạn không có quyền khóa nhật ký của trại khác' })
      }

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

      if (!isAdmin(req.user?.role)) {
        const pondRes = await db.query('SELECT pond_id FROM ponds WHERE pond_id = $1 AND farm_id = $2', [pondId, req.user.farm_id])
        if (pondRes.rows.length === 0) {
          return res.status(403).json({ success: false, message: 'Bạn không có quyền xem nhật ký ao của trại khác' })
        }
      }

      const logs = await cultivationLogService.getCultivationLogsByPondId(pondId)
      res.json({ success: true, data: logs })
    } catch (error) {
      logger.error('Error in getCultivationLogsByPondId:', error)
      res.status(500).json({ success: false, message: error.message })
    }
  },
}

module.exports = cultivationLogController
