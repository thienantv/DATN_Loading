const authService = require('../services/authService')
const logger = require('../utils/logger')
const auditLogService = require('../services/auditLogService')

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
      
      // Log successful login
      if (result.success && result.user) {
        await auditLogService.logActivity(
          result.user.user_id,
          'LOGIN',
          'USER',
          result.user.user_id,
          { username, timestamp: new Date().toISOString() },
          auditLogService.resolveEntityLabel('USER')
        )
      }
      
      res.json(result)
    } catch (error) {
      logger.error('Login error:', error)
      
      // Log failed login attempt
      try {
        const pool = require('../config/database')
        const userResult = await pool.query('SELECT user_id FROM users WHERE username = $1', [username])
        if (userResult.rows.length > 0) {
          await auditLogService.logActivity(
            userResult.rows[0].user_id,
            'LOGIN_FAILED',
            'USER',
            userResult.rows[0].user_id,
            { username, reason: error.message, timestamp: new Date().toISOString() },
            auditLogService.resolveEntityLabel('USER')
          )
        }
      } catch (auditError) {
        logger.error('Error logging failed login:', auditError)
      }
      
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
