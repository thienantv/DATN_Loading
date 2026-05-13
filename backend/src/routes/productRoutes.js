const express = require('express')
const router = express.Router()
const { authorize } = require('../middlewares/authorize')
const { productController } = require('../controllers/index')

// Tất cả người dùng: Lấy danh sách sản phẩm (thức ăn, thuốc, vi sinh)
router.get('/', productController.getAllProducts)
router.get('/category/:category', productController.getProductsByCategory)

// Quản lý/Quản trị viên: Tạo sản phẩm
router.post('/', authorize(['MANAGER', 'ADMIN']), productController.createProduct)

// Quản lý/Quản trị viên: Cập nhật sản phẩm
router.put('/:productId', authorize(['MANAGER', 'ADMIN']), productController.updateProduct)

// Quản lý/Quản trị viên: Xóa sản phẩm
router.delete('/:productId', authorize(['MANAGER', 'ADMIN']), productController.deleteProduct)

module.exports = router
