const { seasonService } = require('../services/commonService')
const auditLogService = require('../services/auditLogService')
const logger = require('../utils/logger')
const db = require('../config/database')
const sopService = require('../services/sopService');

const isAdmin = (role) => {
  const r = String(role || '').toUpperCase()
  return r === 'OWNER'
}

const ensurePondInUserFarm = async (pondId, req, res) => {
  const role = String(req.user.role || '').toUpperCase()
  if (isAdmin(role)) return true

  const farmCheck = await db.query('SELECT pond_id FROM ponds WHERE pond_id = $1 AND farm_id = $2', [pondId, req.user.farm_id])
  if (farmCheck.rows.length === 0) {
    res.status(403).json({ success: false, message: 'Bạn không có quyền thao tác với ao này' })
    return false
  }

  // Technicians can operate on ponds assigned to them
  if (role === 'TECHNICIAN' || role === 'WORKER') {
    const pondRes = await db.query(
      `SELECT pond_id FROM ponds p 
       WHERE pond_id = $1 AND farm_id = $2 
       AND (
         p.assigned_staff = $3 -- Kỹ sư tự quản lý ao của mình
         OR EXISTS (
           -- BẮC CẦU: Nếu là công nhân, kiểm tra xem Kỹ sư quản lý ao có phải là sếp của mình không
           SELECT 1 FROM technician_workers tw 
           WHERE tw.technician_id = p.assigned_staff AND tw.worker_id = $3
         )
       )`, 
      [pondId, req.user.farm_id, req.user.user_id]
    );
    if (pondRes.rows.length === 0) {
      res.status(403).json({ success: false, message: 'Bạn không có quyền thao tác với ao này' });
      return false;
    }
    return true;
  }

  // Other roles require same farm
  const pondRes = await db.query('SELECT pond_id FROM ponds WHERE pond_id = $1 AND farm_id = $2', [pondId, req.user.farm_id])
  if (pondRes.rows.length === 0) {
    res.status(403).json({ success: false, message: 'Bạn không có quyền thao tác với ao này' })
    return false
  }
  return true
}

const ensureSeasonInUserFarm = async (seasonId, req, res) => {
  const role = String(req.user.role || '').toUpperCase()
  if (isAdmin(role)) return true

  const farmCheck = await db.query(
    `SELECT s.season_id
     FROM seasons s
     JOIN ponds p ON p.pond_id = s.pond_id
     WHERE s.season_id = $1 AND p.farm_id = $2`,
    [seasonId, req.user.farm_id]
  )
  if (farmCheck.rows.length === 0) {
    res.status(403).json({ success: false, message: 'Bạn không có quyền thao tác với mùa vụ này' })
    return false
  }

  // Technicians can access seasons for ponds assigned to them
  // Technicians và Workers có quyền thao tác dựa theo quy tắc bắc cầu
  if (role === 'TECHNICIAN' || role === 'WORKER') {
    const resP = await db.query(
      `SELECT s.season_id FROM seasons s 
       JOIN ponds p ON p.pond_id = s.pond_id 
       WHERE s.season_id = $1 AND p.farm_id = $2 
       AND (
         p.assigned_staff = $3 
         OR EXISTS (
           SELECT 1 FROM technician_workers tw 
           WHERE tw.technician_id = p.assigned_staff AND tw.worker_id = $3
         )
       )`,
      [seasonId, req.user.farm_id, req.user.user_id]
    )
    if (resP.rows.length === 0) {
      res.status(403).json({ success: false, message: 'Bạn không có quyền thao tác với mùa vụ này' })
      return false
    }
    return true
  }

  // default owner/farm users
  const season = await seasonService.getSeasonById(seasonId, req.user.user_id, req.user.role, req.user.farm_id)
  if (!season) {
    res.status(403).json({ success: false, message: 'Bạn không có quyền thao tác với mùa vụ này' })
    return false
  }
  return true
}

