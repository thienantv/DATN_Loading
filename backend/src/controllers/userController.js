const userService = require('../services/userService')
const logger = require('../utils/logger')
const auditLogService = require('../services/auditLogService')

const userController = {
  async getCurrentUser(req, res) {
    try {
      const user = await userService.getUserById(req.user.user_id)
      res.json({ success: true, data: user })
    } catch (error) {
      logger.error('Error in getCurrentUser:', error)
      res.status(500).json({ success: false, message: error.message })
    }
  },

  async getAllUsers(req, res) {
    try {
      const users = await userService.getAllUsers()
      res.json({ success: true, data: users })
    } catch (error) {
      logger.error('Error in getAllUsers:', error)
      res.status(500).json({ success: false, message: error.message })
    }
  },

  async getStaffUsers(req, res) {
    try {
      const users = await userService.getAllUsers()
      const staff = users.filter(u => String(u.role).toUpperCase() === 'STAFF')
      res.json({ success: true, data: staff })
    } catch (error) {
      logger.error('Error in getStaffUsers:', error)
      res.status(500).json({ success: false, message: error.message })
    }
  },

  async lockUser(req, res) {
    try {
      const targetUser = await userService.getUserById(req.params.userId)

      if (!targetUser) {
        return res.status(404).json({
          success: false,
          message: 'Người dùng không tồn tại'
        })
      }

      if (String(req.user.user_id) === String(req.params.userId)) {
        return res.status(403).json({
          success: false,
          message: 'Admin không thể tự khóa tài khoản của chính mình'
        })
      }

      if (String(targetUser.role || '').toUpperCase() === 'ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Không thể khóa tài khoản có vai trò Quản trị viên'
        })
      }

      const result = await userService.lockUser(req.params.userId)
      
      // Log user lock action
      await auditLogService.logActivity(
        req.user.user_id,
        'LOCK',
        'USER',
        req.params.userId,
        { action: 'Khóa tài khoản' },
        auditLogService.resolveEntityLabel('USER')
      );
      
      res.json(result)
    } catch (error) {
      logger.error('Error in lockUser:', error)
      res.status(500).json({ success: false, message: error.message })
    }
  },

  async unlockUser(req, res) {
    try {
      const result = await userService.unlockUser(req.params.userId)
      
      // Log user unlock action
      await auditLogService.logActivity(
        req.user.user_id,
        'UNLOCK',
        'USER',
        req.params.userId,
        { action: 'Mở khóa tài khoản' },
        auditLogService.resolveEntityLabel('USER')
      );
      
      res.json(result)
    } catch (error) {
      logger.error('Error in unlockUser:', error)
      res.status(500).json({ success: false, message: error.message })
    }
  },

  async resetPassword(req, res) {
    try {
      const result = await userService.resetPassword(req.params.userId)
      res.json(result)
    } catch (error) {
      logger.error('Error in resetPassword:', error)
      res.status(500).json({ success: false, message: error.message })
    }
  },

  async changePassword(req, res) {
    try {
      const { oldPassword, newPassword, passwordConfirm } = req.body
      
      if (!oldPassword || !newPassword || !passwordConfirm) {
        return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ thông tin' })
      }

      if (newPassword !== passwordConfirm) {
        return res.status(400).json({ success: false, message: 'Mật khẩu không khớp' })
      }

      const result = await userService.changePassword(req.user.user_id, oldPassword, newPassword)
      res.json(result)
    } catch (error) {
      logger.error('Error in changePassword:', error)
      res.status(400).json({ success: false, message: error.message })
    }
  },

  async deleteUser(req, res) {
    try {
      const result = await userService.deleteUser(req.params.userId)
      res.json(result)
    } catch (error) {
      logger.error('Error in deleteUser:', error)
      res.status(500).json({ success: false, message: error.message })
    }
  },

  async updateUser(req, res) {
    try {
      const { full_name, email, phone } = req.body
      const userId = req.params.userId

      if (!full_name && !email && !phone) {
        return res.status(400).json({ success: false, message: 'Vui lòng cung cấp dữ liệu cập nhật' })
      }

      const updateData = {}
      if (full_name) updateData.full_name = full_name
      if (email) updateData.email = email
      if (phone) updateData.phone = phone

      const result = await userService.updateUser(userId, updateData)
      res.json(result)
    } catch (error) {
      logger.error('Error in updateUser:', error)
      res.status(500).json({ success: false, message: error.message })
    }
  },

  async updateCurrentUserProfile(req, res) {
    try {
      const { full_name, email, phone } = req.body
      const userId = req.user.user_id

      if (!full_name && !email && !phone) {
        return res.status(400).json({ success: false, message: 'Vui lòng cung cấp dữ liệu cập nhật' })
      }

      const updateData = {}
      if (full_name) updateData.full_name = full_name
      if (email) updateData.email = email
      if (phone) updateData.phone = phone

      const result = await userService.updateUser(userId, updateData)
      res.json(result)
    } catch (error) {
      logger.error('Error in updateCurrentUserProfile:', error)
      res.status(500).json({ success: false, message: error.message })
    }
  },

  async updateUserRole(req, res) {
    try {
      const { role } = req.body
      const userId = req.params.userId

      if (!role || !['ADMIN', 'MANAGER', 'STAFF'].includes(role)) {
        return res.status(400).json({ success: false, message: 'Role không hợp lệ' })
      }

      const result = await userService.updateUserRole(userId, role)
      
      // Log role change
      await auditLogService.logActivity(
        req.user.user_id,
        'UPDATE',
        'USER_ROLE',
        userId,
        { newRole: role },
        auditLogService.resolveRoleLabel(role)
      );
      
      res.json(result)
    } catch (error) {
      logger.error('Error in updateUserRole:', error)
      res.status(500).json({ success: false, message: error.message })
    }
  },
}

module.exports = userController
