const express = require('express')
const router = express.Router()
const { authorize } = require('../middlewares/authorize')
const userController = require('../controllers/userController')

// Lấy thông tin user hiện tại
router.get('/me', userController.getCurrentUser)

// Tất cả user: cập nhật thông tin cá nhân của mình
router.put('/me', userController.updateCurrentUserProfile)

// ADMIN: quản lý user
router.get('/', authorize(['ADMIN']), userController.getAllUsers)

// ADMIN/MANAGER/OWNER: lấy danh sách nhân viên (dùng để gán ao)
router.get('/workers', authorize(['ADMIN','MANAGER','OWNER']), userController.getWorkerUsers)

// ADMIN: cập nhật thông tin user (full_name, email)
router.put('/:userId', authorize(['ADMIN']), userController.updateUser)

// ADMIN: phân quyền (thay đổi role)
router.put('/:userId/role', authorize(['ADMIN']), userController.updateUserRole)

// ADMIN: khóa tài khoản
router.put('/:userId/lock', authorize(['ADMIN']), userController.lockUser)

// ADMIN: mở khóa tài khoản
router.put('/:userId/unlock', authorize(['ADMIN']), userController.unlockUser)

// ADMIN: reset mật khẩu
router.post('/:userId/reset-password', authorize(['ADMIN']), userController.resetPassword)

// ADMIN: xóa user
router.delete('/:userId', authorize(['ADMIN']), userController.deleteUser)

// Tất cả user: đổi mật khẩu của mình
router.post('/change-password', userController.changePassword)

module.exports = router
