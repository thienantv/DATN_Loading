const db = require('../config/database');
const logger = require('../utils/logger');

const ROLE_LABELS = {
  ADMIN: 'Quản trị viên',
  MANAGER: 'Quản lý',
  TECHNICIAN: 'Kỹ thuật viên',
  WORKER: 'Công nhân',
  ACCOUNTANT: 'Kế toán',
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

async function getNextAuditId(client) {
  const result = await client.query(`
    SELECT audit_id
    FROM audit_logs
    ORDER BY audit_id ASC
  `)

  const existingIds = result.rows
    .map((row) => Number(row.audit_id))
    .filter((value) => Number.isInteger(value) && value > 0)

  let nextId = 1
  if (existingIds.length > 0) {
    const idSet = new Set(existingIds)
    for (let candidate = 1; candidate <= existingIds.length + 1; candidate += 1) {
      if (!idSet.has(candidate)) {
        nextId = candidate
        break
      }
    }
  }

  return nextId
}

const auditLogService = {
  resolveRoleLabel,

  resolveEntityLabel,

  async logActivity(userId, action, entityType, entityId, details = null, entityLabel = null, requestMeta = {}) {
    const client = await db.connect();

    try {
      const resolvedLabel = entityLabel || resolveEntityLabel(entityType, details);
      const metaIp = requestMeta.ip_address || requestMeta.ip || null;
      const metaDevice = requestMeta.device_info || requestMeta.deviceInfo || null;
      const metaBrowser = requestMeta.browser || null;
      const metaOperatingSystem = requestMeta.operating_system || requestMeta.operatingSystem || null;

      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock($1)', [987654321]);

      const auditId = await getNextAuditId(client);
      const result = await client.query(
        `INSERT INTO audit_logs (audit_id, user_id, action, entity_type, entity_label, entity_id, details, logged_at, ip_address, device_info, browser, operating_system)
         VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, $8, $9, $10, $11)
         RETURNING audit_id`,
        [auditId, userId, action, entityType, resolvedLabel, entityId, normalizeDetails(details), metaIp, metaDevice, metaBrowser, metaOperatingSystem]
      );

      await client.query('COMMIT');

      logger.info(`Audit log: User ${userId} - ${action} ${resolvedLabel} ${entityId || ''}`.trim());
      return result.rows[0];
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        logger.error('Error rolling back audit log transaction:', rollbackError);
      }

      logger.error('Error in logActivity:', error);
      return null;
    } finally {
      client.release();
    }
  },

  async getAllActivityLogs(filters = {}, limit = 100, offset = 0) {
    try {
      const normalizedSeverity = filters.severity ? String(filters.severity).trim().toUpperCase() : '';
      const severityFilteringEnabled = ['LOW', 'MEDIUM', 'HIGH'].includes(normalizedSeverity);

      let query = `
        SELECT
          a.audit_id,
          a.user_id,
          u.username as actor_username,
          u.full_name as actor_full_name,
          u.avatar_url as actor_avatar_url,
          r.role_name as actor_role,
          a.action,
          a.entity_type,
          COALESCE(NULLIF(a.entity_label, ''), a.entity_type) as entity_label,
          a.entity_id,
          a.details,
          a.logged_at,
          a.ip_address,
          a.device_info,
          a.browser,
          a.operating_system
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

      if (filters.module) {
        query += ` AND UPPER(a.entity_type) = UPPER($${paramIndex++})`;
        params.push(filters.module);
      }

      if (filters.startDate) {
        query += ` AND a.logged_at >= $${paramIndex++}`;
        params.push(filters.startDate);
      }

      if (filters.endDate) {
        query += ` AND a.logged_at <= $${paramIndex++}`;
        params.push(filters.endDate);
      }

      query += ` ORDER BY a.logged_at DESC`;

      if (!severityFilteringEnabled) {
        query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
        params.push(limit, offset);
      }

      const result = await db.query(query, params);
      const rows = result.rows || [];

      // Build risk scoring data per user in batch to avoid per-row queries.
      const userIds = Array.from(new Set(rows.map(r => r.user_id).filter(Boolean)));
      const recentIpsByUser = {};
      const recentDevicesByUser = {};
      const recentFailedByUser = {};

      if (userIds.length > 0) {
        // recent ips/devices in last 90 days for these users
        const ipsRes = await db.query(
          `SELECT user_id, ip_address, device_info
           FROM audit_logs
           WHERE user_id = ANY($1::bigint[]) AND logged_at >= NOW() - INTERVAL '90 days'
             AND (ip_address IS NOT NULL OR device_info IS NOT NULL)`,
          [userIds]
        );

        ipsRes.rows.forEach(r => {
          const uid = String(r.user_id);
          if (!recentIpsByUser[uid]) recentIpsByUser[uid] = new Set();
          if (r.ip_address) recentIpsByUser[uid].add(String(r.ip_address));
          if (!recentDevicesByUser[uid]) recentDevicesByUser[uid] = new Set();
          if (r.device_info) recentDevicesByUser[uid].add(String(r.device_info));
        });

        // failed attempts in last 24 hours per user
        const failedRes = await db.query(
          `SELECT user_id, COUNT(*) as cnt
           FROM audit_logs
           WHERE user_id = ANY($1::bigint[]) AND action = 'LOGIN_FAILED' AND logged_at >= NOW() - INTERVAL '24 hours'
           GROUP BY user_id`,
          [userIds]
        );

        failedRes.rows.forEach(r => {
          recentFailedByUser[String(r.user_id)] = Number(r.cnt) || 0;
        });
      }

      // Compute heuristic risk for each row
      const scored = rows.map((row) => {
        try {
          let score = 0;

          const ipMissing = !(row.ip_address && String(row.ip_address).trim());
          const deviceMissing = !(row.device_info && String(row.device_info).trim());
          const browserMissing = !(row.browser && String(row.browser).trim());

          if (ipMissing) score += 30;
          if (deviceMissing) score += 25;
          if (browserMissing) score += 15;

          const uid = row.user_id ? String(row.user_id) : null;
          if (uid) {
            const recentIps = recentIpsByUser[uid] || new Set();
            const recentDevices = recentDevicesByUser[uid] || new Set();

            const ipVal = row.ip_address ? String(row.ip_address) : null;
            if (ipVal && !recentIps.has(ipVal)) score += 20;

            const deviceVal = row.device_info ? String(row.device_info) : null;
            if (deviceVal && !recentDevices.has(deviceVal)) score += 15;
          }

          const loggedAt = row.logged_at ? new Date(row.logged_at) : null;
          if (loggedAt) {
            const hour = loggedAt.getHours();
            if (hour >= 0 && hour <= 5) score += 10;
            if (hour >= 22 && hour <= 23) score += 6;
          }

          const failedCount = uid ? (recentFailedByUser[uid] || 0) : 0;
          if (failedCount > 0) score += Math.min(failedCount * 10, 30);

          const riskLevel = score >= 60 ? 'HIGH' : (score >= 30 ? 'MEDIUM' : 'LOW');

          return {
            ...row,
            risk_score: score,
            risk_level: riskLevel,
          };
        } catch (err) {
          return { ...row, risk_score: 0, risk_level: 'LOW' };
        }
      });

      if (severityFilteringEnabled) {
        const severityMatched = scored.filter((item) => String(item.risk_level || '').toUpperCase() === normalizedSeverity);
        return severityMatched.slice(offset, offset + limit);
      }

      return scored;
    } catch (error) {
      logger.error('Error in getAllActivityLogs:', error);
      return [];
    }
  },
};

module.exports = auditLogService;
