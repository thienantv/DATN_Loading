const db = require('../config/database')
const logger = require('../utils/logger')

// Season Service
const seasonService = {
  async getAllSeasons({ pondId = null, userId, role }) {
    try {
      let query = 'SELECT s.* FROM seasons s'
      const params = []

      if (role === 'STAFF') {
        query += ' INNER JOIN ponds p ON p.pond_id = s.pond_id WHERE p.assigned_staff = $1'
        params.push(userId)

        if (pondId) {
          query += ` AND s.pond_id = $${params.length + 1}`
          params.push(pondId)
        }
      } else if (pondId) {
        query += ' WHERE s.pond_id = $1'
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

  async getSeasonById(seasonId, userId, role) {
    try {
      let query = 'SELECT s.* FROM seasons s'
      const params = [seasonId]

      if (role === 'STAFF') {
        query += ' INNER JOIN ponds p ON p.pond_id = s.pond_id WHERE s.season_id = $1 AND p.assigned_staff = $2'
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
      // Ensure pond doesn't already have a RUNNING season
      const runningCheck = await db.query(`SELECT 1 FROM seasons WHERE pond_id = $1 AND status = 'RUNNING' LIMIT 1`, [pondId])
      if (runningCheck.rows.length > 0) {
        throw new Error('Một ao chỉ có thể có 1 mùa vụ đang chạy')
      }
      // Find the first available season_id (gap filling strategy)
      const gapResult = await db.query(`
        SELECT season_id FROM seasons ORDER BY season_id ASC
      `);
      
      let nextSeasonId = 1;
      const existingIds = gapResult.rows.map(row => Number(row.season_id));
      
      // Find first available gap
      for (let i = 1; i <= existingIds.length + 1; i++) {
        if (!existingIds.includes(i)) {
          nextSeasonId = i;
          break;
        }
      }

      // Insert season with specific season_id
      const result = await db.query(`
        INSERT INTO seasons (season_id, pond_id, season_name, start_date, expected_harvest, shrimp_type, quantity_seed, density, status, note)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `, [nextSeasonId, pondId, seasonName, startDate, expectedHarvestDate, shrimpType, quantitySeed, density, 'RUNNING', note])
      
      // Update the sequence to ensure next auto-increment works correctly
      await db.query(`SELECT setval('seasons_season_id_seq', (SELECT MAX(season_id) FROM seasons), true)`);

      return result.rows[0]
    } catch (error) {
      logger.error('Error in createSeason:', error)
      throw error
    }
  },

  async updateSeason(seasonId, data) {
    try {
      // Support both camelCase and snake_case
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
      // Find the first available product_id (gap filling strategy)
      const gapResult = await db.query(`
        SELECT product_id FROM products ORDER BY product_id ASC
      `);
      
      let nextProductId = 1;
      const existingIds = gapResult.rows.map(row => Number(row.product_id));
      
      // Find first available gap
      for (let i = 1; i <= existingIds.length + 1; i++) {
        if (!existingIds.includes(i)) {
          nextProductId = i;
          break;
        }
      }

      // Insert product with specific product_id
      const result = await db.query(`
        INSERT INTO products (product_id, product_name, category, unit, price, description)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [nextProductId, productName, category, unit, price, description])
      
      // Update the sequence to ensure next auto-increment works correctly
      await db.query(`SELECT setval('products_product_id_seq', (SELECT MAX(product_id) FROM products), true)`);

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
