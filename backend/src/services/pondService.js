const db = require('../config/database')
const logger = require('../utils/logger')

const POND_STATUS = {
  TAM_NGUNG: 'TAM_NGUNG',
  CHUAN_BI_NUOI: 'CHUAN_BI_NUOI',
  DANG_NUOI: 'DANG_NUOI',
  DANG_CAI_TAO: 'DANG_CAI_TAO',
}

const USAGE_STATUS = {
  HOAT_DONG: 'HOAT_DONG',
  NGUNG_SU_DUNG: 'NGUNG_SU_DUNG',
}

const isPositiveNumber = (value) => {
  const n = Number(value)
  return Number.isFinite(n) && n > 0
}

const normalizeUpper = (value) => String(value || '').trim().toUpperCase()

const normalizePondCodeNumber = (pondCode) => {
  const match = String(pondCode || '').toUpperCase().match(/^AO(\d+)$/)
  return match ? Number(match[1]) : null
}

const pondService = {
  async getAllPonds(userId, role, farmId = null) {
    try {
      let query = `
        SELECT p.*, u.full_name AS technician_name, u.status AS technician_active
        FROM ponds p
        LEFT JOIN users u ON u.user_id = p.assigned_staff
      `
      const params = []
      const normalizedRole = String(role || '').toUpperCase()

      // TECHNICIAN / WORKER chỉ xem ao được giao
      if (normalizedRole === 'WORKER' || normalizedRole === 'TECHNICIAN') {
        query += ' WHERE p.assigned_staff = $1'
        params.push(userId)
      }
      // OWNER và các role khác chỉ xem trong farm của họ
      else if (farmId) {
        query += ' WHERE p.farm_id = $1'
        params.push(farmId)
      } else {
        query += ' WHERE p.farm_id = (SELECT farm_id FROM users WHERE user_id = $1)'
        params.push(userId)
      }

      query += ' ORDER BY p.created_at DESC'
      const result = await db.query(query, params)
      return result.rows
    } catch (error) {
      logger.error('Error in getAllPonds:', error)
      throw error
    }
  },

  async getPondById(pondId) {
    try {
      const result = await db.query(
        `SELECT p.*, u.full_name AS technician_name, u.status AS technician_active
         FROM ponds p
         LEFT JOIN users u ON u.user_id = p.assigned_staff
         WHERE p.pond_id = $1`,
        [pondId]
      )
      return result.rows[0]
    } catch (error) {
      logger.error('Error in getPondById:', error)
      throw error
    }
  },

  async createPond({ pondName, areaMeter, depthMeter, assignedStaff = null, farmId }) {
    try {
      if (!farmId) {
        throw new Error('Không tìm thấy thông tin trại nuôi')
      }
      if (!String(pondName || '').trim()) {
        throw new Error('Tên ao không được để trống')
      }
      if (!isPositiveNumber(areaMeter) || !isPositiveNumber(depthMeter)) {
        throw new Error('Diện tích và độ sâu phải lớn hơn 0')
      }

      const duplicateNameCheck = await db.query(
        'SELECT 1 FROM ponds WHERE farm_id = $1 AND LOWER(pond_name) = LOWER($2) LIMIT 1',
        [farmId, String(pondName).trim()]
      )
      if (duplicateNameCheck.rowCount > 0) {
        throw new Error('Tên ao đã tồn tại trong trại nuôi')
      }

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

      // Auto-generate pond_code sequentially per farm (AO001, AO002, ...)
      const codeResult = await db.query(
        'SELECT pond_code FROM ponds WHERE farm_id = $1 ORDER BY pond_code ASC',
        [farmId]
      )

      const usedNumbers = codeResult.rows
        .map((row) => normalizePondCodeNumber(row.pond_code))
        .filter((num) => Number.isInteger(num) && num > 0)
        .sort((a, b) => a - b)

      let nextNum = 1
      for (const num of usedNumbers) {
        if (num !== nextNum) break
        nextNum += 1
      }

      const finalPondCode = `AO${String(nextNum).padStart(3, '0')}`

      const duplicateCodeCheck = await db.query(
        'SELECT 1 FROM ponds WHERE farm_id = $1 AND pond_code = $2 LIMIT 1',
        [farmId, finalPondCode]
      )
      if (duplicateCodeCheck.rowCount > 0) {
        throw new Error('Mã ao đã tồn tại trong trại nuôi')
      }

      const insertResult = await db.query(`
        INSERT INTO ponds (
          pond_id, pond_code, pond_name, area_m2, depth_m,
          status, usage_status, assigned_staff, farm_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `, [
        nextPondId,
        finalPondCode,
        String(pondName).trim(),
        Number(areaMeter),
        Number(depthMeter),
        POND_STATUS.TAM_NGUNG,
        USAGE_STATUS.HOAT_DONG,
        assignedStaff,
        farmId,
      ])
      return insertResult.rows[0]
    } catch (error) {
      logger.error('Error in createPond:', error)
      throw error
    }
  },

  async updatePond(pondId, data, farmId = null) {
    try {
      // Support both camelCase and snake_case
      const pondCode = data.pond_code || data.pondCode
      const pondName = data.pond_name || data.pondName
      const areaMeter = data.area_m2 || data.areaMeter
      const depthMeter = data.depth_m || data.depthMeter
      const assignedStaff = data.assigned_staff || data.assignedStaff

      if (!String(pondName || '').trim()) {
        throw new Error('Tên ao không được để trống')
      }
      if (!isPositiveNumber(areaMeter) || !isPositiveNumber(depthMeter)) {
        throw new Error('Diện tích và độ sâu phải lớn hơn 0')
      }

      if (farmId) {
        const duplicateNameCheck = await db.query(
          'SELECT 1 FROM ponds WHERE farm_id = $1 AND LOWER(pond_name) = LOWER($2) AND pond_id <> $3 LIMIT 1',
          [farmId, String(pondName).trim(), pondId]
        )
        if (duplicateNameCheck.rowCount > 0) {
          throw new Error('Tên ao đã tồn tại trong trại nuôi')
        }
      }

      const result = await db.query(`
        UPDATE ponds 
        SET pond_code = $1, pond_name = $2, area_m2 = $3, depth_m = $4, assigned_staff = $5
        WHERE pond_id = $6
        RETURNING *
      `, [pondCode, String(pondName).trim(), Number(areaMeter), Number(depthMeter), assignedStaff || null, pondId])
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
      const dependencyResult = await db.query(
        `SELECT
          (SELECT COUNT(*) FROM seasons WHERE pond_id = $1) AS seasons_count,
          (SELECT COUNT(*) FROM environment_thresholds WHERE pond_id = $1) AS thresholds_count,
          (SELECT COUNT(*) FROM manual_environment_logs WHERE pond_id = $1) AS env_logs_count,
          (SELECT COUNT(*) FROM sensors WHERE pond_id = $1) AS sensors_count,
          (SELECT COUNT(*) FROM tasks WHERE pond_id = $1) AS tasks_count,
          (SELECT COUNT(*) FROM uploaded_images WHERE pond_id = $1) AS images_count`,
        [pondId]
      )

      const dep = dependencyResult.rows[0] || {}
      const hasDependencies =
        Number(dep.seasons_count || 0) > 0 ||
        Number(dep.thresholds_count || 0) > 0 ||
        Number(dep.env_logs_count || 0) > 0 ||
        Number(dep.sensors_count || 0) > 0 ||
        Number(dep.tasks_count || 0) > 0 ||
        Number(dep.images_count || 0) > 0

      if (hasDependencies) {
        throw new Error('Không thể xóa ao vì đã phát sinh dữ liệu nghiệp vụ liên quan')
      }

      await db.query('DELETE FROM ponds WHERE pond_id = $1', [pondId])
      return { success: true, message: 'Đã xóa ao' }
    } catch (error) {
      logger.error('Error in deletePond:', error)
      throw error
    }
  },

  async getAssignmentMatrixByFarm(farmId) {
    try {
      const techniciansResult = await db.query(
        `SELECT u.user_id, u.full_name, u.username, u.status
         FROM users u
         INNER JOIN roles r ON r.role_id = u.role_id
         WHERE u.farm_id = $1 AND r.role_name = 'TECHNICIAN'
         ORDER BY u.full_name NULLS LAST, u.username`,
        [farmId]
      )

      const pondsResult = await db.query(
        `SELECT pond_id, pond_code, pond_name, assigned_staff, status, usage_status
         FROM ponds
         WHERE farm_id = $1
         ORDER BY created_at DESC`,
        [farmId]
      )

      return {
        technicians: techniciansResult.rows,
        ponds: pondsResult.rows,
      }
    } catch (error) {
      logger.error('Error in getAssignmentMatrixByFarm:', error)
      throw error
    }
  },

  async updatePondAssignment(pondId, technicianId = null) {
    try {
      const result = await db.query(
        'UPDATE ponds SET assigned_staff = $1 WHERE pond_id = $2 RETURNING *',
        [technicianId || null, pondId]
      )
      return result.rows[0]
    } catch (error) {
      logger.error('Error in updatePondAssignment:', error)
      throw error
    }
  },

  async updateUsageStatus(pondId, usageStatus) {
    try {
      const normalized = normalizeUpper(usageStatus)
      if (![USAGE_STATUS.HOAT_DONG, USAGE_STATUS.NGUNG_SU_DUNG].includes(normalized)) {
        throw new Error('Trạng thái sử dụng không hợp lệ')
      }

      const result = await db.query(
        'UPDATE ponds SET usage_status = $1 WHERE pond_id = $2 RETURNING *',
        [normalized, pondId]
      )
      return result.rows[0]
    } catch (error) {
      logger.error('Error in updateUsageStatus:', error)
      throw error
    }
  },

  async markPondAsFarming(pondId) {
    try {
      await db.query(
        `UPDATE ponds
         SET status = $1
         WHERE pond_id = $2`,
        [POND_STATUS.DANG_NUOI, pondId]
      )
    } catch (error) {
      logger.error('Error in markPondAsFarming:', error)
      throw error
    }
  },

  async markPondAsRenovating(pondId) {
    try {
      await db.query(
        `UPDATE ponds
         SET status = $1,
             renovation_started_at = NOW(),
             renovation_completed_at = NULL
         WHERE pond_id = $2`,
        [POND_STATUS.DANG_CAI_TAO, pondId]
      )
    } catch (error) {
      logger.error('Error in markPondAsRenovating:', error)
      throw error
    }
  },

  async completeRenovation(pondId) {
    try {
      const pond = await this.getPondById(pondId)
      if (!pond) {
        throw new Error('Ao không tồn tại')
      }
      if (normalizeUpper(pond.status) !== POND_STATUS.DANG_CAI_TAO) {
        throw new Error('Ao không ở trạng thái đang cải tạo')
      }

      const result = await db.query(
        `UPDATE ponds
         SET status = $1,
             renovation_completed_at = NOW()
         WHERE pond_id = $2
         RETURNING *`,
        [POND_STATUS.TAM_NGUNG, pondId]
      )
      return result.rows[0]
    } catch (error) {
      logger.error('Error in completeRenovation:', error)
      throw error
    }
  },

  POND_STATUS,
  USAGE_STATUS,
}

module.exports = pondService
