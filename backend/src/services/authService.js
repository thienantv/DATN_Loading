const bcrypt = require('bcryptjs')
const db = require('../config/database')
const { generateToken } = require('../utils/jwtHelper')
const logger = require('../utils/logger')

const authService = {
  async register(fullName, username, email, password, farmName) {
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

      // Determine OWNER role_id from seeded roles
      const roleResult = await db.query('SELECT role_id FROM roles WHERE role_name = $1', ['OWNER'])
      if (roleResult.rows.length === 0) {
        throw new Error('Role OWNER chưa được cấu hình trong hệ thống')
      }
      const ownerRoleId = roleResult.rows[0].role_id

      const client = await db.connect()
      let user
      try {
        await client.query('BEGIN')

        // Insert user with OWNER role by default
        const userResult = await client.query(
          `INSERT INTO users (full_name, username, password_hash, email, role_id, status)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING user_id, full_name, username, email, role_id, farm_id`,
          [fullName, username, hashedPassword, email, ownerRoleId, true]
        )
        user = userResult.rows[0]

        // Auto-create farm for the new OWNER and bind this OWNER to that farm
        const safeCodeBase = String(username || '')
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, '')
          .slice(0, 8) || 'OWNER'
        const generatedFarmCode = `FARM-${safeCodeBase}-${Date.now().toString().slice(-6)}`
        const resolvedFarmName = String(farmName || '').trim() || `Trai cua ${fullName}`

        const farmResult = await client.query(
          `INSERT INTO farms (farm_code, farm_name, owner_user_id, status)
           VALUES ($1, $2, $3, $4)
           RETURNING farm_id`,
          [generatedFarmCode, resolvedFarmName, user.user_id, 'ACTIVE']
        )

        const farmId = farmResult.rows[0].farm_id

        const updatedUserResult = await client.query(
          `UPDATE users
           SET farm_id = $1
           WHERE user_id = $2
           RETURNING user_id, full_name, username, email, role_id, farm_id`,
          [farmId, user.user_id]
        )

        user = updatedUserResult.rows[0]
        await client.query('COMMIT')
      } catch (transactionError) {
        await client.query('ROLLBACK')
        throw transactionError
      } finally {
        client.release()
      }
      
      // Get role name
      const roleNameResult = await db.query(
        'SELECT role_name FROM roles WHERE role_id = $1',
        [user.role_id]
      )
      const roleName = roleNameResult.rows[0]?.role_name || 'WORKER'

      const token = generateToken({
        user_id: user.user_id,
        username: user.username,
        role_id: user.role_id,
        role: roleName,
        farm_id: user.farm_id,
      })

      return {
        success: true,
        user: {
          user_id: user.user_id,
          full_name: user.full_name,
          username: user.username,
          email: user.email,
          role: roleName,
          farm_id: user.farm_id,
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
      const nextLogIdResult = await db.query(`
        SELECT COALESCE(MIN(t1.log_id) + 1, 1) AS next_log_id
        FROM user_login_logs t1
        WHERE NOT EXISTS (
          SELECT 1
          FROM user_login_logs t2
          WHERE t2.log_id = t1.log_id + 1
        )
      `)

      const nextLogId = nextLogIdResult.rows[0]?.next_log_id || 1

      await db.query(
        'INSERT INTO user_login_logs (log_id, user_id, ip_address) VALUES ($1, $2, $3)',
        [nextLogId, user.user_id, '127.0.0.1'] // TODO: Get actual IP
      )

      await db.query(
        `SELECT setval(
          'user_login_logs_log_id_seq',
          (SELECT COALESCE(MAX(log_id), 1) FROM user_login_logs),
          true
        )`
      )

      const token = generateToken({
        user_id: user.user_id,
        username: user.username,
        role_id: user.role_id,
        role: user.role_name,
        farm_id: user.farm_id,
      })

      return {
        success: true,
        user: {
          user_id: user.user_id,
          full_name: user.full_name,
          username: user.username,
          email: user.email,
          role: user.role_name,
          farm_id: user.farm_id,
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
        farm_id: user.farm_id,
      })

      return { token }
    } catch (error) {
      logger.error('Error in refreshToken:', error)
      throw error
    }
  },

  async changePassword(userId, oldPassword, newPassword) {
    try {
      // Get user with password hash
      const userResult = await db.query(
        'SELECT user_id, password_hash FROM users WHERE user_id = $1 AND status = true',
        [userId]
      )

      if (userResult.rows.length === 0) {
        throw new Error('User không tồn tại hoặc đã bị khóa')
      }

      const user = userResult.rows[0]

      // Verify old password
      const isPasswordValid = await bcrypt.compare(oldPassword, user.password_hash)
      if (!isPasswordValid) {
        throw new Error('Mật khẩu hiện tại không đúng')
      }

      // Hash new password
      const hashedNewPassword = await bcrypt.hash(newPassword, 10)

      // Update password
      await db.query(
        'UPDATE users SET password_hash = $1 WHERE user_id = $2',
        [hashedNewPassword, userId]
      )

      return {
        success: true,
        message: 'Đã đổi mật khẩu thành công'
      }
    } catch (error) {
      logger.error('Error in changePassword:', error)
      throw error
    }
  },
}

module.exports = authService
