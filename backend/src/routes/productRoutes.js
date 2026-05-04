const express = require('express')
const router = express.Router()
const { authorize } = require('../middlewares/authorize')
const { productController } = require('../controllers/index')

// Tất cả: Lấy danh sách sản phẩm (thức ăn, thuốc, vi sinh)
router.get('/', productController.getAllProducts)
router.get('/category/:category', productController.getProductsByCategory)

// ADMIN: Thêm sản phẩm (1.2)
router.post('/', authorize(['ADMIN']), productController.createProduct)

// ADMIN: Sửa sản phẩm (1.2)
router.put('/:productId', authorize(['ADMIN']), productController.updateProduct)

// ADMIN: Xóa sản phẩm (1.2)
router.delete('/:productId', authorize(['ADMIN']), productController.deleteProduct)

module.exports = router
