const db = require('../config/database')
const logger = require('../utils/logger')

const environmentLogService = {
  async createEnvironmentLog(seasonId, ph, temperature, salinity, oxygen, waterLevel, createdBy) {
    try {
      const result = await db.query(`
        INSERT INTO manual_environment_logs (season_id, ph, temperature, salinity, oxygen, water_level, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [seasonId, ph, temperature, salinity, oxygen, waterLevel, createdBy])
      return result.rows[0]
    } catch (error) {
      logger.error('Error in createEnvironmentLog:', error)
      throw error
    }
  },

  async getEnvironmentLogsBySeasonId(seasonId) {
    try {
      const result = await db.query(`
        SELECT * FROM manual_environment_logs
        WHERE season_id = $1
        ORDER BY recorded_at DESC
      `, [seasonId])
      return result.rows || []
    } catch (error) {
      logger.error('Error in getEnvironmentLogsBySeasonId:', error)
      return []
    }
  },

  async getEnvironmentLogsByPondId(pondId) {
    try {
      const result = await db.query(`
        SELECT mel.*, s.season_id, s.season_name, p.pond_name, p.pond_code
        FROM manual_environment_logs mel
        JOIN seasons s ON mel.season_id = s.season_id
        JOIN ponds p ON s.pond_id = p.pond_id
        WHERE p.pond_id = $1
        ORDER BY mel.recorded_at DESC
      `, [pondId])
      return result.rows || []
    } catch (error) {
      logger.error('Error in getEnvironmentLogsByPondId:', error)
      return []
    }
  },

  async getLatestEnvironmentLog(seasonId) {
    try {
      const result = await db.query(`
        SELECT * FROM manual_environment_logs
        WHERE season_id = $1
        ORDER BY recorded_at DESC
        LIMIT 1
      `, [seasonId])
      return result.rows[0] || null
    } catch (error) {
      logger.error('Error in getLatestEnvironmentLog:', error)
      return null
    }
  },

  async getEnvironmentThresholds(seasonId) {
    try {
      const result = await db.query(`
        SELECT * FROM environment_thresholds
        WHERE season_id = $1
      `, [seasonId])
      return result.rows[0] || null
    } catch (error) {
      logger.error('Error in getEnvironmentThresholds:', error)
      return null
    }
  },

  async setEnvironmentThresholds(seasonId, thresholds) {
    try {
      const { minPh, maxPh, minTemp, maxTemp, minSalinity, maxSalinity, minOxygen, maxOxygen, minWaterLevel, maxWaterLevel } = thresholds
      
      // Check if thresholds exist
      const existing = await db.query(`
        SELECT * FROM environment_thresholds WHERE season_id = $1
      `, [seasonId])

      if (existing.rows.length > 0) {
        // Update existing
        const result = await db.query(`
          UPDATE environment_thresholds
          SET min_ph = $1, max_ph = $2, min_temp = $3, max_temp = $4,
              min_salinity = $5, max_salinity = $6, min_oxygen = $7, max_oxygen = $8, min_water_level = $9, max_water_level = $10
          WHERE season_id = $11
          RETURNING *
        `, [minPh, maxPh, minTemp, maxTemp, minSalinity, maxSalinity, minOxygen, maxOxygen, minWaterLevel, maxWaterLevel, seasonId])
        return result.rows[0]
      } else {
        // Insert new
        const result = await db.query(`
          INSERT INTO environment_thresholds (season_id, min_ph, max_ph, min_temp, max_temp, min_salinity, max_salinity, min_oxygen, max_oxygen, min_water_level, max_water_level)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING *
        `, [seasonId, minPh, maxPh, minTemp, maxTemp, minSalinity, maxSalinity, minOxygen, maxOxygen, minWaterLevel, maxWaterLevel])
        return result.rows[0]
      }
    } catch (error) {
      logger.error('Error in setEnvironmentThresholds:', error)
      throw error
    }
  },
}

module.exports = environmentLogService
