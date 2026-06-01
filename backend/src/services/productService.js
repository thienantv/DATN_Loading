const db = require('../config/database')
const logger = require('../utils/logger')

const PRODUCT_CODE_PREFIX = 'PRD'
const CATEGORY_CODE_PREFIX = 'CAT'

const normalizeText = (value) => String(value ?? '').trim()

const normalizeMoney = (value) => {
  if (value === null || value === undefined || value === '') return 0
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error('Giá đơn vị không hợp lệ')
  }
  return parsed
}

const ensureFarmId = (farmId) => {
  const parsed = Number(farmId)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error('Không xác định được trại nuôi của người dùng')
  }
  return parsed
}

const getNextCode = async (client, tableName, columnName, farmId, prefix) => {
  const result = await client.query(
    `SELECT ${columnName} AS code
     FROM ${tableName}
     WHERE farm_id = $1 AND ${columnName} LIKE $2`,
    [farmId, `${prefix}-%`]
  )

  let highest = 0
  for (const row of result.rows) {
    const match = String(row.code || '').match(/(\d+)$/)
    if (match) {
      highest = Math.max(highest, Number(match[1]))
    }
  }

  return `${prefix}-${String(highest + 1).padStart(4, '0')}`
}

const getCategoryDetailById = async (client, categoryId, farmId) => {
  const result = await client.query(
    `SELECT
       pc.category_id,
       pc.farm_id,
       pc.category_code,
       pc.category_name,
       pc.note,
       pc.created_by,
       pc.updated_by,
       pc.created_at,
       pc.updated_at,
       COALESCE(COUNT(p.product_id), 0) AS product_count,
       creator.full_name AS created_by_name,
       updater.full_name AS updated_by_name,
       COALESCE(MAX(p.updated_at), pc.updated_at) AS latest_activity_at
     FROM product_categories pc
     LEFT JOIN products p ON p.category_id = pc.category_id
     LEFT JOIN users creator ON creator.user_id = pc.created_by
     LEFT JOIN users updater ON updater.user_id = pc.updated_by
     WHERE pc.category_id = $1 AND pc.farm_id = $2
     GROUP BY pc.category_id, creator.full_name, updater.full_name`,
    [categoryId, farmId]
  )

  return result.rows[0] || null
}

const getProductDetailById = async (client, productId, farmId) => {
  const result = await client.query(
    `SELECT
       p.product_id,
       p.farm_id,
       p.category_id,
       p.product_code,
       p.product_name,
       p.unit,
       p.supplier,
       p.unit_price,
       p.note,
       p.status,
       p.created_by,
       p.updated_by,
       p.created_at,
       p.updated_at,
       pc.category_code,
       pc.category_name,
       creator.full_name AS created_by_name,
       updater.full_name AS updated_by_name
     FROM products p
     LEFT JOIN product_categories pc ON pc.category_id = p.category_id
     LEFT JOIN users creator ON creator.user_id = p.created_by
     LEFT JOIN users updater ON updater.user_id = p.updated_by
     WHERE p.product_id = $1 AND p.farm_id = $2`,
    [productId, farmId]
  )

  return result.rows[0] || null
}

