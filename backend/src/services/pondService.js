const db = require('../config/database')
const logger = require('../utils/logger')

const pondService = {
  async getAllPonds(userId, role) {
    try {
      let query = 'SELECT * FROM ponds'
      const params = []

      // STAFF chỉ xem ao được giao, MANAGER/ADMIN xem tất cả
      if (role === 'STAFF') {
        query += ' WHERE assigned_staff = $1'
        params.push(userId)
      }

      query += ' ORDER BY created_at DESC'
      const result = await db.query(query, params)
      return result.rows
    } catch (error) {
      logger.error('Error in getAllPonds:', error)
      throw error
    }
  },

  async getPondById(pondId) {
    try {
      const result = await db.query('SELECT * FROM ponds WHERE pond_id = $1', [pondId])
      return result.rows[0]
    } catch (error) {
      logger.error('Error in getPondById:', error)
      throw error
    }
  },

  async createPond(pondCode, pondName, areaMeter, depthMeter, maxDensity) {
    try {
      const result = await db.query(`
        INSERT INTO ponds (pond_code, pond_name, area_m2, depth_m, max_density, status)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [pondCode, pondName, areaMeter, depthMeter, maxDensity, 'READY'])
      return result.rows[0]
    } catch (error) {
      logger.error('Error in createPond:', error)
      throw error
    }
  },

  async updatePond(pondId, data) {
    try {
      const { pondCode, pondName, areaMeter, depthMeter, maxDensity } = data
      const result = await db.query(`
        UPDATE ponds 
        SET pond_code = $1, pond_name = $2, area_m2 = $3, depth_m = $4, max_density = $5
        WHERE pond_id = $6
        RETURNING *
      `, [pondCode, pondName, areaMeter, depthMeter, maxDensity, pondId])
      return result.rows[0]
    } catch (error) {
      logger.error('Error in updatePond:', error)
      throw error
    }
  },

  async updatePondStatus(pondId, status) {
    try {
      const result = await db.query(
        'UPDATE ponds SET status = $1 WHERE pond_id = $2 RETURNING *',
        [status, pondId]
      )
      return result.rows[0]
    } catch (error) {
      logger.error('Error in updatePondStatus:', error)
      throw error
    }
  },

  async deletePond(pondId) {
    try {
      await db.query('DELETE FROM ponds WHERE pond_id = $1', [pondId])
      return { success: true, message: 'Đã xóa ao' }
    } catch (error) {
      logger.error('Error in deletePond:', error)
      throw error
    }
  },
}

module.exports = pondService
