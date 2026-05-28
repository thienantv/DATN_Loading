const db = require('../config/database')
const logger = require('../utils/logger')

const environmentLogService = {
  async createEnvironmentLog(pondId, ph, temperature, salinity, oxygen, turbidity, createdBy) {
    try {
      const result = await db.query(`
        INSERT INTO manual_environment_logs (pond_id, ph, temperature, salinity, oxygen, turbidity, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [pondId, ph, temperature, salinity, oxygen, turbidity, createdBy])
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
        SELECT mel.*, p.pond_name, p.pond_code
        FROM manual_environment_logs mel
        JOIN ponds p ON mel.pond_id = p.pond_id
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

  async getEnvironmentThresholds(pondId) {
    try {
      const result = await db.query(`
        SELECT * FROM environment_thresholds
        WHERE pond_id = $1
      `, [pondId])
      return result.rows[0] || null
    } catch (error) {
      logger.error('Error in getEnvironmentThresholds:', error)
      return null
    }
  },

  async setEnvironmentThresholds(pondId, thresholds) {
    try {
      const {
        minPh,
        maxPh,
        minTemp,
        maxTemp,
        minSalinity,
        maxSalinity,
        minOxygen,
        maxOxygen,
        minTurbidity,
        maxTurbidity,
        alertLevel,
        notes,
      } = thresholds
      
      // Check if thresholds exist
      const existing = await db.query(`
        SELECT * FROM environment_thresholds WHERE pond_id = $1
      `, [pondId])

      if (existing.rows.length > 0) {
        // Update existing
        const result = await db.query(`
          UPDATE environment_thresholds
          SET min_ph = $1, max_ph = $2, min_temp = $3, max_temp = $4,
              min_salinity = $5, max_salinity = $6, min_oxygen = $7, max_oxygen = $8, min_turbidity = $9, max_turbidity = $10,
              alert_level = $11, notes = $12, updated_at = CURRENT_TIMESTAMP
          WHERE pond_id = $13
          RETURNING *
        `, [minPh, maxPh, minTemp, maxTemp, minSalinity, maxSalinity, minOxygen, maxOxygen, minTurbidity, maxTurbidity, alertLevel || 'WARNING', notes || null, pondId])
        return result.rows[0]
      } else {
        // Insert new
        const result = await db.query(`
          INSERT INTO environment_thresholds (pond_id, min_ph, max_ph, min_temp, max_temp, min_salinity, max_salinity, min_oxygen, max_oxygen, min_turbidity, max_turbidity, alert_level, notes)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          RETURNING *
        `, [pondId, minPh, maxPh, minTemp, maxTemp, minSalinity, maxSalinity, minOxygen, maxOxygen, minTurbidity, maxTurbidity, alertLevel || 'WARNING', notes || null])
        return result.rows[0]
      }
    } catch (error) {
      logger.error('Error in setEnvironmentThresholds:', error)
      throw error
    }
  },
}

module.exports = environmentLogService
