const authService = require('../services/authService')
const logger = require('../utils/logger')

const authController = {
  async register(req, res) {
    try {
      const { fullName, username, email, password, passwordConfirm } = req.body

      if (!fullName || !username || !email || !password || !passwordConfirm) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng điền đầy đủ thông tin',
        })
      }

      if (password !== passwordConfirm) {
        return res.status(400).json({
          success: false,
          message: 'Mật khẩu không khớp',
        })
      }

      const result = await authService.register(fullName, username, email, password)

      res.status(201).json(result)
    } catch (error) {
      logger.error('Register error:', error)
      res.status(400).json({
        success: false,
        message: error.message || 'Lỗi đăng ký',
      })
    }
  },

  async login(req, res) {
    try {
      const { username, password } = req.body

      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng nhập username và mật khẩu',
        })
      }

      const result = await authService.login(username, password)
      res.json(result)
    } catch (error) {
      logger.error('Login error:', error)
      res.status(401).json({
        success: false,
        message: error.message || 'Lỗi đăng nhập',
      })
    }
  },

  async refreshToken(req, res) {
    try {
      const userId = req.user.user_id
      const result = await authService.refreshToken(userId)
      res.json({
        success: true,
        ...result,
      })
    } catch (error) {
      logger.error('Refresh token error:', error)
      res.status(401).json({
        success: false,
        message: error.message || 'Lỗi làm mới token',
      })
    }
  },

  async changePassword(req, res) {
    try {
      const { oldPassword, newPassword } = req.body
      const userId = req.user.user_id

      if (!oldPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp mật khẩu cũ và mật khẩu mới',
        })
      }

      const result = await authService.changePassword(userId, oldPassword, newPassword)
      res.json(result)
    } catch (error) {
      logger.error('Change password error:', error)
      res.status(400).json({
        success: false,
        message: error.message || 'Lỗi đổi mật khẩu',
      })
    }
  },
}

module.exports = authController
