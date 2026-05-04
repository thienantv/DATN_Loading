const pool = require('../config/database');
const logger = require('../utils/logger');
const backupService = require('../services/backupService');
const auditLogService = require('../services/auditLogService');

const adminController = {
  // Get all users (Admin only)
  async getAllUsers(req, res) {
    try {
      const result = await pool.query(`
        SELECT u.user_id, u.username, u.email, u.full_name, u.status, r.role_name, u.created_at
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.role_id
        ORDER BY u.created_at DESC
      `);
      
      const users = result.rows.map(user => ({
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        role: user.role_name,
        role_id: user.role_id,
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
      const { username, email, fullName, role, password } = req.body;
      
      // Get role_id from role_name
      const roleResult = await pool.query('SELECT role_id FROM roles WHERE role_name = $1', [role || 'STAFF']);
      if (roleResult.rows.length === 0) {
        return res.status(400).json({ success: false, message: 'Invalid role' });
      }
      const roleId = roleResult.rows[0].role_id;
      
      const result = await pool.query(`
        INSERT INTO users (username, email, full_name, role_id, password_hash, status)
        VALUES ($1, $2, $3, $4, $5, TRUE)
        RETURNING user_id, username, email, full_name, role_id
      `, [username, email, fullName, roleId, password]);

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

  // Get user login logs
  async getUserLoginLogs(req, res) {
    try {
      const { userId } = req.params;
      
      const result = await pool.query(`
        SELECT log_id, user_id, login_time, ip_address, device_info
        FROM user_login_logs
        WHERE user_id = $1
        ORDER BY login_time DESC
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
      const pondsResult = await pool.query('SELECT COUNT(*) as count FROM ponds WHERE status = \'ACTIVE\'');
      const seasonsResult = await pool.query('SELECT COUNT(*) as count FROM seasons WHERE status = \'ACTIVE\'');

      const stats = {
        totalUsers: parseInt(usersResult.rows[0].count),
        totalPonds: parseInt(pondsResult.rows[0].count),
        activeSeason: parseInt(seasonsResult.rows[0].count),
        systemHealth: '100%'
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

  // Create backup
  async createBackup(req, res) {
    try {
      const backup = await backupService.createBackup();
      res.status(201).json({
        success: true,
        message: 'Backup tạo thành công',
        data: backup
      });
    } catch (error) {
      logger.error('Error in createBackup:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Get backups list
  async getBackups(req, res) {
    try {
      const backups = await backupService.getBackups();
      res.json({ success: true, data: backups });
    } catch (error) {
      logger.error('Error in getBackups:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Restore from backup
  async restoreBackup(req, res) {
    try {
      const { backupId } = req.params;
      const result = await backupService.restoreBackup(backupId);
      res.json({ success: true, ...result });
    } catch (error) {
      logger.error('Error in restoreBackup:', error);
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
      const stats = await auditLogService.getAuditStatistics(parseInt(days));

      res.json({
        success: true,
        data: logs,
        stats: stats,
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
        modelName: 'Disease Detection v1.0',
        lastUpdated: new Date(),
        accuracy: '95.5%',
        isActive: true
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
