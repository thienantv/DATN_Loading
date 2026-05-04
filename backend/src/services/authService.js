const bcrypt = require('bcryptjs')
const db = require('../config/database')
const { generateToken } = require('../utils/jwtHelper')
const logger = require('../utils/logger')

const authService = {
  async register(fullName, username, email, password) {
    try {
      // Check if user exists
      const userCheck = await db.query(
        'SELECT * FROM users WHERE username = $1 OR email = $2',
        [username, email]
      )

      if (userCheck.rows.length > 0) {
        throw new Error('Username hoặc email đã tồn tại')
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10)

      // Insert user with STAFF role (role_id = 3)
      const result = await db.query(
        `INSERT INTO users (full_name, username, password_hash, email, role_id, status)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING user_id, full_name, username, email, role_id`,
        [fullName, username, hashedPassword, email, 3, true]
      )

      const user = result.rows[0]
      
      // Get role name
      const roleResult = await db.query(
        'SELECT role_name FROM roles WHERE role_id = $1',
        [user.role_id]
      )
      const roleName = roleResult.rows[0]?.role_name || 'STAFF'

      const token = generateToken({
        user_id: user.user_id,
        username: user.username,
        role_id: user.role_id,
        role: roleName,
      })

      return {
        success: true,
        user: {
          user_id: user.user_id,
          full_name: user.full_name,
          username: user.username,
          email: user.email,
          role: roleName,
        },
        token,
      }
    } catch (error) {
      logger.error('Error in register:', error)
      throw error
    }
  },

  async login(username, password) {
    try {
      const result = await db.query(
        `SELECT u.*, r.role_name
         FROM users u
         LEFT JOIN roles r ON u.role_id = r.role_id
         WHERE u.username = $1`,
        [username]
      )

      if (result.rows.length === 0) {
        throw new Error('Username hoặc mật khẩu không đúng')
      }

      const user = result.rows[0]

      // Check if user is active
      if (!user.status) {
        throw new Error('Tài khoản đã bị khóa')
      }

      // Verify password
      const passwordMatch = await bcrypt.compare(password, user.password_hash)
      if (!passwordMatch) {
        throw new Error('Username hoặc mật khẩu không đúng')
      }

      // Log login
      await db.query(
        'INSERT INTO user_login_logs (user_id, ip_address) VALUES ($1, $2)',
        [user.user_id, '127.0.0.1'] // TODO: Get actual IP
      )

      const token = generateToken({
        user_id: user.user_id,
        username: user.username,
        role_id: user.role_id,
        role: user.role_name,
      })

      return {
        success: true,
        user: {
          user_id: user.user_id,
          full_name: user.full_name,
          username: user.username,
          email: user.email,
          role: user.role_name,
        },
        token,
      }
    } catch (error) {
      logger.error('Error in login:', error)
      throw error
    }
  },

  async refreshToken(userId) {
    try {
      const result = await db.query(
        `SELECT u.*, r.role_name
         FROM users u
         LEFT JOIN roles r ON u.role_id = r.role_id
         WHERE u.user_id = $1 AND u.status = true`,
        [userId]
      )

      if (result.rows.length === 0) {
        throw new Error('User không tồn tại hoặc đã bị khóa')
      }

      const user = result.rows[0]
      const token = generateToken({
        user_id: user.user_id,
        username: user.username,
        role_id: user.role_id,
        role: user.role_name,
      })

      return { token }
    } catch (error) {
      logger.error('Error in refreshToken:', error)
      throw error
    }
  },
}

module.exports = authService
