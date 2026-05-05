const express = require('express')
const router = express.Router()
const { authorize } = require('../middlewares/authorize')
const { productController } = require('../controllers/index')

// Tất cả: Lấy danh sách sản phẩm (thức ăn, thuốc, vi sinh)
router.get('/', productController.getAllProducts)
router.get('/category/:category', productController.getProductsByCategory)

// MANAGER: Thêm sản phẩm
router.post('/', authorize(['MANAGER']), productController.createProduct)

// MANAGER: Sửa sản phẩm
router.put('/:productId', authorize(['MANAGER']), productController.updateProduct)

// MANAGER: Xóa sản phẩm
router.delete('/:productId', authorize(['MANAGER']), productController.deleteProduct)

module.exports = router
