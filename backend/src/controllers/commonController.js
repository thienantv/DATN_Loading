const { seasonService, productService } = require('../services/commonService')
const auditLogService = require('../services/auditLogService')
const logger = require('../utils/logger')

// Season Controllers
const seasonController = {
  async getAllSeasons(req, res) {
    try {
      const { pondId } = req.query
      const seasons = await seasonService.getAllSeasons({
        pondId,
        userId: req.user.user_id,
        role: req.user.role,
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
        req.user.role
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
      // Support both camelCase and snake_case field names from frontend
      const {
        pond_id, pondId,
        season_name, seasonName,
        start_date, startDate,
        shrimp_type, shrimpType,
        density,
      } = req.body

      const finalPondId = pond_id || pondId
      const finalSeasonName = season_name || seasonName
      const finalStartDate = start_date || startDate
      const finalShrimpType = shrimp_type || shrimpType
      const finalDensity = density

      if (!finalPondId || !finalSeasonName || !finalStartDate || !finalShrimpType || !finalDensity) {
        return res.status(400).json({ success: false, message: 'Vui lòng cung cấp đầy đủ: ao, tên mùa vụ, ngày thả, loại tôm, mật độ' })
      }

      // Auto-generate expected harvest date (100 days from start date)
      const startDateObj = new Date(finalStartDate)
      const expectedHarvestDate = new Date(startDateObj.getTime() + 100 * 24 * 60 * 60 * 1000)
      const expectedHarvestDateStr = expectedHarvestDate.toISOString().split('T')[0]

      const season = await seasonService.createSeason(
        finalPondId,
        finalSeasonName,
        finalStartDate,
        expectedHarvestDateStr,
        finalShrimpType,
        null,
        finalDensity,
        null
      )

      // Log season creation with explicit season_id capture
      await auditLogService.logActivity(
        req.user.user_id,
        'CREATE',
        'SEASON',
        season.season_id,
        {
          seasonName: finalSeasonName,
          pondId: finalPondId,
          startDate: finalStartDate,
          shrimpType: finalShrimpType,
          density: finalDensity
        },
        auditLogService.resolveEntityLabel('SEASON')
      );

      res.status(201).json({ success: true, data: season })
    } catch (error) {
      logger.error('Error in createSeason:', error)
      res.status(400).json({ success: false, message: error.message })
    }
  },

  async updateSeason(req, res) {
    try {
      const season = await seasonService.updateSeason(req.params.seasonId, req.body)
      
      // Log season update
      await auditLogService.logActivity(
        req.user.user_id,
        'UPDATE',
        'SEASON',
        req.params.seasonId,
        req.body,
        auditLogService.resolveEntityLabel('SEASON')
      );

      res.json({ success: true, data: season })
    } catch (error) {
      logger.error('Error in updateSeason:', error)
      res.status(400).json({ success: false, message: error.message })
    }
  },

  async harvestSeason(req, res) {
    try {
      // Support both camelCase and snake_case
      const actualHarvestDate = req.body.actualHarvestDate || req.body.actual_harvest
      const note = req.body.note
      
      const season = await seasonService.harvestSeason(req.params.seasonId, actualHarvestDate, note)
      
      // Log season harvest/close
      await auditLogService.logActivity(
        req.user.user_id,
        'UPDATE',
        'SEASON',
        req.params.seasonId,
        { action: 'Đóng/Thu hoạch mùa vụ', actualHarvestDate, note },
        auditLogService.resolveEntityLabel('SEASON')
      );

      res.json({ success: true, data: season })
    } catch (error) {
      logger.error('Error in harvestSeason:', error)
      res.status(400).json({ success: false, message: error.message })
    }
  },

  async deleteSeason(req, res) {
    try {
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

// Product Controllers
const productController = {
  async getAllProducts(req, res) {
    try {
      const products = await productService.getAllProducts()
      res.json({ success: true, data: products })
    } catch (error) {
      logger.error('Error in getAllProducts:', error)
      res.status(500).json({ success: false, message: error.message })
    }
  },

  async getProductsByCategory(req, res) {
    try {
      const products = await productService.getAllProducts(req.params.category)
      res.json({ success: true, data: products })
    } catch (error) {
      logger.error('Error in getProductsByCategory:', error)
      res.status(500).json({ success: false, message: error.message })
    }
  },

  async createProduct(req, res) {
    try {
      const { productName, category, unit, price, description } = req.body
      const product = await productService.createProduct(productName, category, unit, price, description)
      
      // Log product creation with explicit product_id capture
      await auditLogService.logActivity(
        req.user.user_id,
        'CREATE',
        'PRODUCT',
        product.product_id,
        {
          productName,
          category,
          unit,
          price,
          description
        },
        auditLogService.resolveEntityLabel('PRODUCT')
      );

      res.status(201).json({ success: true, data: product })
    } catch (error) {
      logger.error('Error in createProduct:', error)
      res.status(400).json({ success: false, message: error.message })
    }
  },

  async updateProduct(req, res) {
    try {
      const product = await productService.updateProduct(req.params.productId, req.body)
      
      // Log product update
      await auditLogService.logActivity(
        req.user.user_id,
        'UPDATE',
        'PRODUCT',
        req.params.productId,
        req.body,
        auditLogService.resolveEntityLabel('PRODUCT')
      );

      res.json({ success: true, data: product })
    } catch (error) {
      logger.error('Error in updateProduct:', error)
      res.status(400).json({ success: false, message: error.message })
    }
  },

  async deleteProduct(req, res) {
    try {
      await productService.deleteProduct(req.params.productId)
      
      // Log product deletion
      await auditLogService.logActivity(
        req.user.user_id,
        'DELETE',
        'PRODUCT',
        req.params.productId,
        { action: 'Xóa sản phẩm' },
        auditLogService.resolveEntityLabel('PRODUCT')
      );

      res.json({ success: true, message: 'Đã xóa sản phẩm' })
    } catch (error) {
      logger.error('Error in deleteProduct:', error)
      res.status(400).json({ success: false, message: error.message })
    }
  },
}

module.exports = { seasonController, productController }
