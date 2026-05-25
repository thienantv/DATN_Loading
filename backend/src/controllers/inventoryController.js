const inventoryService = require('../services/inventoryService')
const logger = require('../utils/logger')

const inventoryController = {
  async getInventoryCategories(req, res) {
    try {
      const data = await inventoryService.getInventoryCategories()
      res.json({ success: true, data })
    } catch (error) {
      logger.error('Error in getInventoryCategories:', error)
      res.status(500).json({ success: false, message: error.message })
    }
  },

  async createInventoryCategory(req, res) {
    try {
      const { categoryName, category_name, description } = req.body
      const data = await inventoryService.createInventoryCategory({
        categoryName: categoryName || category_name,
        description,
      })
      res.status(201).json({ success: true, data, message: 'Da tao danh muc' })
    } catch (error) {
      logger.error('Error in createInventoryCategory:', error)
      const status = error.code === '23505' ? 409 : 400
      res.status(status).json({ success: false, message: error.message })
    }
  },

  async updateInventoryCategory(req, res) {
    try {
      const { categoryId } = req.params
      const { categoryName, category_name, description } = req.body
      const data = await inventoryService.updateInventoryCategory(categoryId, {
        categoryName: categoryName || category_name,
        description,
      })
      res.json({ success: true, data, message: 'Da cap nhat danh muc' })
    } catch (error) {
      logger.error('Error in updateInventoryCategory:', error)
      res.status(400).json({ success: false, message: error.message })
    }
  },

  async deleteInventoryCategory(req, res) {
    try {
      const { categoryId } = req.params
      await inventoryService.deleteInventoryCategory(categoryId)
      res.json({ success: true, message: 'Da xoa danh muc' })
    } catch (error) {
      logger.error('Error in deleteInventoryCategory:', error)
      res.status(400).json({ success: false, message: error.message })
    }
  },

  async getProducts(req, res) {
    try {
      const { categoryId, category_id, status, search } = req.query
      const data = await inventoryService.getProducts({
        categoryId: categoryId || category_id,
        status,
        search,
      })
      res.json({ success: true, data })
    } catch (error) {
      logger.error('Error in getProducts:', error)
      res.status(500).json({ success: false, message: error.message })
    }
  },

  async getProductById(req, res) {
    try {
      const { productId } = req.params
      const data = await inventoryService.getProductById(productId)
      if (!data) return res.status(404).json({ success: false, message: 'Khong tim thay san pham' })
      res.json({ success: true, data })
    } catch (error) {
      logger.error('Error in getProductById:', error)
      res.status(500).json({ success: false, message: error.message })
    }
  },

  async createProduct(req, res) {
    try {
      const {
        productCode, product_code,
        productName, product_name,
        categoryId, category_id,
        unit, supplier, description, status,
      } = req.body

      const data = await inventoryService.createProduct({
        productCode: productCode || product_code,
        productName: productName || product_name,
        categoryId: categoryId || category_id,
        unit,
        supplier,
        description,
        status,
      })

      res.status(201).json({ success: true, data, message: 'Da tao san pham' })
    } catch (error) {
      logger.error('Error in createProduct:', error)
      const status = error.code === '23505' ? 409 : 400
      res.status(status).json({ success: false, message: error.message })
    }
  },

  async updateProduct(req, res) {
    try {
      const { productId } = req.params
      const {
        productCode, product_code,
        productName, product_name,
        categoryId, category_id,
        unit, supplier, description, status,
      } = req.body

      const data = await inventoryService.updateProduct(productId, {
        productCode: productCode || product_code,
        productName: productName || product_name,
        categoryId: categoryId || category_id,
        unit,
        supplier,
        description,
        status,
      })

      res.json({ success: true, data, message: 'Da cap nhat san pham' })
    } catch (error) {
      logger.error('Error in updateProduct:', error)
      res.status(400).json({ success: false, message: error.message })
    }
  },

  async deleteProduct(req, res) {
    try {
      const { productId } = req.params
      await inventoryService.deleteProduct(productId)
      res.json({ success: true, message: 'Da xoa san pham' })
    } catch (error) {
      logger.error('Error in deleteProduct:', error)
      res.status(400).json({ success: false, message: error.message })
    }
  },

  async getInventoryBalance(req, res) {
    try {
      const { productId, product_id } = req.query
      const data = await inventoryService.getInventoryBalance(productId || product_id || null)
      res.json({ success: true, data })
    } catch (error) {
      logger.error('Error in getInventoryBalance:', error)
      res.status(500).json({ success: false, message: error.message })
    }
  },

  async getInventorySummary(req, res) {
    try {
      const data = await inventoryService.getInventorySummary()
      res.json({ success: true, data })
    } catch (error) {
      logger.error('Error in getInventorySummary:', error)
      res.status(500).json({ success: false, message: error.message })
    }
  },
}

module.exports = inventoryController
