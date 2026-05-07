const pool = require('../config/database')
const logger = require('../utils/logger')

const taskController = {
  // Get all tasks (accessible by MANAGER and STAFF)
  async getAllTasks(req, res) {
    try {
      const result = await pool.query(
        `SELECT 
          t.task_id, 
          t.season_id, 
          t.pond_id,
          p.pond_code,
          p.pond_name,
          t.task_title, 
          t.description,
          t.assigned_to, 
          u.full_name as assigned_to_name,
          t.assigned_by,
          u2.full_name as assigned_by_name,
          t.due_date, 
          t.status, 
          t.created_at
         FROM tasks t
         LEFT JOIN users u ON t.assigned_to = u.user_id
         LEFT JOIN users u2 ON t.assigned_by = u2.user_id
         LEFT JOIN ponds p ON t.pond_id = p.pond_id
         ORDER BY t.created_at DESC`
      )
      res.json({ success: true, data: result.rows })
    } catch (error) {
      logger.error('Error in getAllTasks:', error)
      res.status(500).json({ success: false, message: error.message })
    }
  },

  // Create new task (MANAGER only)
  async createTask(req, res) {
    try {
      const { season_id, pond_id, task_title, description, assigned_to, due_date } = req.body
      const assignedBy = req.user.user_id // From JWT token

      // Validate required fields
      if (!task_title || !assigned_to || !due_date || !pond_id) {
        return res.status(400).json({
          success: false,
          message: 'Tiêu đề, ao nuôi, người được giao, và hạn chót là bắt buộc'
        })
      }

      // Verify that pond exists
      const pondCheck = await pool.query(
        'SELECT pond_id FROM ponds WHERE pond_id = $1',
        [pond_id]
      )
      if (pondCheck.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Ao nuôi không tồn tại'
        })
      }

      // Verify that assigned_to user exists
      const userCheck = await pool.query(
        `SELECT u.user_id, r.role_name
         FROM users u
         LEFT JOIN roles r ON u.role_id = r.role_id
         WHERE u.user_id = $1`,
        [assigned_to]
      )
      if (userCheck.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Người được giao không tồn tại'
        })
      }

      if (String(userCheck.rows[0].role_name).toUpperCase() !== 'STAFF') {
        return res.status(400).json({
          success: false,
          message: 'Công việc chỉ được giao cho Nhân viên (STAFF)'
        })
      }

      const result = await pool.query(
        `INSERT INTO tasks (season_id, pond_id, task_title, description, assigned_to, assigned_by, due_date, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING')
         RETURNING task_id, season_id, pond_id, task_title, description, assigned_to, assigned_by, due_date, status, created_at`,
        [season_id || null, pond_id, task_title, description || null, assigned_to, assignedBy, due_date]
      )

      logger.info(`Task created: ${task_title} assigned to user ${assigned_to}`)
      res.status(201).json({
        success: true,
        message: 'Tạo công việc thành công',
        data: result.rows[0]
      })
    } catch (error) {
      logger.error('Error in createTask:', error)
      res.status(400).json({ success: false, message: error.message })
    }
  },

  // Get tasks assigned to current user (STAFF only)
  async getMyTasks(req, res) {
    try {
      const userId = req.user.user_id

      const result = await pool.query(
        `SELECT 
          t.task_id, 
          t.season_id, 
          t.pond_id,
          p.pond_code,
          p.pond_name,
          t.task_title, 
          t.description,
          t.assigned_to,
          t.assigned_by,
          u.full_name as assigned_by_name,
          t.due_date, 
          t.status, 
          t.created_at
         FROM tasks t
         LEFT JOIN users u ON t.assigned_by = u.user_id
         LEFT JOIN ponds p ON t.pond_id = p.pond_id
         WHERE t.assigned_to = $1
         ORDER BY t.due_date ASC`,
        [userId]
      )

      res.json({ success: true, data: result.rows })
    } catch (error) {
      logger.error('Error in getMyTasks:', error)
      res.status(500).json({ success: false, message: error.message })
    }
  },

  // Get task detail
  async getTaskDetail(req, res) {
    try {
      const { taskId } = req.params

      const result = await pool.query(
        `SELECT 
          t.task_id, 
          t.season_id, 
          s.season_name,
          t.pond_id,
          p.pond_code,
          p.pond_name,
          t.task_title, 
          t.description,
          t.assigned_to, 
          u.full_name as assigned_to_name,
          t.assigned_by,
          u2.full_name as assigned_by_name,
          t.due_date, 
          t.status, 
          t.created_at
         FROM tasks t
         LEFT JOIN seasons s ON t.season_id = s.season_id
         LEFT JOIN ponds p ON t.pond_id = p.pond_id
         LEFT JOIN users u ON t.assigned_to = u.user_id
         LEFT JOIN users u2 ON t.assigned_by = u2.user_id
         WHERE t.task_id = $1`,
        [taskId]
      )

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Công việc không tồn tại' })
      }

      const imagesResult = await pool.query(
        `SELECT image_id, task_id, image_url, uploaded_at
         FROM task_images
         WHERE task_id = $1
         ORDER BY uploaded_at DESC`,
        [taskId]
      )

      res.json({
        success: true,
        data: {
          ...result.rows[0],
          images: imagesResult.rows || []
        }
      })
    } catch (error) {
      logger.error('Error in getTaskDetail:', error)
      res.status(500).json({ success: false, message: error.message })
    }
  },

  // Update task (MANAGER only)
  async updateTask(req, res) {
    try {
      const { taskId } = req.params
      const { task_title, description, assigned_to, due_date, pond_id } = req.body

      // Check if task exists
      const checkResult = await pool.query(
        'SELECT task_id FROM tasks WHERE task_id = $1',
        [taskId]
      )
      if (checkResult.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Công việc không tồn tại' })
      }

      // Build update query
      const updates = []
      const values = []
      let paramCount = 1

      if (task_title) {
        updates.push(`task_title = $${paramCount++}`)
        values.push(task_title)
      }
      if (description) {
        updates.push(`description = $${paramCount++}`)
        values.push(description)
      }
      if (pond_id) {
        // Verify pond exists
        const pondCheck = await pool.query(
          'SELECT pond_id FROM ponds WHERE pond_id = $1',
          [pond_id]
        )
        if (pondCheck.rows.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'Ao nuôi không tồn tại'
          })
        }
        updates.push(`pond_id = $${paramCount++}`)
        values.push(pond_id)
      }
      if (assigned_to) {
        // Verify user exists
        const userCheck = await pool.query(
          `SELECT u.user_id, r.role_name
           FROM users u
           LEFT JOIN roles r ON u.role_id = r.role_id
           WHERE u.user_id = $1`,
          [assigned_to]
        )
        if (userCheck.rows.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'Người được giao không tồn tại'
          })
        }
        if (String(userCheck.rows[0].role_name).toUpperCase() !== 'STAFF') {
          return res.status(400).json({
            success: false,
            message: 'Công việc chỉ được giao cho Nhân viên (STAFF)'
          })
        }
        updates.push(`assigned_to = $${paramCount++}`)
        values.push(assigned_to)
      }
      if (due_date) {
        updates.push(`due_date = $${paramCount++}`)
        values.push(due_date)
      }

      if (updates.length === 0) {
        return res.status(400).json({ success: false, message: 'Không có trường nào để cập nhật' })
      }

      values.push(taskId)
      const query = `UPDATE tasks SET ${updates.join(', ')} WHERE task_id = $${paramCount} RETURNING *`

      const result = await pool.query(query, values)
      logger.info(`Task updated: ID ${taskId}`)
      res.json({
        success: true,
        message: 'Cập nhật công việc thành công',
        data: result.rows[0]
      })
    } catch (error) {
      logger.error('Error in updateTask:', error)
      res.status(400).json({ success: false, message: error.message })
    }
  },

  // Update task status (STAFF can update own tasks)
  async updateTaskStatus(req, res) {
    try {
      const { taskId } = req.params
      const { status } = req.body
      const userId = req.user.user_id

      // Validate status
      const validStatuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED']
      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Trạng thái không hợp lệ. Chỉ hỗ trợ: PENDING, IN_PROGRESS, COMPLETED'
        })
      }

      // Check if task exists and is assigned to current user
      const checkResult = await pool.query(
        'SELECT task_id, assigned_to FROM tasks WHERE task_id = $1',
        [taskId]
      )
      if (checkResult.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Công việc không tồn tại' })
      }

      // STAFF can only update their own tasks
      if (req.user.role !== 'ADMIN' && req.user.role !== 'MANAGER') {
        if (checkResult.rows[0].assigned_to !== userId) {
          return res.status(403).json({
            success: false,
            message: 'Bạn chỉ có thể cập nhật công việc được giao cho mình'
          })
        }
      }

      const result = await pool.query(
        'UPDATE tasks SET status = $1 WHERE task_id = $2 RETURNING *',
        [status, taskId]
      )

      logger.info(`Task status updated: ID ${taskId}, new status: ${status}`)
      res.json({
        success: true,
        message: 'Cập nhật trạng thái công việc thành công',
        data: result.rows[0]
      })
    } catch (error) {
      logger.error('Error in updateTaskStatus:', error)
      res.status(400).json({ success: false, message: error.message })
    }
  },

  // Delete task (MANAGER only)
  async deleteTask(req, res) {
    try {
      const { taskId } = req.params

      // Check if task exists
      const checkResult = await pool.query(
        'SELECT task_id FROM tasks WHERE task_id = $1',
        [taskId]
      )
      if (checkResult.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Công việc không tồn tại' })
      }

      await pool.query('DELETE FROM tasks WHERE task_id = $1', [taskId])
      logger.info(`Task deleted: ID ${taskId}`)
      res.json({ success: true, message: 'Xóa công việc thành công' })
    } catch (error) {
      logger.error('Error in deleteTask:', error)
      res.status(500).json({ success: false, message: error.message })
    }
  },

  // Upload task completion image
  async uploadTaskImage(req, res) {
    try {
      const { taskId } = req.params
      // This is a placeholder for image upload
      // In production, use multer or similar for file upload handling
      const { imageUrl } = req.body

      if (!imageUrl) {
        return res.status(400).json({
          success: false,
          message: 'Image URL là bắt buộc'
        })
      }

      // Check if task exists
      const checkResult = await pool.query(
        'SELECT task_id FROM tasks WHERE task_id = $1',
        [taskId]
      )
      if (checkResult.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Công việc không tồn tại' })
      }

      // Insert task image
      const result = await pool.query(
        'INSERT INTO task_images (task_id, image_url) VALUES ($1, $2) RETURNING *',
        [taskId, imageUrl]
      )

      logger.info(`Task image uploaded for task ID ${taskId}`)
      res.status(201).json({
        success: true,
        message: 'Upload hình ảnh thành công',
        data: result.rows[0]
      })
    } catch (error) {
      logger.error('Error in uploadTaskImage:', error)
      res.status(400).json({ success: false, message: error.message })
    }
  },
}

module.exports = taskController
