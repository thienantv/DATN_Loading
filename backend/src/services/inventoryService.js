const db = require('../config/database')
const logger = require('../utils/logger')

const inventoryService = {
  async getInventoryCategories() {
    try {
      const result = await db.query(`
        SELECT category_id, category_name, description, created_at, updated_at
        FROM inventory_categories
        ORDER BY category_id ASC
      `)
      return result.rows || []
    } catch (error) {
      logger.error('Error in getInventoryCategories:', error)
      throw error
    }
  },

  async createInventoryCategory({ categoryName, description }) {
    try {
      const name = String(categoryName || '').trim()
      if (!name) throw new Error('Ten danh muc khong duoc de trong')

      const result = await db.query(`
        INSERT INTO inventory_categories (category_name, description)
        VALUES ($1, $2)
        RETURNING category_id, category_name, description, created_at, updated_at
      `, [name, description || null])
      return result.rows[0]
    } catch (error) {
      logger.error('Error in createInventoryCategory:', error)
      throw error
    }
  },

  async updateInventoryCategory(categoryId, { categoryName, description }) {
    try {
      const name = String(categoryName || '').trim()
      if (!name) throw new Error('Ten danh muc khong duoc de trong')

      const result = await db.query(`
        UPDATE inventory_categories
        SET category_name = $1, description = $2, updated_at = CURRENT_TIMESTAMP
        WHERE category_id = $3
        RETURNING category_id, category_name, description, created_at, updated_at
      `, [name, description || null, categoryId])

      if (!result.rows[0]) throw new Error('Danh muc khong ton tai')
      return result.rows[0]
    } catch (error) {
      logger.error('Error in updateInventoryCategory:', error)
      throw error
    }
  },

  async deleteInventoryCategory(categoryId) {
    try {
      const inUse = await db.query('SELECT COUNT(*) AS c FROM products WHERE category_id = $1', [categoryId])
      if (Number(inUse.rows[0]?.c || 0) > 0) {
        throw new Error('Khong the xoa: danh muc dang duoc su dung boi san pham')
      }

      const result = await db.query('DELETE FROM inventory_categories WHERE category_id = $1 RETURNING category_id', [categoryId])
      if (!result.rows[0]) throw new Error('Danh muc khong ton tai')
      return true
    } catch (error) {
      logger.error('Error in deleteInventoryCategory:', error)
      throw error
    }
  },

  async getProducts(filters = {}) {
    try {
      let query = `
        SELECT
          p.product_id,
          p.product_code,
          p.product_name,
          p.category_id,
          ic.category_name,
          p.unit,
          p.supplier,
          p.description,
          p.status,
          p.created_at,
          p.updated_at
        FROM products p
        LEFT JOIN inventory_categories ic ON p.category_id = ic.category_id
        WHERE 1=1
      `
      const params = []
      let i = 1

      if (filters.categoryId) {
        query += ` AND p.category_id = $${i++}`
        params.push(filters.categoryId)
      }
      if (filters.status) {
        query += ` AND p.status = $${i++}`
        params.push(filters.status)
      }
      if (filters.search) {
        query += ` AND (p.product_code ILIKE $${i} OR p.product_name ILIKE $${i})`
        params.push(`%${filters.search}%`)
        i++
      }

      query += ' ORDER BY p.product_code ASC'
      const result = await db.query(query, params)
      return result.rows || []
    } catch (error) {
      logger.error('Error in getProducts:', error)
      throw error
    }
  },

  async getProductById(productId) {
    try {
      const result = await db.query(`
        SELECT
          p.product_id,
          p.product_code,
          p.product_name,
          p.category_id,
          ic.category_name,
          p.unit,
          p.supplier,
          p.description,
          p.status,
          p.created_at,
          p.updated_at
        FROM products p
        LEFT JOIN inventory_categories ic ON p.category_id = ic.category_id
        WHERE p.product_id = $1
      `, [productId])
      return result.rows[0] || null
    } catch (error) {
      logger.error('Error in getProductById:', error)
      throw error
    }
  },

  async createProduct({ productCode, productName, categoryId, unit, supplier, description, status }) {
    try {
      if (!productCode || !productName || !categoryId || !unit) {
        throw new Error('Ma, ten san pham, danh muc va don vi la bat buoc')
      }

      const result = await db.query(`
        INSERT INTO products (
          product_code, product_name, category_id, unit, supplier, description, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING product_id, product_code, product_name, category_id, unit,
                  supplier, description, status, created_at, updated_at
      `, [
        String(productCode).trim(),
        String(productName).trim(),
        categoryId,
        String(unit).trim(),
        supplier || null,
        description || null,
        status || 'ACTIVE',
      ])

      return result.rows[0]
    } catch (error) {
      logger.error('Error in createProduct:', error)
      throw error
    }
  },

  async updateProduct(productId, { productCode, productName, categoryId, unit, supplier, description, status }) {
    try {
      const exists = await db.query('SELECT product_id FROM products WHERE product_id = $1', [productId])
      if (!exists.rows[0]) throw new Error('San pham khong ton tai')

      const sets = []
      const vals = []
      let i = 1

      if (productCode) {
        sets.push(`product_code = $${i++}`)
        vals.push(String(productCode).trim())
      }
      if (productName) {
        sets.push(`product_name = $${i++}`)
        vals.push(String(productName).trim())
      }
      if (categoryId) {
        sets.push(`category_id = $${i++}`)
        vals.push(categoryId)
      }
      if (unit) {
        sets.push(`unit = $${i++}`)
        vals.push(String(unit).trim())
      }
      if (supplier !== undefined) {
        sets.push(`supplier = $${i++}`)
        vals.push(supplier)
      }
      if (description !== undefined) {
        sets.push(`description = $${i++}`)
        vals.push(description)
      }
      if (status) {
        sets.push(`status = $${i++}`)
        vals.push(status)
      }
      sets.push('updated_at = CURRENT_TIMESTAMP')

      vals.push(productId)
      const result = await db.query(`
        UPDATE products
        SET ${sets.join(', ')}
        WHERE product_id = $${i}
        RETURNING product_id, product_code, product_name, category_id, unit,
                  supplier, description, status, created_at, updated_at
      `, vals)

      return result.rows[0]
    } catch (error) {
      logger.error('Error in updateProduct:', error)
      throw error
    }
  },

  async deleteProduct(productId) {
    try {
      const importsRes = await db.query('SELECT COUNT(*) AS c FROM stock_imports WHERE product_id = $1', [productId])
      const exportsRes = await db.query('SELECT COUNT(*) AS c FROM stock_exports WHERE product_id = $1', [productId])
      if (Number(importsRes.rows[0]?.c || 0) > 0 || Number(exportsRes.rows[0]?.c || 0) > 0) {
        throw new Error('Khong the xoa: san pham da co giao dich kho')
      }

      const result = await db.query('DELETE FROM products WHERE product_id = $1 RETURNING product_id', [productId])
      if (!result.rows[0]) throw new Error('San pham khong ton tai')
      return true
    } catch (error) {
      logger.error('Error in deleteProduct:', error)
      throw error
    }
  },

  async getStockImports(filters = {}) {
    try {
      let query = `
        SELECT
          si.import_id,
          si.product_id,
          p.product_code,
          p.product_name,
          ic.category_name,
          p.unit,
          si.quantity,
          si.unit_price,
          si.total_amount,
          si.note,
          si.import_date,
          si.created_at,
          u.full_name AS created_by_name
        FROM stock_imports si
        JOIN products p ON si.product_id = p.product_id
        LEFT JOIN inventory_categories ic ON p.category_id = ic.category_id
        LEFT JOIN users u ON si.created_by = u.user_id
        WHERE 1=1
      `
      const params = []
      let i = 1

      if (filters.productId) {
        query += ` AND si.product_id = $${i++}`
        params.push(filters.productId)
      }
      if (filters.startDate) {
        query += ` AND si.import_date >= $${i++}`
        params.push(filters.startDate)
      }
      if (filters.endDate) {
        query += ` AND si.import_date <= $${i++}`
        params.push(filters.endDate)
      }

      query += ' ORDER BY si.import_date DESC, si.created_at DESC'
      const result = await db.query(query, params)
      return result.rows || []
    } catch (error) {
      logger.error('Error in getStockImports:', error)
      throw error
    }
  },

  async createStockImport({ productId, quantity, unitPrice, note, createdBy, importDate }) {
    try {
      if (!productId || !quantity || unitPrice === undefined || unitPrice === null) {
        throw new Error('San pham, so luong va don gia la bat buoc')
      }

      const result = await db.query(`
        INSERT INTO stock_imports (product_id, quantity, unit_price, note, created_by, import_date)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING import_id, product_id, quantity, unit_price, total_amount,
                  note, created_by, import_date, created_at
      `, [productId, quantity, unitPrice, note || null, createdBy || null, importDate || null])

      return result.rows[0]
    } catch (error) {
      logger.error('Error in createStockImport:', error)
      throw error
    }
  },

  async getStockExports(filters = {}) {
    try {
      let query = `
        SELECT
          se.export_id,
          se.product_id,
          p.product_code,
          p.product_name,
          ic.category_name,
          p.unit,
          se.quantity,
          se.unit_price,
          se.total_amount,
          se.pond_id,
          po.pond_code,
          po.pond_name,
          se.export_reason,
          se.note,
          se.export_date,
          se.created_at,
          u.full_name AS created_by_name
        FROM stock_exports se
        JOIN products p ON se.product_id = p.product_id
        LEFT JOIN inventory_categories ic ON p.category_id = ic.category_id
        LEFT JOIN ponds po ON se.pond_id = po.pond_id
        LEFT JOIN users u ON se.created_by = u.user_id
        WHERE 1=1
      `
      const params = []
      let i = 1

      if (filters.productId) {
        query += ` AND se.product_id = $${i++}`
        params.push(filters.productId)
      }
      if (filters.pondId) {
        query += ` AND se.pond_id = $${i++}`
        params.push(filters.pondId)
      }
      if (filters.startDate) {
        query += ` AND se.export_date >= $${i++}`
        params.push(filters.startDate)
      }
      if (filters.endDate) {
        query += ` AND se.export_date <= $${i++}`
        params.push(filters.endDate)
      }

      query += ' ORDER BY se.export_date DESC, se.created_at DESC'
      const result = await db.query(query, params)
      return result.rows || []
    } catch (error) {
      logger.error('Error in getStockExports:', error)
      throw error
    }
  },

  async createStockExport({ productId, quantity, unitPrice, pondId, exportReason, note, createdBy, exportDate }) {
    try {
      if (!productId || !quantity) throw new Error('San pham va so luong la bat buoc')

      const result = await db.query(`
        INSERT INTO stock_exports (
          product_id, pond_id, quantity, unit_price, export_reason, note, created_by, export_date
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING export_id, product_id, pond_id, quantity, unit_price, total_amount,
                  export_reason, note, created_by, export_date, created_at
      `, [productId, pondId || null, quantity, unitPrice || null, exportReason || null, note || null, createdBy || null, exportDate || null])

      return result.rows[0]
    } catch (error) {
      logger.error('Error in createStockExport:', error)
      throw error
    }
  },

  async getInventoryBalance(productId = null) {
    try {
      let query = `
        SELECT
          vis.product_id,
          vis.product_code,
          vis.product_name,
          vis.unit,
          vis.total_import,
          vis.total_export,
          vis.stock_quantity,
          ic.category_name,
          p.supplier,
          p.status
        FROM vw_inventory_stock vis
        JOIN products p ON p.product_id = vis.product_id
        LEFT JOIN inventory_categories ic ON ic.category_id = p.category_id
      `

      if (productId) {
        const result = await db.query(`${query} WHERE vis.product_id = $1`, [productId])
        return result.rows[0] || null
      }

      const result = await db.query(`${query} ORDER BY vis.product_code ASC`)
      return result.rows || []
    } catch (error) {
      logger.error('Error in getInventoryBalance:', error)
      throw error
    }
  },

  async getInventorySummary() {
    try {
      const result = await db.query(`
        SELECT
          COUNT(*)::int AS total_products,
          COALESCE(SUM(stock_quantity), 0) AS total_quantity,
          COALESCE(SUM(stock_quantity * COALESCE(last_price.unit_price, 0)), 0) AS total_value,
          (
            SELECT COUNT(*)::int
            FROM inventory_categories
          ) AS total_categories
        FROM vw_inventory_stock vis
        LEFT JOIN LATERAL (
          SELECT unit_price
          FROM stock_imports si
          WHERE si.product_id = vis.product_id
          ORDER BY si.import_date DESC, si.created_at DESC
          LIMIT 1
        ) last_price ON true
      `)

      return result.rows[0] || {
        total_products: 0,
        total_quantity: 0,
        total_value: 0,
        total_categories: 0,
      }
    } catch (error) {
      logger.error('Error in getInventorySummary:', error)
      throw error
    }
  },

  async getLowStockProducts(limit = 20) {
    try {
      const result = await db.query(`
        SELECT
          vis.product_id,
          vis.product_code,
          vis.product_name,
          vis.unit,
          vis.total_import,
          vis.total_export,
          vis.stock_quantity,
          ic.category_name,
          p.status
        FROM vw_inventory_stock vis
        JOIN products p ON p.product_id = vis.product_id
        LEFT JOIN inventory_categories ic ON ic.category_id = p.category_id
        WHERE p.status = 'ACTIVE'
        ORDER BY vis.stock_quantity ASC, vis.product_name ASC
        LIMIT $1
      `, [limit])

      return result.rows || []
    } catch (error) {
      logger.error('Error in getLowStockProducts:', error)
      throw error
    }
  },
}

module.exports = inventoryService
