const { seasonService } = require('../services/commonService')
const auditLogService = require('../services/auditLogService')
const logger = require('../utils/logger')
const db = require('../config/database')

const isAdmin = (role) => {
  const r = String(role || '').toUpperCase()
  return r === 'OWNER'
}

const ensurePondInUserFarm = async (pondId, req, res) => {
  if (isAdmin(req.user.role)) return true

  const pondRes = await db.query('SELECT pond_id FROM ponds WHERE pond_id = $1 AND farm_id = $2', [pondId, req.user.farm_id])
  if (pondRes.rows.length === 0) {
    res.status(403).json({ success: false, message: 'Bạn không có quyền thao tác với ao này' })
    return false
  }
  return true
}

const ensureSeasonInUserFarm = async (seasonId, req, res) => {
  if (isAdmin(req.user.role)) return true

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
        pond_id, pondId,
        season_name, seasonName,
        start_date, startDate,
        expected_harvest, expectedHarvest, expectedHarvestDate,
        shrimp_type, shrimpType,
        quantity_seed, quantitySeed,
        density,
        note,
      } = req.body

      const targetPondId = pondId || pond_id
      const canAccessPond = await ensurePondInUserFarm(targetPondId, req, res)
      if (!canAccessPond) return

      const season = await seasonService.createSeason(
        targetPondId,
        seasonName || season_name,
        startDate || start_date,
        expectedHarvestDate || expectedHarvest || expected_harvest,
        shrimpType || shrimp_type,
        quantitySeed || quantity_seed,
        density,
        note || null
      )

      await auditLogService.logActivity(
        req.user.user_id,
        'CREATE',
        'SEASON',
        season.season_id,
        {
          pondId: pondId || pond_id,
          seasonName: seasonName || season_name,
          startDate: startDate || start_date,
          expectedHarvestDate: expectedHarvestDate || expectedHarvest || expected_harvest,
          shrimpType: shrimpType || shrimp_type,
          quantitySeed: quantitySeed || quantity_seed,
          density,
          note,
        },
        auditLogService.resolveEntityLabel('SEASON')
      )

      res.status(201).json({ success: true, data: season })
    } catch (error) {
      logger.error('Error in createSeason:', error)
      res.status(400).json({ success: false, message: error.message })
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

      const { actualHarvestDate, actual_harvest, note } = req.body
      const season = await seasonService.harvestSeason(
        seasonId,
        actualHarvestDate || actual_harvest,
        note || null
      )

      await auditLogService.logActivity(
        req.user.user_id,
        'UPDATE',
        'SEASON',
        seasonId,
        {
          actualHarvestDate: actualHarvestDate || actual_harvest,
          note,
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
