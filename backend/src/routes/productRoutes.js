const express = require('express')
const router = express.Router()
const { authorize } = require('../middlewares/authorize')
const { productController } = require('../controllers/index')

// Tất cả: Lấy danh sách sản phẩm (thức ăn, thuốc, vi sinh)
router.get('/', productController.getAllProducts)
router.get('/category/:category', productController.getProductsByCategory)

// (Removed manager-only product CRUD routes)

module.exports = router
