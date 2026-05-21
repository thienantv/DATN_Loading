const express = require('express')
const router = express.Router()
const { authorize } = require('../middlewares/authorize')
const inventoryController = require('../controllers/inventoryController')

router.get('/categories', authorize(['STOREKEEPER', 'MANAGER', 'ADMIN']), inventoryController.getInventoryCategories)
router.post('/categories', authorize(['STOREKEEPER', 'ADMIN']), inventoryController.createInventoryCategory)
router.put('/categories/:categoryId', authorize(['STOREKEEPER', 'ADMIN']), inventoryController.updateInventoryCategory)
router.delete('/categories/:categoryId', authorize(['STOREKEEPER', 'ADMIN']), inventoryController.deleteInventoryCategory)

router.get('/products', authorize(['STOREKEEPER', 'MANAGER', 'WORKER', 'ADMIN']), inventoryController.getProducts)
router.get('/products/:productId', authorize(['STOREKEEPER', 'MANAGER', 'WORKER', 'ADMIN']), inventoryController.getProductById)
router.post('/products', authorize(['STOREKEEPER', 'ADMIN']), inventoryController.createProduct)
router.put('/products/:productId', authorize(['STOREKEEPER', 'ADMIN']), inventoryController.updateProduct)
router.delete('/products/:productId', authorize(['STOREKEEPER', 'ADMIN']), inventoryController.deleteProduct)

router.get('/imports', authorize(['STOREKEEPER', 'MANAGER', 'ACCOUNTANT', 'ADMIN']), inventoryController.getStockImports)
router.post('/imports', authorize(['STOREKEEPER', 'ADMIN']), inventoryController.createStockImport)

router.get('/exports', authorize(['STOREKEEPER', 'MANAGER', 'WORKER', 'ADMIN']), inventoryController.getStockExports)
router.post('/exports', authorize(['STOREKEEPER', 'ADMIN']), inventoryController.createStockExport)

router.get('/balance', authorize(['STOREKEEPER', 'MANAGER', 'ADMIN']), inventoryController.getInventoryBalance)
router.get('/summary', authorize(['STOREKEEPER', 'MANAGER', 'ADMIN']), inventoryController.getInventorySummary)

module.exports = router
