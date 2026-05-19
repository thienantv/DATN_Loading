const pool = require('../config/database')
const logger = require('../utils/logger')

const notificationController = {
  // Lấy thông báo của người dùng hiện tại
  async getMyNotifications(req, res) {
    try {
      const userId = req.user.user_id

      if (String(req.user?.role || '').toUpperCase() === 'MANAGER') {
        await notificationController.syncOverdueTaskNotifications()
      }

      const result = await pool.query(
        `SELECT 
          notification_id, 
          user_id, 
          title, 
          content, 
          is_read, 
          created_at
         FROM notifications
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 50`,
        [userId]
      )

      // Đếm số thông báo chưa đọc
      const countResult = await pool.query(
        'SELECT COUNT(*) as unread_count FROM notifications WHERE user_id = $1 AND is_read = false',
        [userId]
      )

      res.json({
        success: true,
        data: result.rows,
        unread_count: parseInt(countResult.rows[0].unread_count)
      })
    } catch (error) {
      logger.error('Error in getMyNotifications:', error)
      res.status(500).json({ success: false, message: error.message })
    }
  },

  // Đánh dấu thông báo là đã đọc
  async markAsRead(req, res) {
    try {
      const { notificationId } = req.params
      const userId = req.user.user_id

      // Kiểm tra thông báo có tồn tại và thuộc về người dùng không
      const checkResult = await pool.query(
        'SELECT notification_id FROM notifications WHERE notification_id = $1 AND user_id = $2',
        [notificationId, userId]
      )

      if (checkResult.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Thông báo không tồn tại' })
      }

      const result = await pool.query(
        'UPDATE notifications SET is_read = true WHERE notification_id = $1 RETURNING *',
        [notificationId]
      )

      logger.info(`Notification marked as read: ID ${notificationId}`)
      res.json({
        success: true,
        message: 'Đánh dấu đã đọc thành công',
        data: result.rows[0]
      })
    } catch (error) {
      logger.error('Error in markAsRead:', error)
      res.status(400).json({ success: false, message: error.message })
    }
  },

  // Xóa một thông báo
  async deleteNotification(req, res) {
    try {
      const { notificationId } = req.params
      const userId = req.user.user_id

      // Kiểm tra thông báo có tồn tại và thuộc về người dùng không
      const checkResult = await pool.query(
        'SELECT notification_id FROM notifications WHERE notification_id = $1 AND user_id = $2',
        [notificationId, userId]
      )

      if (checkResult.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Thông báo không tồn tại' })
      }

      await pool.query('DELETE FROM notifications WHERE notification_id = $1', [notificationId])

      logger.info(`Notification deleted: ID ${notificationId}`)
      res.json({ success: true, message: 'Xóa thông báo thành công' })
    } catch (error) {
      logger.error('Error in deleteNotification:', error)
      res.status(500).json({ success: false, message: error.message })
    }
  },

  // Xóa toàn bộ thông báo của người dùng
  async deleteAllNotifications(req, res) {
    try {
      const userId = req.user.user_id

      const result = await pool.query(
        'DELETE FROM notifications WHERE user_id = $1 RETURNING notification_id',
        [userId]
      )

      logger.info(`All notifications deleted for user ${userId}`)
      res.json({ success: true, message: 'Xóa tất cả thông báo thành công', deleted_count: result.rows.length })
    } catch (error) {
      logger.error('Error in deleteAllNotifications:', error)
      res.status(500).json({ success: false, message: error.message })
    }
  },

  // Tạo thông báo (chỉ dùng nội bộ - không mở qua API)
  async createNotification(userId, title, content) {
    try {
      const existingResult = await pool.query(
        'SELECT notification_id, user_id, title, content, is_read, created_at FROM notifications WHERE user_id = $1 AND title = $2 AND content = $3 LIMIT 1',
        [userId, title, content]
      )

      if (existingResult.rows.length > 0) {
        return existingResult.rows[0]
      }

      const result = await pool.query(
        'INSERT INTO notifications (user_id, title, content) VALUES ($1, $2, $3) RETURNING *',
        [userId, title, content]
      )
      logger.info(`Notification created for user ${userId}: ${title}`)
      return result.rows[0]
    } catch (error) {
      logger.error('Error in createNotification:', error)
      throw error
    }
  },

  // Tạo hàng loạt thông báo cho nhiều người dùng
  async notifyMultipleUsers(userIds, title, content) {
    try {
      const results = []
      for (const userId of userIds) {
        const result = await this.createNotification(userId, title, content)
        results.push(result)
      }
      return results
    } catch (error) {
      logger.error('Error in notifyMultipleUsers:', error)
      throw error
    }
  },

  async getManagerUserIds() {
    try {
      const result = await pool.query(
        `SELECT u.user_id
         FROM users u
         LEFT JOIN roles r ON u.role_id = r.role_id
         WHERE UPPER(r.role_name) = 'MANAGER' AND COALESCE(u.status, true) = true
         ORDER BY u.user_id ASC`
      )
      return result.rows.map((row) => row.user_id)
    } catch (error) {
      logger.error('Error in getManagerUserIds:', error)
      return []
    }
  },

    async getTechnicianUserIdsByFarm(farmId) {
      try {
        if (!farmId) {
          // fallback: return all technicians
          const res = await pool.query(
            `SELECT u.user_id FROM users u LEFT JOIN roles r ON u.role_id = r.role_id WHERE UPPER(r.role_name) = 'TECHNICIAN' AND COALESCE(u.status, true) = true ORDER BY u.user_id ASC`
          )
          return res.rows.map((r) => r.user_id)
        }

        const result = await pool.query(
          `SELECT u.user_id FROM users u LEFT JOIN roles r ON u.role_id = r.role_id WHERE UPPER(r.role_name) = 'TECHNICIAN' AND COALESCE(u.status, true) = true AND u.farm_id = $1 ORDER BY u.user_id ASC`,
          [farmId]
        )
        return result.rows.map((row) => row.user_id)
      } catch (error) {
        logger.error('Error in getTechnicianUserIdsByFarm:', error)
        return []
      }
    },

    async notifyTechnicians(title, content, farmId) {
      try {
        const techIds = await this.getTechnicianUserIdsByFarm(farmId)
        if (techIds.length === 0) return []
        return await this.notifyMultipleUsers(techIds, title, content)
      } catch (error) {
        logger.error('Error in notifyTechnicians:', error)
        throw error
      }
    },

  async notifyManagers(title, content) {
    try {
      const managerIds = await this.getManagerUserIds()
      if (managerIds.length === 0) return []
      return await this.notifyMultipleUsers(managerIds, title, content)
    } catch (error) {
      logger.error('Error in notifyManagers:', error)
      throw error
    }
  },

  async syncOverdueTaskNotifications() {
    try {
      const overdueTasks = await pool.query(
        `SELECT t.task_id, t.task_title, t.due_date, t.status, p.pond_code, p.pond_name
         FROM tasks t
         LEFT JOIN ponds p ON t.pond_id = p.pond_id
         WHERE t.due_date < CURRENT_DATE
           AND COALESCE(UPPER(t.status), 'PENDING') <> 'COMPLETED'
         ORDER BY t.due_date ASC, t.task_id ASC`
      )

      const created = []
      for (const task of overdueTasks.rows) {
        const pondLabel = task.pond_code || task.pond_name || 'không xác định'
        const title = 'Cảnh báo task trễ hạn'
        const content = `Task "${task.task_title}" đã trễ hạn ở ao ${pondLabel}`
        const notifications = await this.notifyManagers(title, content)
        created.push(...notifications)
      }

      return created
    } catch (error) {
      logger.error('Error in syncOverdueTaskNotifications:', error)
      return []
    }
  },
}

module.exports = notificationController
