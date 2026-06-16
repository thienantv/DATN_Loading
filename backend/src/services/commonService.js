const db = require('../config/database')
const logger = require('../utils/logger')

// Dịch vụ mùa vụ
const seasonService = {
  async getAllSeasons({ pondId = null, userId, role, farmId = null }) {
    try {
      let query = `
        SELECT
          s.*,
          p.pond_name,
          p.pond_code,
          p.assigned_staff,
          u.full_name AS technician_name,
          CASE
            WHEN s.actual_harvest IS NOT NULL THEN GREATEST((s.actual_harvest::date - s.start_date::date), 0)
            ELSE GREATEST((CURRENT_DATE - s.start_date::date), 0)
          END AS total_days
        FROM seasons s
        INNER JOIN ponds p ON p.pond_id = s.pond_id
        LEFT JOIN users u ON u.user_id = p.assigned_staff
      `
      const params = []
      let paramCount = 0

      // Owner: scope to their farm
      if (role === 'OWNER' && farmId) {
        query += ' WHERE p.farm_id = $' + (++paramCount)
        params.push(farmId)

        if (pondId) {
          query += ' AND s.pond_id = $' + (++paramCount)
          params.push(pondId)
        }
      }
      // TECHNICIAN chỉ xem ao được giao qua assigned_staff
      else if (role === 'TECHNICIAN') {
        query += ' WHERE p.farm_id = $' + (++paramCount)
        params.push(farmId)
        query += ' AND p.assigned_staff = $' + (++paramCount)
        params.push(userId)

        if (pondId) {
          query += ' AND s.pond_id = $' + (++paramCount)
          params.push(pondId)
        }
      }
      // WORKER chỉ xem ao được giao qua assigned_staff OR pond_workers
      else if (role === 'WORKER') {
        query += ' WHERE p.farm_id = $' + (++paramCount)
        params.push(farmId)
        query += ' AND (p.assigned_staff = $' + (++paramCount) + ' OR EXISTS (SELECT 1 FROM pond_workers pw WHERE pw.pond_id = p.pond_id AND pw.user_id = $' + paramCount + '))'
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
      let query = `
        SELECT
          s.*,
          p.pond_name,
          p.pond_code,
          p.assigned_staff,
          u.full_name AS technician_name,
          CASE
            WHEN s.actual_harvest IS NOT NULL THEN GREATEST((s.actual_harvest::date - s.start_date::date), 0)
            ELSE GREATEST((CURRENT_DATE - s.start_date::date), 0)
          END AS total_days
        FROM seasons s
        INNER JOIN ponds p ON p.pond_id = s.pond_id
        LEFT JOIN users u ON u.user_id = p.assigned_staff
      `
      const params = [seasonId]
      let paramCount = 1

      if (role === 'OWNER' && farmId) {
        query += ' WHERE s.season_id = $1 AND p.farm_id = $' + (++paramCount)
        params.push(farmId)
      } else if (role === 'WORKER') {
        query += ' WHERE s.season_id = $1 AND p.farm_id = $' + (++paramCount)
        params.push(farmId)
        query += ' AND (p.assigned_staff = $' + (++paramCount) + ' OR EXISTS (SELECT 1 FROM pond_workers pw WHERE pw.pond_id = p.pond_id AND pw.user_id = $' + paramCount + '))'
        params.push(userId)
      } else if (role === 'TECHNICIAN') {
        query += ' WHERE s.season_id = $1 AND p.farm_id = $' + (++paramCount)
        params.push(farmId)
        query += ' AND p.assigned_staff = $' + (++paramCount)
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

  async createSeason(targetPondIds, seasonName, startDate, expectedHarvestDate, shrimpType, quantitySeed, density, note) {
    try {
      const createdSeasons = [];
      
      // Lặp qua từng ID ao để tạo mùa vụ mới
      for (const pondId of targetPondIds) {
        const result = await db.query(
          `INSERT INTO seasons 
            (pond_id, season_name, start_date, expected_harvest, shrimp_type, quantity_seed, density, note, status)
           VALUES 
            ($1, $2, $3, $4, $5, $6, $7, $8, 'CHUAN_BI_NUOI')
           RETURNING *`,
          [pondId, seasonName, startDate, expectedHarvestDate, shrimpType, quantitySeed, density, note]
        );
        createdSeasons.push(result.rows[0]);
      }

      return createdSeasons;
    } catch (error) {
      logger.error('Error in createSeason service:', error);
      throw error; // Ném lỗi về lại cho Controller xử lý (Controller sẽ gọi res.status(400))
    }
  },

  async updateSeason(seasonId, data) {
    try {
      // Hỗ trợ cả camelCase và snake_case
      const seasonName = data.season_name || data.seasonName
      const startDate = data.start_date || data.startDate
      const expectedHarvest = data.expected_harvest || data.expectedHarvestDate || data.expectedHarvest
      const shrimpType = data.shrimp_type || data.shrimpType
      const quantitySeed = data.quantity_seed || data.quantitySeed
      const density = data.density
      const note = data.note

      // Pre-check: only allow update when season is CHUAN_BI_NUOI and start_date in future and no related data exists
      const sRes = await db.query('SELECT * FROM seasons WHERE season_id = $1', [seasonId])
      if (sRes.rows.length === 0) throw new Error('Mùa vụ không tồn tại')
      const season = sRes.rows[0]
      if (String(season.status || '').toUpperCase() !== 'CHUAN_BI_NUOI') {
        throw new Error('Chỉ có thể chỉnh sửa mùa vụ khi ở trạng thái Chuẩn bị nuôi')
      }
      if (season.start_date && new Date(season.start_date) <= new Date()) {
        throw new Error('Không thể chỉnh sửa sau hoặc vào ngày bắt đầu nuôi')
      }

      // Validate incoming data
      const toDateOnly = (v) => {
        if (!v) return null
        const d = new Date(v)
        if (Number.isNaN(d.getTime())) return null
        return new Date(d.getFullYear(), d.getMonth(), d.getDate())
      }
      const today = toDateOnly(new Date())

      if (seasonName !== undefined && (!seasonName || !String(seasonName).trim())) throw new Error('Tên mùa vụ là bắt buộc')

      if (startDate !== undefined) {
        const startDNew = toDateOnly(startDate)
        if (!startDNew) throw new Error('Ngày thả không hợp lệ')
        if (startDNew < today) throw new Error('Ngày thả không được nhỏ hơn ngày hiện tại')
      }

      if (expectedHarvest !== undefined) {
        const expectedD = toDateOnly(expectedHarvest)
        if (!expectedD) throw new Error('Ngày dự kiến thu hoạch không hợp lệ')
        if (expectedD < today) throw new Error('Ngày dự kiến thu hoạch không được nhỏ hơn ngày hiện tại')
        const startD = startDate !== undefined ? toDateOnly(startDate) : toDateOnly(season.start_date)
        if (startD && expectedD < startD) throw new Error('Ngày dự kiến thu hoạch không được nhỏ hơn ngày thả')
      }
      if (quantitySeed !== undefined) {
        const q = Number(quantitySeed)
        if (Number.isNaN(q) || q < 0) throw new Error('Số lượng giống không hợp lệ')
      }
      if (density !== undefined) {
        const dval = Number(density)
        if (Number.isNaN(dval) || dval < 0) throw new Error('Mật độ không được âm')
      }

      // Ensure no related business data exists
      const dep = await db.query(`
        SELECT
          (SELECT COUNT(*) FROM cultivation_logs WHERE season_id = $1) AS logs_count,
          (SELECT COUNT(*) FROM expense_details WHERE season_id = $1) AS expense_count,
          (SELECT COUNT(*) FROM tasks WHERE season_id = $1) AS tasks_count
      `, [seasonId])
      const d = dep.rows[0]
      if (Number(d.logs_count) > 0 || Number(d.expense_count) > 0 || Number(d.tasks_count) > 0) {
        throw new Error('Không thể chỉnh sửa vì đã phát sinh dữ liệu liên quan')
      }

      const result = await db.query(`
        UPDATE seasons 
        SET season_name = $1,
            start_date = COALESCE($2, start_date),
            expected_harvest = $3,
            shrimp_type = $4,
            quantity_seed = $5,
            density = $6,
            note = $7
        WHERE season_id = $8
        RETURNING *
      `, [seasonName, startDate, expectedHarvest, shrimpType, quantitySeed, density, note, seasonId])
      return result.rows[0]
    } catch (error) {
      logger.error('Error in updateSeason:', error)
      throw error
    }
  },

  async harvestSeason(seasonId, actualHarvestDate, harvestNote, harvestWeightKg = null) {
    try {
      // Ensure season exists and is currently DANG_NUOI
      const sRes = await db.query('SELECT * FROM seasons WHERE season_id = $1', [seasonId])
      if (sRes.rows.length === 0) throw new Error('Mùa vụ không tồn tại')
      const season = sRes.rows[0]
      if (String(season.status || '').toUpperCase() !== 'DANG_NUOI') {
        throw new Error('Chỉ có thể thu hoạch khi mùa vụ đang ở trạng thái Đang nuôi')
      }

      // Validate actual harvest date and weight
      const toDateOnly = (v) => {
        if (!v) return null
        const d = new Date(v)
        if (Number.isNaN(d.getTime())) return null
        return new Date(d.getFullYear(), d.getMonth(), d.getDate())
      }
      const today = toDateOnly(new Date())
      const actualD = toDateOnly(actualHarvestDate)
      if (!actualD) throw new Error('Ngày thu hoạch không hợp lệ')
      if (actualD > today) throw new Error('Ngày thu hoạch không được lớn hơn ngày hiện tại')
      const startD = season.start_date ? toDateOnly(season.start_date) : null
      if (startD && actualD < startD) throw new Error('Ngày thu hoạch không được nhỏ hơn ngày thả')

      const normalizedHarvestWeight =
        harvestWeightKg === null || harvestWeightKg === undefined || harvestWeightKg === ''
          ? null
          : Number(harvestWeightKg)

      if (normalizedHarvestWeight === null) throw new Error('Sản lượng thu hoạch là bắt buộc')
      if (Number.isNaN(normalizedHarvestWeight) || normalizedHarvestWeight < 0) {
        throw new Error('Sản lượng thu hoạch không hợp lệ')
      }

      const result = await db.query(`
        UPDATE seasons 
        SET status = 'COMPLETED', actual_harvest = $1, harvest_note = $2, harvest_weight_kg = $3
        WHERE season_id = $4
        RETURNING *
      `, [actualHarvestDate, harvestNote, normalizedHarvestWeight, seasonId])

      const updated = result.rows[0]
      if (updated) {
        await db.query(
          `UPDATE ponds
           SET status = $1,
               renovation_started_at = NOW(),
               renovation_completed_at = NULL
           WHERE pond_id = $2`,
          ['DANG_CAI_TAO', updated.pond_id]
        )
      }

      return updated
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
      // Only allow delete when season is CHUAN_BI_NUOI and before start_date, and no related data
      if (String(currentSeason.status || '').toUpperCase() !== 'CHUAN_BI_NUOI') {
        throw new Error('Chỉ có thể xóa mùa vụ khi ở trạng thái Chuẩn bị nuôi')
      }
      if (currentSeason.start_date && new Date(currentSeason.start_date) <= new Date()) {
        throw new Error('Không thể xóa sau hoặc vào ngày bắt đầu nuôi')
      }

      const depCheck = await db.query(`
        SELECT
          (SELECT COUNT(*) FROM cultivation_logs WHERE season_id = $1) AS logs_count,
          (SELECT COUNT(*) FROM expense_details WHERE season_id = $1) AS expense_count,
          (SELECT COUNT(*) FROM tasks WHERE season_id = $1) AS tasks_count
      `, [seasonId])
      const dc = depCheck.rows[0]
      if (Number(dc.logs_count) > 0 || Number(dc.expense_count) > 0 || Number(dc.tasks_count) > 0) {
        throw new Error('Không thể xóa vì đã phát sinh dữ liệu liên quan')
      }

      // Xóa nhật ký nuôi của mùa vụ này trước
      await db.query('DELETE FROM cultivation_logs WHERE season_id = $1', [seasonId])
      
      // Xóa chi phí của mùa vụ này
      await db.query('DELETE FROM expense_details WHERE season_id = $1', [seasonId])
      
      // (feed_logs removed) previously deleted feed logs here
      
      // Xóa công việc của mùa vụ này
      await db.query('DELETE FROM tasks WHERE season_id = $1', [seasonId])
      
      // Xóa mùa vụ
      await db.query('DELETE FROM seasons WHERE season_id = $1', [seasonId])

      // set pond back to TAM_NGUNG
      await db.query('UPDATE ponds SET status = $1 WHERE pond_id = $2', ['TAM_NGUNG', currentSeason.pond_id])

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
