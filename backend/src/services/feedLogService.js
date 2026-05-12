const db = require('../config/database')
const logger = require('../utils/logger')

const feedLogService = {
  async createFeedLog(seasonId, productId, feedingDate, feedingTime, mealNo, quantityKg, createdBy, note) {
    try {
      await db.query(`
        INSERT INTO feed_logs (season_id, product_id, feeding_date, feeding_time, meal_no, quantity_kg, created_by, note)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [seasonId, productId, feedingDate, feedingTime, mealNo, quantityKg, createdBy, note])

      const result = await db.query(`
        SELECT fl.*, p.product_name, u.full_name as created_by_name
        FROM feed_logs fl
        LEFT JOIN products p ON fl.product_id = p.product_id
        LEFT JOIN users u ON fl.created_by = u.user_id
        WHERE fl.season_id = $1
        ORDER BY fl.feeding_date DESC, fl.feeding_time DESC, fl.feed_log_id DESC
        LIMIT 1
      `, [seasonId])

      return result.rows[0] || null
    } catch (error) {
      logger.error('Error in createFeedLog:', error)
      throw error
    }
  },

  async getFeedLogsBySeasonId(seasonId) {
    try {
      const result = await db.query(`
        SELECT fl.*, p.product_name, u.full_name as created_by_name
        FROM feed_logs fl
        LEFT JOIN products p ON fl.product_id = p.product_id
        LEFT JOIN users u ON fl.created_by = u.user_id
        WHERE fl.season_id = $1
        ORDER BY fl.feeding_date DESC, fl.feeding_time DESC
      `, [seasonId])
      return result.rows || []
    } catch (error) {
      logger.error('Error in getFeedLogsBySeasonId:', error)
      return []
    }
  },

  async getFeedLogDetail(feedLogId) {
    try {
      const result = await db.query(`
        SELECT fl.*, p.product_name, u.full_name as created_by_name
        FROM feed_logs fl
        LEFT JOIN products p ON fl.product_id = p.product_id
        LEFT JOIN users u ON fl.created_by = u.user_id
        WHERE fl.feed_log_id = $1
      `, [feedLogId])
      return result.rows[0] || null
    } catch (error) {
      logger.error('Error in getFeedLogDetail:', error)
      return null
    }
  },

  async updateFeedLog(feedLogId, { productId, feedingDate, feedingTime, mealNo, quantityKg, note }) {
    try {
      const result = await db.query(`
        UPDATE feed_logs
        SET product_id = COALESCE($1, product_id),
            feeding_date = COALESCE($2, feeding_date),
            feeding_time = COALESCE($3, feeding_time),
            meal_no = COALESCE($4, meal_no),
            quantity_kg = COALESCE($5, quantity_kg),
            note = COALESCE($6, note)
        WHERE feed_log_id = $7
        RETURNING *
      `, [productId, feedingDate, feedingTime, mealNo, quantityKg, note, feedLogId])
      return result.rows[0]
    } catch (error) {
      logger.error('Error in updateFeedLog:', error)
      throw error
    }
  },

  async deleteFeedLog(feedLogId) {
    try {
      const result = await db.query(`
        DELETE FROM feed_logs
        WHERE feed_log_id = $1
        RETURNING *
      `, [feedLogId])
      return result.rows[0] || null
    } catch (error) {
      logger.error('Error in deleteFeedLog:', error)
      throw error
    }
  },

  async getFeedLogsByPondId(pondId) {
    try {
      const result = await db.query(`
        SELECT fl.*, s.season_id, s.season_name, p.product_name, u.full_name as created_by_name
        FROM feed_logs fl
        JOIN seasons s ON fl.season_id = s.season_id
        LEFT JOIN products p ON fl.product_id = p.product_id
        LEFT JOIN users u ON fl.created_by = u.user_id
        WHERE s.pond_id = $1
        ORDER BY fl.feeding_date DESC, fl.feeding_time DESC
      `, [pondId])
      return result.rows || []
    } catch (error) {
      logger.error('Error in getFeedLogsByPondId:', error)
      return []
    }
  },
}

module.exports = feedLogService
