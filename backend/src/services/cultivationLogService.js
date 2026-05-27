const db = require('../config/database')
const logger = require('../utils/logger')

const cultivationLogService = {
  async createCultivationLog(seasonId, logDate, actionType, description, createdBy) {
    try {
      // Find the first available log_id (gap filling)
      const gapResult = await db.query(`
        SELECT log_id FROM cultivation_logs ORDER BY log_id ASC
      `)
      
      let nextLogId = 1
      const existingIds = gapResult.rows.map(row => Number(row.log_id))
      
      // Find first available gap
      for (let i = 1; i <= existingIds.length + 1; i++) {
        if (!existingIds.includes(i)) {
          nextLogId = i
          break
        }
      }

      const result = await db.query(`
        INSERT INTO cultivation_logs (
          log_id,
          season_id,
          log_date,
          action_type,
          description,
          created_by,
          approval_status
        )
        VALUES ($1, $2, $3, $4, $5, $6, 'PENDING')
        RETURNING *
      `, [nextLogId, seasonId, logDate, actionType, description, createdBy])
      return result.rows[0]
    } catch (error) {
      logger.error('Error in createCultivationLog:', error)
      throw error
    }
  },

  async getCultivationLogsBySeasonId(seasonId) {
    try {
      const result = await db.query(`
        SELECT
          cl.*,
          s.season_name,
          p.pond_id,
          p.pond_code,
          p.pond_name,
          u.full_name AS created_by_name,
          u.username AS created_by_username
        FROM cultivation_logs cl
        LEFT JOIN seasons s ON cl.season_id = s.season_id
        LEFT JOIN ponds p ON s.pond_id = p.pond_id
        LEFT JOIN users u ON cl.created_by = u.user_id
        WHERE cl.season_id = $1
        ORDER BY cl.log_date DESC, cl.created_at DESC
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
      const log = await this.getCultivationLogById(logId)
      if (!log) {
        throw new Error('Nhật ký không tồn tại')
      }

      const status = String(log.approval_status || 'PENDING').toUpperCase()
      if (status !== 'PENDING') {
        throw new Error('Không thể cập nhật nhật ký đã được duyệt hoặc từ chối')
      }

      const result = await db.query(`
        UPDATE cultivation_logs 
        SET description = $1, action_type = $2
        WHERE log_id = $3
        RETURNING *
      `, [description || log.description, actionType || log.action_type, logId])
      return result.rows[0]
    } catch (error) {
      logger.error('Error in updateCultivationLog:', error)
      throw error
    }
  },

  async approveCultivationLog(logId, ownerId) {
    try {
      const log = await this.getCultivationLogById(logId)
      if (!log) {
        throw new Error('Nhật ký không tồn tại')
      }

      const status = String(log.approval_status || 'PENDING').toUpperCase()
      if (status !== 'PENDING') {
        throw new Error('Nhật ký này đã được xử lý trước đó')
      }

      const result = await db.query(`
        UPDATE cultivation_logs 
        SET approval_status = 'APPROVED',
            approved_by = $2,
            approved_at = CURRENT_TIMESTAMP,
            rejected_by = NULL,
            rejected_reason = NULL,
            rejected_at = NULL
        WHERE log_id = $1
        RETURNING *
      `, [logId, ownerId])
      return result.rows[0]
    } catch (error) {
      logger.error('Error in approveCultivationLog:', error)
      throw error
    }
  },

  async rejectCultivationLog(logId, reason, ownerId) {
    try {
      const log = await this.getCultivationLogById(logId)
      if (!log) {
        throw new Error('Nhật ký không tồn tại')
      }

      const status = String(log.approval_status || 'PENDING').toUpperCase()
      if (status !== 'PENDING') {
        throw new Error('Nhật ký này đã được xử lý trước đó')
      }

      const result = await db.query(`
        UPDATE cultivation_logs 
        SET approval_status = 'REJECTED',
            rejected_by = $2,
            rejected_reason = $3,
            rejected_at = CURRENT_TIMESTAMP,
            approved_by = NULL,
            approved_at = NULL
        WHERE log_id = $1
        RETURNING *
      `, [logId, ownerId, reason])
      return result.rows[0]
    } catch (error) {
      logger.error('Error in rejectCultivationLog:', error)
      throw error
    }
  },

  async lockDateLogs(seasonId, lockDate, ownerId) {
    try {
      const result = await db.query(`
        UPDATE cultivation_logs
        SET approval_status = 'LOCKED'
        WHERE season_id = $1 AND DATE(log_date) = $2
          AND COALESCE(approval_status, 'PENDING') = 'PENDING'
        RETURNING *
      `, [seasonId, lockDate])
      return result.rows
    } catch (error) {
      logger.error('Error in lockDateLogs:', error)
      throw error
    }
  },

  async getCultivationLogsByPondId(pondId) {
    try {
      const result = await db.query(`
        SELECT
          cl.*,
          s.season_name,
          p.pond_id,
          p.pond_code,
          p.pond_name,
          u.full_name AS created_by_name,
          u.username AS created_by_username
        FROM cultivation_logs cl
        JOIN seasons s ON cl.season_id = s.season_id
        LEFT JOIN ponds p ON s.pond_id = p.pond_id
        LEFT JOIN users u ON cl.created_by = u.user_id
        WHERE s.pond_id = $1
        ORDER BY cl.log_date DESC, cl.created_at DESC
      `, [pondId])
      return result.rows
    } catch (error) {
      logger.error('Error in getCultivationLogsByPondId:', error)
      throw error
    }
  },
}

module.exports = cultivationLogService
