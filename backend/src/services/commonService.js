const db = require('../config/database')
const logger = require('../utils/logger')

// Dịch vụ mùa vụ
const seasonService = {
  async getAllSeasons({ pondId = null, userId, role, farmId = null }) {
    try {
      let query = 'SELECT s.* FROM seasons s INNER JOIN ponds p ON p.pond_id = s.pond_id'
      const params = []
      let paramCount = 0

      // ADMIN and OWNER can see all seasons or filter by farm
      if (role === 'OWNER' && farmId) {
        query += ' WHERE p.farm_id = $' + (++paramCount)
        params.push(farmId)

        if (pondId) {
          query += ' AND s.pond_id = $' + (++paramCount)
          params.push(pondId)
        }
      }
      // WORKER chỉ xem ao được giao
      else if (role === 'WORKER') {
        query += ' WHERE p.assigned_staff = $' + (++paramCount)
        params.push(userId)

        if (pondId) {
          query += ' AND s.pond_id = $' + (++paramCount)
          params.push(pondId)
        }
      }
      // ADMIN xem tất cả, có thể filter theo pondId
      else if (pondId) {
        query += ' WHERE s.pond_id = $' + (++paramCount)
        params.push(pondId)
      }

      query += ' ORDER BY s.start_date DESC'
      const result = await db.query(query, params)
      return result.rows
    } catch (error) {
      logger.error('Error in getAllSeasons:', error)
      throw error
    }
  },

  async getSeasonById(seasonId, userId, role, farmId = null) {
    try {
      let query = 'SELECT s.* FROM seasons s INNER JOIN ponds p ON p.pond_id = s.pond_id'
      const params = [seasonId]
      let paramCount = 1

      if (role === 'OWNER' && farmId) {
        query += ' WHERE s.season_id = $1 AND p.farm_id = $' + (++paramCount)
        params.push(farmId)
      } else if (role === 'WORKER') {
        query += ' WHERE s.season_id = $1 AND p.assigned_staff = $' + (++paramCount)
        params.push(userId)
      } else {
        query += ' WHERE s.season_id = $1'
      }

      const result = await db.query(query, params)
      return result.rows[0]
    } catch (error) {
      logger.error('Error in getSeasonById:', error)
      throw error
    }
  },

  async createSeason(pondId, seasonName, startDate, expectedHarvestDate, shrimpType, quantitySeed, density, note = null) {
    try {
      // Đảm bảo ao chưa có mùa vụ nào đang RUNNING
      const runningCheck = await db.query(`SELECT 1 FROM seasons WHERE pond_id = $1 AND status = 'RUNNING' LIMIT 1`, [pondId])
      if (runningCheck.rows.length > 0) {
        throw new Error('Một ao chỉ có thể có 1 mùa vụ đang chạy')
      }
      // Tìm season_id trống đầu tiên (chiến lược lấp chỗ trống)
      const gapResult = await db.query(`
        SELECT season_id FROM seasons ORDER BY season_id ASC
      `);
      
      let nextSeasonId = 1;
      const existingIds = gapResult.rows.map(row => Number(row.season_id));
      
      // Tìm khoảng trống đầu tiên
      for (let i = 1; i <= existingIds.length + 1; i++) {
        if (!existingIds.includes(i)) {
          nextSeasonId = i;
          break;
        }
      }

      // Chèn mùa vụ với season_id cụ thể
      const result = await db.query(`
        INSERT INTO seasons (season_id, pond_id, season_name, start_date, expected_harvest, shrimp_type, quantity_seed, density, status, note)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `, [nextSeasonId, pondId, seasonName, startDate, expectedHarvestDate, shrimpType, quantitySeed, density, 'RUNNING', note])
      
      // Cập nhật sequence để lần tự tăng tiếp theo hoạt động đúng
      await db.query(`SELECT setval('seasons_season_id_seq', (SELECT MAX(season_id) FROM seasons), true)`);

      return result.rows[0]
    } catch (error) {
      logger.error('Error in createSeason:', error)
      throw error
    }
  },

  async updateSeason(seasonId, data) {
    try {
      // Hỗ trợ cả camelCase và snake_case
      const seasonName = data.season_name || data.seasonName
      const expectedHarvest = data.expected_harvest || data.expectedHarvestDate || data.expectedHarvest
      const shrimpType = data.shrimp_type || data.shrimpType
      const quantitySeed = data.quantity_seed || data.quantitySeed
      const density = data.density
      const note = data.note

      const result = await db.query(`
        UPDATE seasons 
        SET season_name = $1, expected_harvest = $2, shrimp_type = $3, quantity_seed = $4, density = $5, note = $6
        WHERE season_id = $7
        RETURNING *
      `, [seasonName, expectedHarvest, shrimpType, quantitySeed, density, note, seasonId])
      return result.rows[0]
    } catch (error) {
      logger.error('Error in updateSeason:', error)
      throw error
    }
  },

  async harvestSeason(seasonId, actualHarvestDate, note) {
    try {
      const result = await db.query(`
        UPDATE seasons 
        SET status = 'COMPLETED', actual_harvest = $1, note = $2
        WHERE season_id = $3
        RETURNING *
      `, [actualHarvestDate, note, seasonId])
      return result.rows[0]
    } catch (error) {
      logger.error('Error in harvestSeason:', error)
      throw error
    }
  },

  async deleteSeason(seasonId) {
    try {
      // Kiểm tra mùa vụ có tồn tại và trạng thái của nó
      const season = await db.query('SELECT * FROM seasons WHERE season_id = $1', [seasonId])
      if (season.rows.length === 0) {
        throw new Error('Mùa vụ không tồn tại')
      }

      const currentSeason = season.rows[0]

      // Chỉ cho phép xóa khi trạng thái không phải RUNNING
      if (currentSeason.status === 'RUNNING') {
        throw new Error('Không thể xóa mùa vụ đang chạy. Vui lòng hoàn thành hoặc hủy mùa vụ trước.')
      }

      // Xóa nhật ký nuôi của mùa vụ này trước
      await db.query('DELETE FROM cultivation_logs WHERE season_id = $1', [seasonId])
      
      // Xóa chi phí của mùa vụ này
      await db.query('DELETE FROM expense_details WHERE season_id = $1', [seasonId])
      
      // Xóa nhật ký môi trường của mùa vụ này
      await db.query('DELETE FROM manual_environment_logs WHERE season_id = $1', [seasonId])
      
      // Xóa nhật ký cho ăn của mùa vụ này
      await db.query('DELETE FROM feed_logs WHERE season_id = $1', [seasonId])
      
      // Xóa công việc của mùa vụ này
      await db.query('DELETE FROM tasks WHERE season_id = $1', [seasonId])
      
      // Xóa mùa vụ
      await db.query('DELETE FROM seasons WHERE season_id = $1', [seasonId])
      
      return { success: true, message: `Đã xóa mùa vụ ${currentSeason.season_name}` }
    } catch (error) {
      logger.error('Error in deleteSeason:', error)
      throw error
    }
  },
}

module.exports = {
  seasonService,
}
