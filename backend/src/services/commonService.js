const db = require('../config/database')
const logger = require('../utils/logger')

// Season Service
const seasonService = {
  async getAllSeasons(pondId = null) {
    try {
      let query = 'SELECT * FROM seasons'
      const params = []
      if (pondId) {
        query += ' WHERE pond_id = $1'
        params.push(pondId)
      }
      query += ' ORDER BY start_date DESC'
      const result = await db.query(query, params)
      return result.rows
    } catch (error) {
      logger.error('Error in getAllSeasons:', error)
      throw error
    }
  },

  async getSeasonById(seasonId) {
    try {
      const result = await db.query('SELECT * FROM seasons WHERE season_id = $1', [seasonId])
      return result.rows[0]
    } catch (error) {
      logger.error('Error in getSeasonById:', error)
      throw error
    }
  },

  async createSeason(pondId, seasonName, startDate, expectedHarvestDate, shrimpType, quantitySeed, density) {
    try {
      const result = await db.query(`
        INSERT INTO seasons (pond_id, season_name, start_date, expected_harvest, shrimp_type, quantity_seed, density, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [pondId, seasonName, startDate, expectedHarvestDate, shrimpType, quantitySeed, density, 'RUNNING'])
      return result.rows[0]
    } catch (error) {
      logger.error('Error in createSeason:', error)
      throw error
    }
  },

  async updateSeason(seasonId, data) {
    try {
      const { seasonName, expectedHarvestDate, shrimpType, quantitySeed, density } = data
      const result = await db.query(`
        UPDATE seasons 
        SET season_name = $1, expected_harvest = $2, shrimp_type = $3, quantity_seed = $4, density = $5
        WHERE season_id = $6
        RETURNING *
      `, [seasonName, expectedHarvestDate, shrimpType, quantitySeed, density, seasonId])
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
      // Check if season exists and its status
      const season = await db.query('SELECT * FROM seasons WHERE season_id = $1', [seasonId])
      if (season.rows.length === 0) {
        throw new Error('Mùa vụ không tồn tại')
      }

      const currentSeason = season.rows[0]

      // Only allow deletion if status is not RUNNING
      if (currentSeason.status === 'RUNNING') {
        throw new Error('Không thể xóa mùa vụ đang chạy. Vui lòng hoàn thành hoặc hủy mùa vụ trước.')
      }

      // Delete cultivation logs for this season first
      await db.query('DELETE FROM cultivation_logs WHERE season_id = $1', [seasonId])
      
      // Delete expenses for this season
      await db.query('DELETE FROM expense_details WHERE season_id = $1', [seasonId])
      
      // Delete environment logs for this season
      await db.query('DELETE FROM manual_environment_logs WHERE season_id = $1', [seasonId])
      
      // Delete feed logs for this season
      await db.query('DELETE FROM feed_logs WHERE season_id = $1', [seasonId])
      
      // Delete tasks for this season
      await db.query('DELETE FROM tasks WHERE season_id = $1', [seasonId])
      
      // Delete the season
      await db.query('DELETE FROM seasons WHERE season_id = $1', [seasonId])
      
      return { success: true, message: `Đã xóa mùa vụ ${currentSeason.season_name}` }
    } catch (error) {
      logger.error('Error in deleteSeason:', error)
      throw error
    }
  },
}

// Product Service
const productService = {
  async getAllProducts(category = null) {
    try {
      let query = 'SELECT * FROM products'
      const params = []
      if (category) {
        query += ' WHERE category = $1'
        params.push(category)
      }
      query += ' ORDER BY product_name'
      const result = await db.query(query, params)
      return result.rows
    } catch (error) {
      logger.error('Error in getAllProducts:', error)
      throw error
    }
  },

  async createProduct(productName, category, unit, price, description) {
    try {
      const result = await db.query(`
        INSERT INTO products (product_name, category, unit, price, description)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [productName, category, unit, price, description])
      return result.rows[0]
    } catch (error) {
      logger.error('Error in createProduct:', error)
      throw error
    }
  },

  async updateProduct(productId, data) {
    try {
      const { productName, category, unit, price, description } = data
      const result = await db.query(`
        UPDATE products 
        SET product_name = $1, category = $2, unit = $3, price = $4, description = $5
        WHERE product_id = $6
        RETURNING *
      `, [productName, category, unit, price, description, productId])
      return result.rows[0]
    } catch (error) {
      logger.error('Error in updateProduct:', error)
      throw error
    }
  },

  async deleteProduct(productId) {
    try {
      await db.query('DELETE FROM products WHERE product_id = $1', [productId])
      return { success: true }
    } catch (error) {
      logger.error('Error in deleteProduct:', error)
      throw error
    }
  },
}

module.exports = {
  seasonService,
  productService,
}
