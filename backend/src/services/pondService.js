const db = require('../config/database')
const logger = require('../utils/logger')

const pondService = {
  async getAllPonds(userId, role) {
    try {
      let query = 'SELECT * FROM ponds'
      const params = []

      // CÔNG NHÂN chỉ xem ao được giao, QUẢN LÝ/QUẢN TRỊ VIÊN xem tất cả
      if (role === 'WORKER') {
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

  async createPond(pondCode, pondName, areaMeter, depthMeter, maxDensity, assignedStaff = null) {
    try {
      // Auto-generate pond_id with gap-filling
      const idResult = await db.query(`
        SELECT pond_id FROM ponds ORDER BY pond_id ASC
      `);
      
      let nextPondId = 1;
      const existingIds = idResult.rows.map(row => Number(row.pond_id));
      
      // Find first available gap
      for (let i = 1; i <= existingIds.length + 1; i++) {
        if (!existingIds.includes(i)) {
          nextPondId = i;
          break;
        }
      }

      // Auto-generate pond_code if not provided
      let finalPondCode = pondCode;
      if (!pondCode) {
        // Find all existing pond_codes and extract numeric parts
        const codeResult = await db.query(`
          SELECT pond_code FROM ponds ORDER BY pond_code ASC
        `);
        
        const codes = codeResult.rows.map(row => {
          const match = row.pond_code?.match(/\d+/);
          return match ? parseInt(match[0]) : 0;
        }).sort((a, b) => a - b);

        // Find first available number
        let nextNum = 1;
        for (let i = 0; i < codes.length; i++) {
          if (codes[i] !== nextNum) {
            break;
          }
          nextNum++;
        }

        finalPondCode = `AO${String(nextNum).padStart(3, '0')}`;
      }

      const insertResult = await db.query(`
        INSERT INTO ponds (pond_id, pond_code, pond_name, area_m2, depth_m, max_density, status, assigned_staff)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [nextPondId, finalPondCode, pondName, areaMeter, depthMeter, maxDensity, 'READY', assignedStaff])
      return insertResult.rows[0]
    } catch (error) {
      logger.error('Error in createPond:', error)
      throw error
    }
  },

  async updatePond(pondId, data) {
    try {
      // Support both camelCase and snake_case
      const pondCode = data.pond_code || data.pondCode
      const pondName = data.pond_name || data.pondName
      const areaMeter = data.area_m2 || data.areaMeter
      const depthMeter = data.depth_m || data.depthMeter
      const maxDensity = data.max_density || data.maxDensity
      const assignedStaff = data.assigned_staff || data.assignedStaff

      const result = await db.query(`
        UPDATE ponds 
        SET pond_code = $1, pond_name = $2, area_m2 = $3, depth_m = $4, max_density = $5, assigned_staff = $6
        WHERE pond_id = $7
        RETURNING *
      `, [pondCode, pondName, areaMeter, depthMeter, maxDensity, assignedStaff || null, pondId])
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
