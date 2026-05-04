const userService = require('../services/userService')
const logger = require('../utils/logger')

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

  async lockUser(req, res) {
    try {
      const result = await userService.lockUser(req.params.userId)
      res.json(result)
    } catch (error) {
      logger.error('Error in lockUser:', error)
      res.status(500).json({ success: false, message: error.message })
    }
  },

  async unlockUser(req, res) {
    try {
      const result = await userService.unlockUser(req.params.userId)
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
      const { full_name, email } = req.body
      const userId = req.params.userId

      if (!full_name && !email) {
        return res.status(400).json({ success: false, message: 'Vui lòng cung cấp dữ liệu cập nhật' })
      }

      const result = await userService.updateUser(userId, { full_name, email })
      res.json(result)
    } catch (error) {
      logger.error('Error in updateUser:', error)
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
      res.json(result)
    } catch (error) {
      logger.error('Error in updateUserRole:', error)
      res.status(500).json({ success: false, message: error.message })
    }
  },
}

module.exports = userController
