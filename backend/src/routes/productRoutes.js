const express = require('express')
const router = express.Router()
const { authorize } = require('../middlewares/authorize')
const { productController } = require('../controllers/index')

// Tất cả: Lấy danh sách sản phẩm (thức ăn, thuốc, vi sinh)
router.get('/', productController.getAllProducts)
router.get('/category/:category', productController.getProductsByCategory)

// Manager/Admin: Create product
router.post('/', authorize(['MANAGER', 'ADMIN']), productController.createProduct)

// Manager/Admin: Update product
router.put('/:productId', authorize(['MANAGER', 'ADMIN']), productController.updateProduct)

// Manager/Admin: Delete product
router.delete('/:productId', authorize(['MANAGER', 'ADMIN']), productController.deleteProduct)

module.exports = router