// Season Controllers
const seasonController = {
  async getAllSeasons(req, res) {
    try {
      const { pondId } = req.query
      const seasons = await seasonService.getAllSeasons({
        pondId,
        userId: req.user.user_id,
        role: req.user.role,
        farmId: req.user.farm_id,
      })
      res.json({ success: true, data: seasons })
    } catch (error) {
      logger.error('Error in getAllSeasons:', error)
      res.status(500).json({ success: false, message: error.message })
    }
  },

  async getSeasonDetail(req, res) {
    try {
      const season = await seasonService.getSeasonById(
        req.params.seasonId,
        req.user.user_id,
        req.user.role,
        req.user.farm_id
      )
      if (!season) return res.status(404).json({ success: false, message: 'Mùa vụ không tồn tại' })
      res.json({ success: true, data: season })
    } catch (error) {
      logger.error('Error in getSeasonDetail:', error)
      res.status(500).json({ success: false, message: error.message })
    }
  },

  async createSeason(req, res) {
    try {
      const {
        pondIds, pondId, pond_id,
        seasonName, season_name,
        startDate, start_date,
        expectedHarvestDate, expectedHarvest, expected_harvest,
        shrimpType, shrimp_type,
        quantitySeed, quantity_seed,
        density,
        note,
      } = req.body //[cite: 15]

      let targetPondIds = pondIds; //[cite: 15]
      if (!targetPondIds || !Array.isArray(targetPondIds)) {
        if (pondId || pond_id) {
          targetPondIds = [pondId || pond_id]; //[cite: 15]
        } else {
          return res.status(400).json({ success: false, message: 'Vui lòng cung cấp danh sách ao nuôi' }); //[cite: 15]
        }
      }

      if (targetPondIds.length === 0) {
        return res.status(400).json({ success: false, message: 'Vui lòng chọn ít nhất 1 ao nuôi' }); //[cite: 15]
      }

      for (const pId of targetPondIds) {
        const canAccessPond = await ensurePondInUserFarm(pId, req, res); //[cite: 15]
        if (!canAccessPond) return; //[cite: 15]
      }

      // Lưu mùa vụ vào Database thông qua Service
      const createdSeasons = await seasonService.createSeason(
        targetPondIds,
        seasonName || season_name,
        startDate || start_date,
        expectedHarvestDate || expectedHarvest || expected_harvest,
        'Tôm sú', // 🌟 Ép cứng nuôi tôm sú theo chiến lược mới của bạn
        quantitySeed || quantity_seed,
        density,
        note || null
      ) //[cite: 15]

      // Ghi lịch sử hệ thống (Audit Log) & KÍCH HOẠT QUY TRÌNH SOP CHO TỪNG AO
      for (const season of createdSeasons) {
        await auditLogService.logActivity(
          req.user.user_id,
          'CREATE',
          'SEASON',
          season.season_id,
          {
            pondId: season.pond_id,
            seasonName: season.season_name,
            startDate: season.start_date,
            shrimpType: 'Tôm sú',
            density: season.density,
          },
          auditLogService.resolveEntityLabel('SEASON')
        ) //[cite: 15]

        // 🌟 KÍCH HOẠT SOP ENGINE: Tự động "đẻ" hàng trăm việc làm ngầm cho ao này
        // Không sử dụng từ khóa await ở đây để luồng API trả về client ngay lập tức mà không bị nghẽn
        sopService.generateTasksForBlackTigerShrimp(
          season.season_id,
          season.pond_id,
          startDate || start_date,
          expectedHarvestDate || expectedHarvest || expected_harvest,
          req.user.user_id
        ).catch(err => console.error(`❌ Lỗi sinh SOP ngầm cho vụ ${season.season_id}:`, err));
      }

      res.status(201).json({ 
        success: true, 
        message: `Đã khởi tạo thành công ${createdSeasons.length} mùa vụ và tự động lập kịch bản công việc SOP Tôm Sú!`, 
        data: createdSeasons 
      }) //[cite: 15]
    } catch (error) {
      logger.error('Error in createSeason:', error) //[cite: 15]
      res.status(400).json({ success: false, message: error.message }) //[cite: 15]
    }
  },

  async updateSeason(req, res) {
    try {
      const { seasonId } = req.params
      const canAccessSeason = await ensureSeasonInUserFarm(seasonId, req, res)
      if (!canAccessSeason) return

      const data = req.body
      const season = await seasonService.updateSeason(seasonId, data)

      await auditLogService.logActivity(
        req.user.user_id,
        'UPDATE',
        'SEASON',
        seasonId,
        data,
        auditLogService.resolveEntityLabel('SEASON')
      )

      res.json({ success: true, data: season })
    } catch (error) {
      logger.error('Error in updateSeason:', error)
      res.status(400).json({ success: false, message: error.message })
    }
  },

  async harvestSeason(req, res) {
    try {
      const { seasonId } = req.params
      const canAccessSeason = await ensureSeasonInUserFarm(seasonId, req, res)
      if (!canAccessSeason) return

      const {
        actualHarvestDate,
        actual_harvest,
        harvestWeightKg,
        harvest_weight_kg,
        harvestNote,
        harvest_note,
        note,
      } = req.body

      const resolvedActualHarvestDate = actualHarvestDate || actual_harvest
      const resolvedHarvestWeight = harvestWeightKg ?? harvest_weight_kg ?? null
      const resolvedHarvestNote = harvestNote ?? harvest_note ?? note ?? null

      const season = await seasonService.harvestSeason(
        seasonId,
        resolvedActualHarvestDate,
        resolvedHarvestNote,
        resolvedHarvestWeight
      )

      await auditLogService.logActivity(
        req.user.user_id,
        'UPDATE',
        'SEASON',
        seasonId,
        {
          actualHarvestDate: resolvedActualHarvestDate,
          harvestWeightKg: resolvedHarvestWeight,
          harvestNote: resolvedHarvestNote,
        },
        auditLogService.resolveEntityLabel('SEASON')
      )

      res.json({ success: true, data: season })
    } catch (error) {
      logger.error('Error in harvestSeason:', error)
      res.status(400).json({ success: false, message: error.message })
    }
  },

  async deleteSeason(req, res) {
    try {
      const canAccessSeason = await ensureSeasonInUserFarm(req.params.seasonId, req, res)
      if (!canAccessSeason) return

      const result = await seasonService.deleteSeason(req.params.seasonId)
      
      // Log season deletion
      await auditLogService.logActivity(
        req.user.user_id,
        'DELETE',
        'SEASON',
        req.params.seasonId,
        { action: 'Xóa mùa vụ' },
        auditLogService.resolveEntityLabel('SEASON')
      );

      res.json(result)
    } catch (error) {
      logger.error('Error in deleteSeason:', error)
      res.status(400).json({ success: false, message: error.message })
    }
  },
}

module.exports = { seasonController }
