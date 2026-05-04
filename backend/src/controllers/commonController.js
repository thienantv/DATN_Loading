const { seasonService, productService } = require('../services/commonService')
const logger = require('../utils/logger')

// Season Controllers
const seasonController = {
  async getAllSeasons(req, res) {
    try {
      const { pondId } = req.query
      const seasons = await seasonService.getAllSeasons(pondId)
      res.json({ success: true, data: seasons })
    } catch (error) {
      logger.error('Error in getAllSeasons:', error)
      res.status(500).json({ success: false, message: error.message })
    }
  },

  async getSeasonDetail(req, res) {
    try {
      const season = await seasonService.getSeasonById(req.params.seasonId)
      if (!season) return res.status(404).json({ success: false, message: 'Mùa vụ không tồn tại' })
      res.json({ success: true, data: season })
    } catch (error) {
      logger.error('Error in getSeasonDetail:', error)
      res.status(500).json({ success: false, message: error.message })
    }
  },

  async createSeason(req, res) {
    try {
      const { pondId, seasonName, startDate, expectedHarvestDate, shrimpType, quantitySeed, density } = req.body
      const season = await seasonService.createSeason(pondId, seasonName, startDate, expectedHarvestDate, shrimpType, quantitySeed, density)
      res.status(201).json({ success: true, data: season })
    } catch (error) {
      logger.error('Error in createSeason:', error)
      res.status(400).json({ success: false, message: error.message })
    }
  },

  async updateSeason(req, res) {
    try {
      const season = await seasonService.updateSeason(req.params.seasonId, req.body)
      res.json({ success: true, data: season })
    } catch (error) {
      logger.error('Error in updateSeason:', error)
      res.status(400).json({ success: false, message: error.message })
    }
  },

  async harvestSeason(req, res) {
    try {
      const { actualHarvestDate, note } = req.body
      const season = await seasonService.harvestSeason(req.params.seasonId, actualHarvestDate, note)
      res.json({ success: true, data: season })
    } catch (error) {
      logger.error('Error in harvestSeason:', error)
      res.status(400).json({ success: false, message: error.message })
    }
  },

  async deleteSeason(req, res) {
    try {
      const result = await seasonService.deleteSeason(req.params.seasonId)
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
      res.status(201).json({ success: true, data: product })
    } catch (error) {
      logger.error('Error in createProduct:', error)
      res.status(400).json({ success: false, message: error.message })
    }
  },

  async updateProduct(req, res) {
    try {
      const product = await productService.updateProduct(req.params.productId, req.body)
      res.json({ success: true, data: product })
    } catch (error) {
      logger.error('Error in updateProduct:', error)
      res.status(400).json({ success: false, message: error.message })
    }
  },

  async deleteProduct(req, res) {
    try {
      await productService.deleteProduct(req.params.productId)
      res.json({ success: true, message: 'Đã xóa sản phẩm' })
    } catch (error) {
      logger.error('Error in deleteProduct:', error)
      res.status(400).json({ success: false, message: error.message })
    }
  },
}

module.exports = { seasonController, productController }
