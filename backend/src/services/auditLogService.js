const db = require('../config/database');
const logger = require('../utils/logger');

const auditLogService = {
  // Log user activity
  async logActivity(userId, action, entityType, entityId, details = null) {
    try {
      const result = await db.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, logged_at, ip_address)
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, $6)
         RETURNING audit_id`,
        [userId, action, entityType, entityId, details ? JSON.stringify(details) : null, null]
      );

      logger.info(`Audit log: User ${userId} - ${action} ${entityType} ${entityId}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error in logActivity:', error);
      // Don't throw - audit logging should not break the main operation
      return null;
    }
  },

  // Log data changes (for UPDATE operations)
  async logDataChange(userId, entityType, entityId, oldData, newData) {
    try {
      const changes = this._getChangedFields(oldData, newData);
      
      if (Object.keys(changes).length === 0) {
        return; // No changes to log
      }

      const result = await db.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, logged_at)
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
         RETURNING audit_id`,
        [userId, 'UPDATE', entityType, entityId, JSON.stringify(changes)]
      );

      logger.info(`Audit log: User ${userId} updated ${entityType} ${entityId}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error in logDataChange:', error);
      return null;
    }
  },

  // Get activity logs for a user
  async getUserActivityLogs(userId, limit = 100) {
    try {
      const result = await db.query(
        `SELECT audit_id, user_id, action, entity_type, entity_id, details, logged_at
         FROM audit_logs
         WHERE user_id = $1
         ORDER BY logged_at DESC
         LIMIT $2`,
        [userId, limit]
      );

      return result.rows || [];
    } catch (error) {
      logger.error('Error in getUserActivityLogs:', error);
      return [];
    }
  },

  // Get activity logs by entity
  async getEntityActivityLogs(entityType, entityId, limit = 100) {
    try {
      const result = await db.query(
        `SELECT a.audit_id, a.user_id, u.username, a.action, a.entity_type, a.entity_id, a.details, a.logged_at
         FROM audit_logs a
         LEFT JOIN users u ON a.user_id = u.user_id
         WHERE a.entity_type = $1 AND a.entity_id = $2
         ORDER BY a.logged_at DESC
         LIMIT $3`,
        [entityType, entityId, limit]
      );

      return result.rows || [];
    } catch (error) {
      logger.error('Error in getEntityActivityLogs:', error);
      return [];
    }
  },

  // Get all activity logs with filters
  async getAllActivityLogs(filters = {}, limit = 100, offset = 0) {
    try {
      let query = `
        SELECT a.audit_id, a.user_id, u.username, u.full_name, a.action, a.entity_type, a.entity_id, a.details, a.logged_at
        FROM audit_logs a
        LEFT JOIN users u ON a.user_id = u.user_id
        WHERE 1=1
      `;
      const params = [];
      let paramIndex = 1;

      // Apply filters
      if (filters.userId) {
        query += ` AND a.user_id = $${paramIndex++}`;
        params.push(filters.userId);
      }

      if (filters.action) {
        query += ` AND a.action = $${paramIndex++}`;
        params.push(filters.action);
      }

      if (filters.entityType) {
        query += ` AND a.entity_type = $${paramIndex++}`;
        params.push(filters.entityType);
      }

      if (filters.startDate) {
        query += ` AND a.logged_at >= $${paramIndex++}`;
        params.push(filters.startDate);
      }

      if (filters.endDate) {
        query += ` AND a.logged_at <= $${paramIndex++}`;
        params.push(filters.endDate);
      }

      query += ` ORDER BY a.logged_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
      params.push(limit, offset);

      const result = await db.query(query, params);
      return result.rows || [];
    } catch (error) {
      logger.error('Error in getAllActivityLogs:', error);
      return [];
    }
  },

  // Get audit log statistics
  async getAuditStatistics(days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const result = await db.query(
        `SELECT 
           COUNT(*) as total_actions,
           COUNT(DISTINCT user_id) as unique_users,
           COUNT(DISTINCT action) as unique_actions,
           COUNT(DISTINCT entity_type) as unique_entity_types,
           COUNT(CASE WHEN action = 'CREATE' THEN 1 END) as create_count,
           COUNT(CASE WHEN action = 'UPDATE' THEN 1 END) as update_count,
           COUNT(CASE WHEN action = 'DELETE' THEN 1 END) as delete_count,
           COUNT(CASE WHEN action = 'READ' THEN 1 END) as read_count
         FROM audit_logs
         WHERE logged_at >= $1`,
        [startDate]
      );

      return result.rows[0] || {
        total_actions: 0,
        unique_users: 0,
        unique_actions: 0,
        unique_entity_types: 0,
        create_count: 0,
        update_count: 0,
        delete_count: 0,
        read_count: 0
      };
    } catch (error) {
      logger.error('Error in getAuditStatistics:', error);
      return {};
    }
  },

  // Export audit logs (for compliance/backup)
  async exportAuditLogs(startDate, endDate, format = 'json') {
    try {
      const result = await db.query(
        `SELECT a.*, u.username, u.full_name
         FROM audit_logs a
         LEFT JOIN users u ON a.user_id = u.user_id
         WHERE a.logged_at >= $1 AND a.logged_at <= $2
         ORDER BY a.logged_at DESC`,
        [startDate, endDate]
      );

      if (format === 'csv') {
        return this._convertToCSV(result.rows);
      }

      return result.rows || [];
    } catch (error) {
      logger.error('Error in exportAuditLogs:', error);
      return [];
    }
  },

  // Clean old logs (retention policy)
  async cleanOldLogs(daysToKeep = 90) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const result = await db.query(
        `DELETE FROM audit_logs WHERE logged_at < $1 RETURNING audit_id`,
        [cutoffDate]
      );

      logger.info(`Cleaned ${result.rows.length} old audit logs`);
      return result.rows.length;
    } catch (error) {
      logger.error('Error in cleanOldLogs:', error);
      throw error;
    }
  },

  // Helper: Get changed fields
  _getChangedFields(oldData, newData) {
    const changes = {};

    for (const key in newData) {
      if (oldData[key] !== newData[key]) {
        changes[key] = {
          old: oldData[key],
          new: newData[key]
        };
      }
    }

    return changes;
  },

  // Helper: Convert to CSV
  _convertToCSV(data) {
    if (!data || data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csv = [headers.join(',')];

    for (const row of data) {
      const values = headers.map(h => {
        const value = row[h];
        // Escape quotes and wrap in quotes if contains comma
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      });
      csv.push(values.join(','));
    }

    return csv.join('\n');
  },
};

module.exports = auditLogService;
