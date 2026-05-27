const express = require('express')
const router = express.Router()
const { authorize } = require('../middlewares/authorize')
const inventoryController = require('../controllers/inventoryController')

router.get('/categories', authorize(['STOREKEEPER', 'OWNER']), inventoryController.getInventoryCategories)
router.post('/categories', authorize(['STOREKEEPER', 'OWNER']), inventoryController.createInventoryCategory)
router.put('/categories/:categoryId', authorize(['STOREKEEPER', 'OWNER']), inventoryController.updateInventoryCategory)
router.delete('/categories/:categoryId', authorize(['STOREKEEPER', 'OWNER']), inventoryController.deleteInventoryCategory)

router.get('/products', authorize(['STOREKEEPER', 'WORKER', 'OWNER']), inventoryController.getProducts)
router.get('/products/:productId', authorize(['STOREKEEPER', 'WORKER', 'OWNER']), inventoryController.getProductById)
router.post('/products', authorize(['STOREKEEPER', 'OWNER']), inventoryController.createProduct)
router.put('/products/:productId', authorize(['STOREKEEPER', 'OWNER']), inventoryController.updateProduct)
router.delete('/products/:productId', authorize(['STOREKEEPER', 'OWNER']), inventoryController.deleteProduct)

router.get('/balance', authorize(['STOREKEEPER', 'OWNER']), inventoryController.getInventoryBalance)
router.get('/summary', authorize(['STOREKEEPER', 'OWNER']), inventoryController.getInventorySummary)

module.exports = router
