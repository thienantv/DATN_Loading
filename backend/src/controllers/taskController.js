const pool = require('../config/database')
const logger = require('../utils/logger')

const taskController = {
  // Get all tasks (accessible by MANAGER and WORKER)
  async getAllTasks(req, res) {
    try {
      const userId = req.user.user_id
      const role = String(req.user.role || '').toUpperCase()
      const farmId = req.user.farm_id

      const baseQuery = `SELECT 
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
         LEFT JOIN ponds p ON t.pond_id = p.pond_id`

      let query = baseQuery
      let params = []

      if (role === 'WORKER') {
        query += ' WHERE t.assigned_to = $1'
        params.push(userId)
      } else if (role === 'OWNER' && farmId) {
        query += ' WHERE p.farm_id = $1'
        params.push(farmId)
      }
      // ADMIN and others can see all tasks

      query += ' ORDER BY t.due_date ASC, t.created_at DESC'

      const result = params.length > 0
        ? await pool.query(query, params)
        : await pool.query(query)

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

      if (season_id) {
        const seasonCheck = await pool.query(
          'SELECT season_id, pond_id FROM seasons WHERE season_id = $1',
          [season_id]
        )
        if (seasonCheck.rows.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'Mùa vụ không tồn tại'
          })
        }

        if (Number(seasonCheck.rows[0].pond_id) !== Number(pond_id)) {
          return res.status(400).json({
            success: false,
            message: 'Mùa vụ phải thuộc đúng ao đã chọn'
          })
        }
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

      if (String(userCheck.rows[0].role_name).toUpperCase() !== 'WORKER') {
        return res.status(400).json({
          success: false,
          message: 'Công việc chỉ được giao cho Nhân viên (WORKER)'
        })
      }

      // Find smallest missing positive task_id (fill gaps) similar to user_id behavior
      const nextIdRes = await pool.query(
        `SELECT MIN(gs.id) AS next_id
         FROM generate_series(1, COALESCE((SELECT MAX(task_id) FROM tasks), 0) + 1) gs(id)
         LEFT JOIN tasks t ON t.task_id = gs.id
         WHERE t.task_id IS NULL`
      )
      const nextId = nextIdRes.rows[0].next_id || 1

      const result = await pool.query(
        `INSERT INTO tasks (task_id, season_id, pond_id, task_title, description, assigned_to, assigned_by, due_date, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'PENDING')
         RETURNING task_id, season_id, pond_id, task_title, description, assigned_to, assigned_by, due_date, status, created_at`,
        [nextId, season_id || null, pond_id, task_title, description || null, assigned_to, assignedBy, due_date]
      )

      // Ensure the sequence for task_id is at least at the current max to avoid conflicts
      try {
        const seqRes = await pool.query(`SELECT pg_get_serial_sequence('tasks','task_id') AS seq`)
        const seqName = seqRes.rows[0] && seqRes.rows[0].seq
        if (seqName) {
          await pool.query(`SELECT setval('${seqName}', (SELECT COALESCE(MAX(task_id),0) FROM tasks))`)
        }
      } catch (seqErr) {
        logger.warn('Failed to update tasks task_id sequence:', seqErr.message)
      }

      logger.info(`Task created: ${task_title} assigned to user ${assigned_to} with task_id ${nextId}`)
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

  // Get tasks assigned to current user (WORKER only)
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
      const role = String(req.user.role || '').toUpperCase()
      const userId = req.user.user_id

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

      if (role === 'WORKER' && Number(result.rows[0].assigned_to) !== Number(userId)) {
        return res.status(403).json({
          success: false,
          message: 'Bạn chỉ có thể xem công việc được giao cho mình',
        })
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
      const { task_title, description, assigned_to, due_date, pond_id, season_id } = req.body

      // Check if task exists
      const checkResult = await pool.query(
        'SELECT task_id, pond_id, season_id FROM tasks WHERE task_id = $1',
        [taskId]
      )
      if (checkResult.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Công việc không tồn tại' })
      }

      const currentTask = checkResult.rows[0]
      const finalPondId = pond_id || currentTask.pond_id
      const finalSeasonId = season_id !== undefined ? season_id : currentTask.season_id

      if (finalSeasonId) {
        const seasonCheck = await pool.query(
          'SELECT season_id, pond_id FROM seasons WHERE season_id = $1',
          [finalSeasonId]
        )
        if (seasonCheck.rows.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'Mùa vụ không tồn tại'
          })
        }

        if (Number(seasonCheck.rows[0].pond_id) !== Number(finalPondId)) {
          return res.status(400).json({
            success: false,
            message: 'Mùa vụ phải thuộc đúng ao đã chọn'
          })
        }
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
      if (season_id !== undefined) {
        updates.push(`season_id = $${paramCount++}`)
        values.push(season_id || null)
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
        if (String(userCheck.rows[0].role_name).toUpperCase() !== 'WORKER') {
          return res.status(400).json({
            success: false,
            message: 'Công việc chỉ được giao cho Công nhân (WORKER)'
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

  // Update task status (WORKER can update own tasks)
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

      // WORKER can only update their own tasks
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
      const { imageUrl } = req.body
      const role = String(req.user.role || '').toUpperCase()
      const userId = req.user.user_id

      if (!imageUrl) {
        return res.status(400).json({
          success: false,
          message: 'Image URL là bắt buộc'
        })
      }

      // Check if task exists
      const checkResult = await pool.query(
        'SELECT task_id, assigned_to FROM tasks WHERE task_id = $1',
        [taskId]
      )
      if (checkResult.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Công việc không tồn tại' })
      }

      // WORKER chỉ được upload ảnh cho task được giao cho chính mình.
      if (role === 'WORKER' && Number(checkResult.rows[0].assigned_to) !== Number(userId)) {
        return res.status(403).json({
          success: false,
          message: 'Bạn chỉ có thể upload ảnh cho công việc của mình',
        })
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
