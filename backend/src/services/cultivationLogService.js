const db = require('../config/database')
const logger = require('../utils/logger')

const cultivationLogService = {
  async createCultivationLog(seasonId, logDate, actionType, description, createdBy) {
    try {
      const result = await db.query(`
        INSERT INTO cultivation_logs (season_id, log_date, action_type, description, created_by, approval_status, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
        RETURNING *
      `, [seasonId, logDate, actionType, description, createdBy, 'PENDING'])
      return result.rows[0]
    } catch (error) {
      logger.error('Error in createCultivationLog:', error)
      throw error
    }
  },

  async getCultivationLogsBySeasonId(seasonId) {
    try {
      const result = await db.query(`
        SELECT * FROM cultivation_logs 
        WHERE season_id = $1 
        ORDER BY log_date DESC
      `, [seasonId])
      return result.rows
    } catch (error) {
      logger.error('Error in getCultivationLogsBySeasonId:', error)
      throw error
    }
  },

  async getCultivationLogById(logId) {
    try {
      const result = await db.query(`
        SELECT * FROM cultivation_logs WHERE log_id = $1
      `, [logId])
      return result.rows[0]
    } catch (error) {
      logger.error('Error in getCultivationLogById:', error)
      throw error
    }
  },

  async updateCultivationLog(logId, { description, actionType }) {
    try {
      // Kiểm tra xem log đã được duyệt hay chưa
      const log = await this.getCultivationLogById(logId)
      if (!log) {
        throw new Error('Nhật ký không tồn tại')
      }

      // STAFF chỉ có thể sửa log chưa được duyệt
      if (log.approval_status === 'APPROVED') {
        throw new Error('Không thể sửa nhật ký đã được phê duyệt')
      }

      if (log.approval_status === 'REJECTED') {
        throw new Error('Không thể sửa nhật ký đã bị từ chối')
      }

      const result = await db.query(`
        UPDATE cultivation_logs 
        SET description = $1, action_type = $2, updated_at = CURRENT_TIMESTAMP
        WHERE log_id = $3
        RETURNING *
      `, [description || log.description, actionType || log.action_type, logId])
      return result.rows[0]
    } catch (error) {
      logger.error('Error in updateCultivationLog:', error)
      throw error
    }
  },

  async approveCultivationLog(logId, managerId) {
    try {
      const result = await db.query(`
        UPDATE cultivation_logs 
        SET approval_status = $1, approved_by = $2, approved_at = CURRENT_TIMESTAMP
        WHERE log_id = $3
        RETURNING *
      `, ['APPROVED', managerId, logId])
      return result.rows[0]
    } catch (error) {
      logger.error('Error in approveCultivationLog:', error)
      throw error
    }
  },

  async rejectCultivationLog(logId, reason, managerId) {
    try {
      const result = await db.query(`
        UPDATE cultivation_logs 
        SET approval_status = $1, rejected_by = $2, rejected_reason = $3, rejected_at = CURRENT_TIMESTAMP
        WHERE log_id = $4
        RETURNING *
      `, ['REJECTED', managerId, reason, logId])
      return result.rows[0]
    } catch (error) {
      logger.error('Error in rejectCultivationLog:', error)
      throw error
    }
  },

  async lockDateLogs(seasonId, lockDate, managerId) {
    try {
      // Khóa tất cả logs của ngày đó trong mùa vụ
      const result = await db.query(`
        UPDATE cultivation_logs 
        SET is_locked = true, locked_by = $1, locked_at = CURRENT_TIMESTAMP
        WHERE season_id = $2 AND DATE(log_date) = $3
        RETURNING *
      `, [managerId, seasonId, lockDate])
      return result.rows
    } catch (error) {
      logger.error('Error in lockDateLogs:', error)
      throw error
    }
  },

  async getCultivationLogsByPondId(pondId) {
    try {
      const result = await db.query(`
        SELECT cl.* FROM cultivation_logs cl
        JOIN seasons s ON cl.season_id = s.season_id
        WHERE s.pond_id = $1
        ORDER BY cl.log_date DESC
      `, [pondId])
      return result.rows
    } catch (error) {
      logger.error('Error in getCultivationLogsByPondId:', error)
      throw error
    }
  },
}

module.exports = cultivationLogService
