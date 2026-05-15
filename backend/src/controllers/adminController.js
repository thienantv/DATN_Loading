const pool = require('../config/database');
const logger = require('../utils/logger');
const bcrypt = require('bcryptjs');
const auditLogService = require('../services/auditLogService');

const adminController = {
  // Get all users (Admin only)
  async getAllUsers(req, res) {
    try {
      const isOwner = String(req.user.role || '').toUpperCase() === 'OWNER';
      const baseQuery = `
        SELECT 
          u.user_id, 
          u.username, 
          u.email, 
          u.full_name, 
          COALESCE(u.phone, '') as phone,
          u.status, 
          COALESCE(r.role_name, 'UNKNOWN') as role_name, 
          u.created_at, 
          u.role_id,
          u.farm_id
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.role_id
      `;

      const result = isOwner
        ? await pool.query(
            `${baseQuery}
             WHERE u.farm_id = (SELECT farm_id FROM users WHERE user_id = $1)
             ORDER BY u.user_id ASC`,
            [req.user.user_id]
          )
        : await pool.query(`${baseQuery} ORDER BY u.user_id ASC`);
      
      const users = result.rows.map(user => ({
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        phone: user.phone,
        role: user.role_name,
        role_id: user.role_id,
        farm_id: user.farm_id,
        status: user.status,
        created_at: user.created_at
      }));

      res.json({ success: true, data: users });
    } catch (error) {
      logger.error('Error in getAllUsers:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Create new user (Admin only)
  async createUser(req, res) {
    try {
      const { username, email, fullName, role, password, phone, farmId } = req.body;

      // Validate input
      if (!username || !email || !fullName || !password) {
        return res.status(400).json({ success: false, message: 'Vui lòng cung cấp đầy đủ thông tin' });
      }

      // Check if username already exists
      const userExists = await pool.query('SELECT user_id FROM users WHERE username = $1', [username]);
      if (userExists.rows.length > 0) {
        return res.status(400).json({ success: false, message: 'Tên đăng nhập đã tồn tại' });
      }

      // Get role_id from role_name
      const roleResult = await pool.query('SELECT role_id FROM roles WHERE role_name = $1', [role || 'WORKER']);
      if (roleResult.rows.length === 0) {
        return res.status(400).json({ success: false, message: 'Invalid role' });
      }
      const roleId = roleResult.rows[0].role_id;
      const targetRole = String(role || 'WORKER').toUpperCase();

      const creatorRole = String(req.user.role || '').toUpperCase();
      let assignedFarmId = farmId || null;

      // ADMIN can create all users except ADMIN role
      if (creatorRole === 'ADMIN') {
        if (targetRole === 'ADMIN') {
          return res.status(403).json({ success: false, message: 'Chỉ có ADMIN khác mới có thể tạo tài khoản ADMIN' });
        }
        assignedFarmId = farmId || null;
      }
      // OWNER can only create non-admin/non-owner users and force same farm
      else if (creatorRole === 'OWNER') {
        if (targetRole === 'ADMIN' || targetRole === 'OWNER') {
          return res.status(403).json({ success: false, message: 'OWNER không thể tạo tài khoản ADMIN/OWNER' });
        }

        const ownerFarmResult = await pool.query('SELECT farm_id FROM users WHERE user_id = $1', [req.user.user_id]);
        assignedFarmId = ownerFarmResult.rows[0]?.farm_id || null;
        if (!assignedFarmId) {
          return res.status(400).json({ success: false, message: 'OWNER chưa được gán vào trại nuôi nào' });
        }
      }

      // Find the first available user_id (gap filling)
      const gapResult = await pool.query(`
        SELECT user_id FROM users ORDER BY user_id ASC
      `);
      
      let nextUserId = 1;
      const existingIds = gapResult.rows.map(row => Number(row.user_id));
      
      // Find first available gap
      for (let i = 1; i <= existingIds.length + 1; i++) {
        if (!existingIds.includes(i)) {
          nextUserId = i;
          break;
        }
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert user with specific user_id
      const result = await pool.query(`
        INSERT INTO users (user_id, username, email, full_name, phone, role_id, password_hash, status, farm_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, $8)
        RETURNING user_id, username, email, full_name, phone, role_id, farm_id
      `, [nextUserId, username, email, fullName, phone || null, roleId, hashedPassword, assignedFarmId]);

      // Update the sequence to ensure next auto-increment works correctly
      await pool.query(`SELECT setval('users_user_id_seq', (SELECT MAX(user_id) FROM users), true)`);

      // Log user creation
      await auditLogService.logActivity(
        req.user.user_id,
        'CREATE',
        'USER',
        result.rows[0].user_id,
        { username, email, fullName, role, phone },
        auditLogService.resolveRoleLabel(role || 'WORKER')
      );

      res.status(201).json({
        success: true,
        message: 'Tạo user thành công',
        data: result.rows[0]
      });
    } catch (error) {
      logger.error('Error in createUser:', error);
      res.status(400).json({ success: false, message: error.message });
    }
  },

  // Lock user account (Admin only, cannot lock ADMIN role users)
  async lockUser(req, res) {
    try {
      const { userId } = req.params;

      // Get user's role
      const userResult = await pool.query(
        `SELECT u.role_id, r.role_name FROM users u LEFT JOIN roles r ON u.role_id = r.role_id WHERE u.user_id = $1`,
        [userId]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Người dùng không tồn tại' });
      }

      const userRole = userResult.rows[0].role_name;

      // Prevent locking ADMIN role users
      if (userRole === 'ADMIN') {
        return res.status(403).json({ success: false, message: 'Không thể khóa tài khoản ADMIN' });
      }

      // Lock the user
      await pool.query('UPDATE users SET status = FALSE WHERE user_id = $1', [userId]);

      // Log activity
      await auditLogService.logActivity(
        req.user.user_id,
        'LOCK',
        'USER',
        userId,
        { action: 'lock_account', timestamp: new Date().toISOString() },
        'Người dùng'
      );

      res.json({ success: true, message: 'Khóa tài khoản thành công' });
    } catch (error) {
      logger.error('Error in lockUser:', error);
      res.status(400).json({ success: false, message: error.message });
    }
  },

  // Unlock user account (Admin only, cannot unlock ADMIN role users)
  async unlockUser(req, res) {
    try {
      const { userId } = req.params;

      // Get user's role
      const userResult = await pool.query(
        `SELECT u.role_id, r.role_name FROM users u LEFT JOIN roles r ON u.role_id = r.role_id WHERE u.user_id = $1`,
        [userId]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Người dùng không tồn tại' });
      }

      const userRole = userResult.rows[0].role_name;

      // Prevent unlocking ADMIN role users (they should never be locked)
      if (userRole === 'ADMIN') {
        return res.status(403).json({ success: false, message: 'Không thể mở khóa tài khoản ADMIN' });
      }

      // Unlock the user
      await pool.query('UPDATE users SET status = TRUE WHERE user_id = $1', [userId]);

      // Log activity
      await auditLogService.logActivity(
        req.user.user_id,
        'UNLOCK',
        'USER',
        userId,
        { action: 'unlock_account', timestamp: new Date().toISOString() },
        'Người dùng'
      );

      res.json({ success: true, message: 'Mở khóa tài khoản thành công' });
    } catch (error) {
      logger.error('Error in unlockUser:', error);
      res.status(400).json({ success: false, message: error.message });
    }
  },

  // Get all farms for assigning to users
  async getFarms(req, res) {
    try {
      const result = await pool.query(`
        SELECT farm_id, farm_code, farm_name FROM farms WHERE status = 'ACTIVE' ORDER BY farm_name ASC
      `);
      res.json({ success: true, data: result.rows });
    } catch (error) {
      logger.error('Error in getFarms:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Get user login logs
  async getUserLoginLogs(req, res) {
    try {
      const { userId } = req.params;
      
      const result = await pool.query(`
        SELECT log_id, user_id, login_time, ip_address, device_info
        FROM user_login_logs
        WHERE user_id = $1
        ORDER BY log_id ASC
        LIMIT 50
      `, [userId]);

      res.json({ success: true, data: result.rows });
    } catch (error) {
      logger.error('Error in getUserLoginLogs:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Get system overview stats
  async getSystemStats(req, res) {
    try {
      const usersResult = await pool.query('SELECT COUNT(*) as count FROM users');
      const totalPondsResult = await pool.query('SELECT COUNT(*) as count FROM ponds');
      const totalSeasonsResult = await pool.query('SELECT COUNT(*) as count FROM seasons');
      const activeSeasonsResult = await pool.query('SELECT COUNT(*) as count FROM seasons WHERE status = \'ACTIVE\'');

      const stats = {
        total_users: parseInt(usersResult.rows[0].count),
        total_ponds: parseInt(totalPondsResult.rows[0].count),
        total_seasons: parseInt(totalSeasonsResult.rows[0].count),
        active_seasons: parseInt(activeSeasonsResult.rows[0].count)
      };

      res.json({ success: true, data: stats });
    } catch (error) {
      logger.error('Error in getSystemStats:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Get user statistics
  async getUserStats(req, res) {
    try {
      const result = await pool.query(`
        SELECT r.role_name, COUNT(*) as count
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.role_id
        GROUP BY r.role_name
      `);

      const stats = {};
      result.rows.forEach(row => {
        stats[row.role_name.toLowerCase()] = parseInt(row.count);
      });

      res.json({ success: true, data: stats });
    } catch (error) {
      logger.error('Error in getUserStats:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Get pond statistics
  async getPondStats(req, res) {
    try {
      const result = await pool.query(`
        SELECT status, COUNT(*) as count
        FROM ponds
        GROUP BY status
      `);

      const stats = {};
      result.rows.forEach(row => {
        stats[row.status.toLowerCase()] = parseInt(row.count);
      });

      res.json({ success: true, data: stats });
    } catch (error) {
      logger.error('Error in getPondStats:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Get season statistics
  async getSeasonStats(req, res) {
    try {
      const result = await pool.query(`
        SELECT status, COUNT(*) as count
        FROM seasons
        GROUP BY status
      `);

      const stats = {};
      result.rows.forEach(row => {
        stats[row.status.toLowerCase()] = parseInt(row.count);
      });

      res.json({ success: true, data: stats });
    } catch (error) {
      logger.error('Error in getSeasonStats:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Get production report
  async getProductionReport(req, res) {
    try {
      const result = await pool.query(`
        SELECT 
          s.season_id,
          s.season_name,
          COUNT(p.pond_id) as pond_count,
          SUM(COALESCE(s.quantity_seed, 0)) as total_quantity
        FROM seasons s
        LEFT JOIN ponds p ON s.pond_id = p.pond_id
        WHERE s.status = 'COMPLETED'
        GROUP BY s.season_id, s.season_name
        LIMIT 10
      `);

      const report = {
        totalProduction: result.rows.reduce((sum, row) => sum + (row.total_quantity || 0), 0),
        completedSeasons: result.rows.length,
        seasons: result.rows.map(row => ({
          seasonId: row.season_id,
          seasonName: row.season_name,
          pondCount: parseInt(row.pond_count),
          quantityProduced: row.total_quantity
        }))
      };

      res.json({ success: true, data: report });
    } catch (error) {
      logger.error('Error in getProductionReport:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Get financial report
  async getFinancialReport(req, res) {
    try {
      const expensesResult = await pool.query(`
        SELECT SUM(amount) as total FROM expense_details
      `);

      const totalExpenses = expensesResult.rows[0].total || 0;

      const report = {
        totalRevenue: 0,
        totalExpenses: parseFloat(totalExpenses),
        profit: -parseFloat(totalExpenses),
        currency: 'VND'
      };

      res.json({ success: true, data: report });
    } catch (error) {
      logger.error('Error in getFinancialReport:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Get health report
  async getHealthReport(req, res) {
    try {
      const report = {
        databaseHealth: 'good',
        systemUptime: '99.9%',
        apiResponseTime: '45ms',
        totalRequests: '10,000'
      };

      res.json({ success: true, data: report });
    } catch (error) {
      logger.error('Error in getHealthReport:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Get expense categories
  async getExpenseCategories(req, res) {
    try {
      const result = await pool.query('SELECT * FROM expense_categories ORDER BY name');
      
      const categories = result.rows.map(cat => ({
        id: cat.id,
        name: cat.name,
        description: cat.description
      }));

      res.json({ success: true, data: categories });
    } catch (error) {
      logger.error('Error in getExpenseCategories:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Get product categories
  async getProductCategories(req, res) {
    try {
      const result = await pool.query('SELECT * FROM product_categories ORDER BY name');
      
      const categories = result.rows.map(cat => ({
        id: cat.id,
        name: cat.name,
        description: cat.description
      }));

      res.json({ success: true, data: categories });
    } catch (error) {
      logger.error('Error in getProductCategories:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Get activity logs
  async getActivityLogs(req, res) {
    try {
      const { userId, action, entityType, days = 30, limit = 100, offset = 0 } = req.query;

      const filters = {};
      if (userId) filters.userId = userId;
      if (action) filters.action = action;
      if (entityType) filters.entityType = entityType;

      if (days) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(days));
        filters.startDate = startDate;
      }

      const logs = await auditLogService.getAllActivityLogs(filters, parseInt(limit), parseInt(offset));

      res.json({
        success: true,
        data: logs,
        pagination: { limit: parseInt(limit), offset: parseInt(offset) }
      });
    } catch (error) {
      logger.error('Error in getActivityLogs:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Get training data
  async getTrainingData(req, res) {
    try {
      const trainingData = [];
      res.json({ success: true, data: trainingData });
    } catch (error) {
      logger.error('Error in getTrainingData:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Upload training data
  async uploadTrainingData(req, res) {
    try {
      res.status(201).json({ success: true, message: 'Đã upload dữ liệu huấn luyện' });
    } catch (error) {
      logger.error('Error in uploadTrainingData:', error);
      res.status(400).json({ success: false, message: error.message });
    }
  },

  // Delete training data
  async deleteTrainingData(req, res) {
    try {
      const { dataId } = req.params;
      res.json({ success: true, message: 'Đã xóa dữ liệu huấn luyện' });
    } catch (error) {
      logger.error('Error in deleteTrainingData:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Get prediction history
  async getPredictionHistory(req, res) {
    try {
      const predictions = [];
      res.json({ success: true, data: predictions });
    } catch (error) {
      logger.error('Error in getPredictionHistory:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Update AI model
  async updateAIModel(req, res) {
    try {
      const { modelFile } = req.body;
      res.json({ success: true, message: 'Đã cập nhật model AI' });
    } catch (error) {
      logger.error('Error in updateAIModel:', error);
      res.status(400).json({ success: false, message: error.message });
    }
  },

  // Get model status
  async getModelStatus(req, res) {
    try {
      const status = {
        version: '1.0.0',
        accuracy: 0.955,
        training_samples: 1250,
        last_updated: new Date(),
        status: 'READY',
        f1_score: 0.953
      };
      res.json({ success: true, data: status });
    } catch (error) {
      logger.error('Error in getModelStatus:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Get data summary
  async getDataSummary(req, res) {
    try {
      const summary = {
        totalUsers: 0,
        totalPonds: 0,
        totalSeasons: 0,
        totalCultivationLogs: 0,
        totalExpenses: 0,
        totalDiseases: 0
      };
      res.json({ success: true, data: summary });
    } catch (error) {
      logger.error('Error in getDataSummary:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
};

module.exports = { adminController };
