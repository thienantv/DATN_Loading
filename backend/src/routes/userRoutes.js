const express = require('express')
const router = express.Router()
const { authorize } = require('../middlewares/authorize')
const userController = require('../controllers/userController')
const { avatarUpload } = require('../middlewares/upload')

// Lấy thông tin user hiện tại
router.get('/me', userController.getCurrentUser)

// Tất cả user: cập nhật thông tin cá nhân của mình
router.put('/me', userController.updateCurrentUserProfile)

// Tất cả user: cập nhật ảnh đại diện của mình
router.post('/me/avatar', avatarUpload.single('avatar'), userController.uploadCurrentUserAvatar)

// ADMIN: quản lý user
router.get('/', authorize(['ADMIN']), userController.getAllUsers)

// ADMIN/MANAGER/OWNER: lấy danh sách nhân viên (dùng để gán ao)
router.get('/workers', authorize(['ADMIN','MANAGER','OWNER']), userController.getWorkerUsers)

// ADMIN: cập nhật thông tin user (full_name, email)
router.put('/:userId', authorize(['ADMIN']), userController.updateUser)

// ADMIN: phân quyền (thay đổi role)
// Allow ADMIN and OWNER to change role for users within their scope
router.put('/:userId/role', authorize(['ADMIN','OWNER']), userController.updateUserRole)

// ADMIN: khóa tài khoản
router.put('/:userId/lock', authorize(['ADMIN']), userController.lockUser)

// ADMIN: mở khóa tài khoản
router.put('/:userId/unlock', authorize(['ADMIN']), userController.unlockUser)

// ADMIN/OWNER: reset mật khẩu (OWNER limited to users in their farm)
router.post('/:userId/reset-password', authorize(['ADMIN','OWNER']), userController.resetPassword)

// ADMIN: xóa user
router.delete('/:userId', authorize(['ADMIN']), userController.deleteUser)

// ADMIN/OWNER: gỡ người dùng khỏi trại nuôi (set farm_id = NULL)
router.put('/:userId/remove-from-farm', authorize(['ADMIN','OWNER']), userController.removeUserFromFarm)

// ADMIN: gán người dùng vào trại nuôi
router.put('/:userId/assign-to-farm', authorize(['ADMIN']), userController.assignUserToFarm)

// Tất cả user: đổi mật khẩu của mình
router.post('/change-password', userController.changePassword)

module.exports = router
