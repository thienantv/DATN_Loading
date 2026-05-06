const db = require('../config/database');
const logger = require('../utils/logger');

const ROLE_LABELS = {
  ADMIN: 'Quản trị viên',
  MANAGER: 'Quản lý',
  STAFF: 'Nhân viên',
};

const ENTITY_LABELS = {
  USER: 'Người dùng',
  USERS: 'Người dùng',
  USER_ROLE: 'Vai trò',
  POND: 'Ao',
  PONDS: 'Ao',
  SEASON: 'Mùa vụ',
  SEASONS: 'Mùa vụ',
  PRODUCT: 'Sản phẩm',
  PRODUCTS: 'Sản phẩm',
  DISEASE: 'Bệnh tôm',
  DISEASES: 'Bệnh tôm',
  SENSOR: 'Cảm biến',
  SENSORS: 'Cảm biến',
  TASK: 'Công việc',
  TASKS: 'Công việc',
  ENVIRONMENT: 'Môi trường',
  ENVIRONMENT_LOG: 'Nhật ký môi trường',
  ENVIRONMENT_LOGS: 'Nhật ký môi trường',
  FEED_LOG: 'Nhật ký cho ăn',
  FEED_LOGS: 'Nhật ký cho ăn',
  CULTIVATION_LOG: 'Nhật ký canh tác',
  CULTIVATION_LOGS: 'Nhật ký canh tác',
  NOTIFICATION: 'Thông báo',
  NOTIFICATIONS: 'Thông báo',
  AI_MODEL: 'AI',
  AUDIT_LOG: 'Nhật ký hoạt động',
  AUDIT_LOGS: 'Nhật ký hoạt động',
};

function normalizeEntityType(entityType) {
  if (!entityType) return '';

  return String(entityType)
    .trim()
    .replace(/[-\s]+/g, '_')
    .replace(/__+/g, '_')
    .toUpperCase();
}

function resolveRoleLabel(role) {
  if (!role) return '';

  const normalizedRole = String(role).trim().toUpperCase();
  return ROLE_LABELS[normalizedRole] || role;
}

function resolveEntityLabel(entityType, details = null) {
  let normalizedType = normalizeEntityType(entityType);

  if (!normalizedType && details && typeof details === 'object' && details.path) {
    const inferredSegments = String(details.path)
      .split('?')[0]
      .split('/')
      .filter((segment) => segment && segment !== 'api');

    normalizedType = normalizeEntityType(inferredSegments[0] || '');
  }

  if (normalizedType === 'USER_ROLE') {
    const roleValue = details && typeof details === 'object'
      ? details.newRole || details.role || details.roleName || details.targetRole
      : null;

    return roleValue ? resolveRoleLabel(roleValue) : 'Vai trò';
  }

  if (normalizedType === 'USER') {
    const roleValue = details && typeof details === 'object'
      ? details.newRole || details.role || details.roleName
      : null;

    return roleValue ? resolveRoleLabel(roleValue) : 'Người dùng';
  }

  return ENTITY_LABELS[normalizedType] || entityType || 'Không xác định';
}

function normalizeDetails(details) {
  if (details === null || details === undefined) {
    return null;
  }

  if (typeof details === 'string') {
    return details;
  }

  return JSON.stringify(details);
}

const auditLogService = {
  resolveRoleLabel,

  resolveEntityLabel,

  async logActivity(userId, action, entityType, entityId, details = null, entityLabel = null) {
    try {
      const resolvedLabel = entityLabel || resolveEntityLabel(entityType, details);
      const result = await db.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_label, entity_id, details, logged_at, ip_address)
         VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, $7)
         RETURNING audit_id`,
        [userId, action, entityType, resolvedLabel, entityId, normalizeDetails(details), null]
      );

      logger.info(`Audit log: User ${userId} - ${action} ${resolvedLabel} ${entityId || ''}`.trim());
      return result.rows[0];
    } catch (error) {
      logger.error('Error in logActivity:', error);
      return null;
    }
  },

  async getAllActivityLogs(filters = {}, limit = 100, offset = 0) {
    try {
      let query = `
        SELECT
          a.audit_id,
          a.user_id,
          u.username as actor_username,
          u.full_name as actor_full_name,
          r.role_name as actor_role,
          a.action,
          a.entity_type,
          COALESCE(NULLIF(a.entity_label, ''), a.entity_type) as entity_label,
          a.entity_id,
          a.logged_at
        FROM audit_logs a
        LEFT JOIN users u ON a.user_id = u.user_id
        LEFT JOIN roles r ON u.role_id = r.role_id
        WHERE 1=1
      `;

      const params = [];
      let paramIndex = 1;

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
};

module.exports = auditLogService;