const productService = {
  async getProductOverview(farmId) {
    const scopeFarmId = ensureFarmId(farmId)

    try {
      const [categoryCountRes, productCountRes, supplierCountRes, categoryStatsRes, supplierStatsRes, topProductsRes] = await Promise.all([
        db.query('SELECT COUNT(*) AS total FROM product_categories WHERE farm_id = $1', [scopeFarmId]),
        db.query('SELECT COUNT(*) AS total FROM products WHERE farm_id = $1', [scopeFarmId]),
        db.query(
          `SELECT COUNT(DISTINCT TRIM(supplier)) AS total
           FROM products
           WHERE farm_id = $1 AND COALESCE(TRIM(supplier), '') <> ''`,
          [scopeFarmId]
        ),
        db.query(
          `SELECT
             pc.category_id,
             pc.category_name AS label,
             COUNT(p.product_id)::int AS value
           FROM product_categories pc
           LEFT JOIN products p ON p.category_id = pc.category_id
           WHERE pc.farm_id = $1
           GROUP BY pc.category_id, pc.category_name
           ORDER BY COUNT(p.product_id) DESC, pc.category_name ASC`,
          [scopeFarmId]
        ),
        db.query(
          `SELECT
             TRIM(supplier) AS label,
             COUNT(*)::int AS value
           FROM products
           WHERE farm_id = $1 AND COALESCE(TRIM(supplier), '') <> ''
           GROUP BY TRIM(supplier)
           ORDER BY COUNT(*) DESC, TRIM(supplier) ASC
           LIMIT 6`,
          [scopeFarmId]
        ),
        db.query(
          `SELECT
             p.product_id,
             p.product_name AS label,
             COALESCE(SUM(ul.quantity), 0)::numeric AS value
           FROM products p
           LEFT JOIN product_usage_logs ul ON ul.product_id = p.product_id
           WHERE p.farm_id = $1
           GROUP BY p.product_id, p.product_name, p.updated_at
           ORDER BY COALESCE(SUM(ul.quantity), 0) DESC, p.updated_at DESC
           LIMIT 6`,
          [scopeFarmId]
        ),
      ])

      const categoryStats = categoryStatsRes.rows.map((row, index) => ({
        label: row.label,
        value: Number(row.value || 0),
        color: ['#3b82f6', '#10b981', '#f59e0b', '#14b8a6', '#8b5cf6', '#ef4444'][index % 6],
      }))

      const supplierStats = supplierStatsRes.rows.map((row, index) => ({
        label: row.label,
        value: Number(row.value || 0),
        color: ['#0ea5e9', '#22c55e', '#f97316', '#a855f7', '#f43f5e', '#64748b'][index % 6],
      }))

      const topProducts = topProductsRes.rows.map((row, index) => ({
        label: row.label,
        value: Number(row.value || 0),
        color: ['#0284c7', '#0f766e', '#f59e0b', '#7c3aed', '#ef4444', '#16a34a'][index % 6],
      }))

      return {
        totalCategories: Number(categoryCountRes.rows[0]?.total || 0),
        totalProducts: Number(productCountRes.rows[0]?.total || 0),
        totalSuppliers: Number(supplierCountRes.rows[0]?.total || 0),
        topCategory: categoryStats[0] || null,
        categoryStats,
        supplierStats,
        topProducts,
      }
    } catch (error) {
      logger.error('Error in getProductOverview:', error)
      throw error
    }
  },

  async getProductCategories(farmId) {
    const scopeFarmId = ensureFarmId(farmId)

    try {
      const result = await db.query(
        `SELECT
           pc.category_id,
           pc.farm_id,
           pc.category_code,
           pc.category_name,
           pc.note,
           pc.created_by,
           pc.updated_by,
           pc.created_at,
           pc.updated_at,
           COALESCE(COUNT(p.product_id), 0)::int AS product_count,
           creator.full_name AS created_by_name,
           updater.full_name AS updated_by_name,
           COALESCE(MAX(p.updated_at), pc.updated_at) AS latest_activity_at
         FROM product_categories pc
         LEFT JOIN products p ON p.category_id = pc.category_id
         LEFT JOIN users creator ON creator.user_id = pc.created_by
         LEFT JOIN users updater ON updater.user_id = pc.updated_by
         WHERE pc.farm_id = $1
         GROUP BY pc.category_id, creator.full_name, updater.full_name
         ORDER BY pc.updated_at DESC, pc.category_name ASC`,
        [scopeFarmId]
      )

      return result.rows || []
    } catch (error) {
      logger.error('Error in getProductCategories:', error)
      throw error
    }
  },

  async getProductCategoryById(categoryId, farmId) {
    const scopeFarmId = ensureFarmId(farmId)
    const result = await db.query(
      `SELECT
         pc.category_id,
         pc.farm_id,
         pc.category_code,
         pc.category_name,
         pc.note,
         pc.created_by,
         pc.updated_by,
         pc.created_at,
         pc.updated_at,
         COALESCE(COUNT(p.product_id), 0)::int AS product_count,
         creator.full_name AS created_by_name,
         updater.full_name AS updated_by_name,
         COALESCE(MAX(p.updated_at), pc.updated_at) AS latest_activity_at
       FROM product_categories pc
       LEFT JOIN products p ON p.category_id = pc.category_id
       LEFT JOIN users creator ON creator.user_id = pc.created_by
       LEFT JOIN users updater ON updater.user_id = pc.updated_by
       WHERE pc.category_id = $1 AND pc.farm_id = $2
       GROUP BY pc.category_id, creator.full_name, updater.full_name`,
      [categoryId, scopeFarmId]
    )

    return result.rows[0] || null
  },

  async createProductCategory({ farmId, categoryName, note, createdBy }) {
    const scopeFarmId = ensureFarmId(farmId)
    const cleanName = normalizeText(categoryName)
    const cleanNote = normalizeText(note)
    if (!cleanName) {
      throw new Error('Tên danh mục không được để trống')
    }

    const client = await db.connect()
    try {
      await client.query('BEGIN')

      const duplicate = await client.query(
        'SELECT 1 FROM product_categories WHERE farm_id = $1 AND category_name = $2',
        [scopeFarmId, cleanName]
      )
      if (duplicate.rows.length > 0) {
        throw new Error('Danh mục này đã tồn tại trong trại')
      }

      const categoryCode = await getNextCode(client, 'product_categories', 'category_code', scopeFarmId, CATEGORY_CODE_PREFIX)
      const insertResult = await client.query(
        `INSERT INTO product_categories (farm_id, category_code, category_name, note, created_by, updated_by)
         VALUES ($1, $2, $3, $4, $5, $5)
         RETURNING category_id`,
        [scopeFarmId, categoryCode, cleanName, cleanNote || null, createdBy]
      )

      const category = await getCategoryDetailById(client, insertResult.rows[0].category_id, scopeFarmId)
      await client.query('COMMIT')
      return category
    } catch (error) {
      await client.query('ROLLBACK')
      logger.error('Error in createProductCategory:', error)
      throw error
    } finally {
      client.release()
    }
  },

  async updateProductCategory(categoryId, { farmId, categoryName, note, updatedBy }) {
    const scopeFarmId = ensureFarmId(farmId)
    const cleanName = normalizeText(categoryName)
    const cleanNote = normalizeText(note)
    if (!cleanName) {
      throw new Error('Tên danh mục không được để trống')
    }

    const duplicate = await db.query(
      `SELECT 1 FROM product_categories
       WHERE farm_id = $1 AND category_name = $2 AND category_id <> $3`,
      [scopeFarmId, cleanName, categoryId]
    )
    if (duplicate.rows.length > 0) {
      throw new Error('Tên danh mục đã tồn tại trong trại')
    }

    const updated = await db.query(
      `UPDATE product_categories
       SET category_name = $1,
           note = $2,
           updated_by = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE category_id = $4 AND farm_id = $5
       RETURNING category_id`,
      [cleanName, cleanNote || null, updatedBy, categoryId, scopeFarmId]
    )

    if (!updated.rows[0]) {
      return null
    }

    return getCategoryDetailById(db, categoryId, scopeFarmId)
  },

  async deleteProductCategory(categoryId, farmId) {
    const scopeFarmId = ensureFarmId(farmId)

    const usageRes = await db.query('SELECT COUNT(*) AS total FROM products WHERE category_id = $1 AND farm_id = $2', [categoryId, scopeFarmId])
    if (Number(usageRes.rows[0]?.total || 0) > 0) {
      throw new Error('Không thể xoá danh mục đang chứa sản phẩm')
    }

    const result = await db.query('DELETE FROM product_categories WHERE category_id = $1 AND farm_id = $2 RETURNING category_id', [categoryId, scopeFarmId])
    if (!result.rows[0]) {
      return false
    }
    return true
  },

  async getProducts(farmId) {
    const scopeFarmId = ensureFarmId(farmId)
    const result = await db.query(
      `SELECT
         p.product_id,
         p.farm_id,
         p.category_id,
         p.product_code,
         p.product_name,
         p.unit,
         p.supplier,
         p.unit_price,
         p.note,
         p.status,
         p.created_by,
         p.updated_by,
         p.created_at,
         p.updated_at,
         pc.category_code,
         pc.category_name,
         creator.full_name AS created_by_name,
         updater.full_name AS updated_by_name
       FROM products p
       LEFT JOIN product_categories pc ON pc.category_id = p.category_id
       LEFT JOIN users creator ON creator.user_id = p.created_by
       LEFT JOIN users updater ON updater.user_id = p.updated_by
       WHERE p.farm_id = $1
       ORDER BY p.updated_at DESC, p.created_at DESC`,
      [scopeFarmId]
    )

    return result.rows || []
  },

  async getProductById(productId, farmId) {
    const scopeFarmId = ensureFarmId(farmId)
    return getProductDetailById(db, productId, scopeFarmId)
  },

  async createProduct({ farmId, categoryId, categoryName, productName, unit, supplier, unitPrice, note, createdBy }) {
    const scopeFarmId = ensureFarmId(farmId)
    const cleanProductName = normalizeText(productName)
    const cleanUnit = normalizeText(unit)
    const cleanSupplier = normalizeText(supplier)
    const cleanNote = normalizeText(note)
    const priceValue = normalizeMoney(unitPrice)

    if (!cleanProductName) {
      throw new Error('Tên sản phẩm không được để trống')
    }
    if (!cleanUnit) {
      throw new Error('Đơn vị tính không được để trống')
    }

    const client = await db.connect()
    try {
      await client.query('BEGIN')

      let resolvedCategoryId = categoryId ? Number(categoryId) : null
      if (!resolvedCategoryId || String(categoryId) === 'OTHER') {
        const newCategoryName = normalizeText(categoryName)
        if (!newCategoryName) {
          throw new Error('Vui lòng nhập tên danh mục mới')
        }
        const categoryDuplicate = await client.query(
          'SELECT 1 FROM product_categories WHERE farm_id = $1 AND category_name = $2',
          [scopeFarmId, newCategoryName]
        )
        if (categoryDuplicate.rows.length > 0) {
          throw new Error('Danh mục này đã tồn tại trong trại')
        }

        const categoryCode = await getNextCode(client, 'product_categories', 'category_code', scopeFarmId, CATEGORY_CODE_PREFIX)
        const createdCategory = await client.query(
          `INSERT INTO product_categories (farm_id, category_code, category_name, note, created_by, updated_by)
           VALUES ($1, $2, $3, NULL, $4, $4)
           RETURNING category_id`,
          [scopeFarmId, categoryCode, newCategoryName, createdBy]
        )
        resolvedCategoryId = createdCategory.rows[0].category_id
      } else {
        const categoryCheck = await client.query(
          'SELECT category_id FROM product_categories WHERE category_id = $1 AND farm_id = $2',
          [resolvedCategoryId, scopeFarmId]
        )
        if (categoryCheck.rows.length === 0) {
          throw new Error('Danh mục không tồn tại trong trại')
        }
      }

      const duplicateProduct = await client.query(
        `SELECT 1 FROM products
         WHERE farm_id = $1 AND category_id = $2 AND product_name = $3`,
        [scopeFarmId, resolvedCategoryId, cleanProductName]
      )
      if (duplicateProduct.rows.length > 0) {
        throw new Error('Tên sản phẩm đã tồn tại trong danh mục này')
      }

      const productCode = await getNextCode(client, 'products', 'product_code', scopeFarmId, PRODUCT_CODE_PREFIX)
      const insertResult = await client.query(
        `INSERT INTO products (
           farm_id, category_id, product_code, product_name, unit, supplier, unit_price, note, created_by, updated_by
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
         RETURNING product_id`,
        [scopeFarmId, resolvedCategoryId, productCode, cleanProductName, cleanUnit, cleanSupplier || null, priceValue, cleanNote || null, createdBy]
      )

      const product = await getProductDetailById(client, insertResult.rows[0].product_id, scopeFarmId)
      await client.query('COMMIT')
      return product
    } catch (error) {
      await client.query('ROLLBACK')
      logger.error('Error in createProduct:', error)
      throw error
    } finally {
      client.release()
    }
  },

  async updateProduct(productId, { farmId, categoryId, productName, unit, supplier, unitPrice, note, updatedBy }) {
    const scopeFarmId = ensureFarmId(farmId)
    const cleanProductName = normalizeText(productName)
    const cleanUnit = normalizeText(unit)
    const cleanSupplier = normalizeText(supplier)
    const cleanNote = normalizeText(note)
    const priceValue = normalizeMoney(unitPrice)

    if (!cleanProductName) {
      throw new Error('Tên sản phẩm không được để trống')
    }
    if (!cleanUnit) {
      throw new Error('Đơn vị tính không được để trống')
    }

    const existing = await getProductDetailById(db, productId, scopeFarmId)
    if (!existing) {
      return null
    }

    const resolvedCategoryId = Number(categoryId || existing.category_id)
    const categoryCheck = await db.query(
      'SELECT category_id FROM product_categories WHERE category_id = $1 AND farm_id = $2',
      [resolvedCategoryId, scopeFarmId]
    )
    if (categoryCheck.rows.length === 0) {
      throw new Error('Danh mục không tồn tại trong trại')
    }

    const duplicateProduct = await db.query(
      `SELECT 1 FROM products
       WHERE farm_id = $1 AND category_id = $2 AND product_name = $3 AND product_id <> $4`,
      [scopeFarmId, resolvedCategoryId, cleanProductName, productId]
    )
    if (duplicateProduct.rows.length > 0) {
      throw new Error('Tên sản phẩm đã tồn tại trong danh mục này')
    }

    const updated = await db.query(
      `UPDATE products
       SET category_id = $1,
           product_name = $2,
           unit = $3,
           supplier = $4,
           unit_price = $5,
           note = $6,
           updated_by = $7,
           updated_at = CURRENT_TIMESTAMP
       WHERE product_id = $8 AND farm_id = $9
       RETURNING product_id`,
      [resolvedCategoryId, cleanProductName, cleanUnit, cleanSupplier || null, priceValue, cleanNote || null, updatedBy, productId, scopeFarmId]
    )

    if (!updated.rows[0]) {
      return null
    }

    return getProductDetailById(db, productId, scopeFarmId)
  },

  async deleteProduct(productId, farmId) {
    const scopeFarmId = ensureFarmId(farmId)
    const product = await getProductDetailById(db, productId, scopeFarmId)
    if (!product) {
      return false
    }

    const usageRes = await db.query('SELECT COUNT(*) AS total FROM product_usage_logs WHERE product_id = $1', [productId])
    if (Number(usageRes.rows[0]?.total || 0) > 0) {
      throw new Error('Không thể xóa: sản phẩm đã được sử dụng ở chức năng khác')
    }

    const result = await db.query('DELETE FROM products WHERE product_id = $1 AND farm_id = $2 RETURNING product_id', [productId, scopeFarmId])
    return Boolean(result.rows[0])
  },
}

module.exports = productService