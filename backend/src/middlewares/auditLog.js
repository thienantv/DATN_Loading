const auditLogService = require('../services/auditLogService');
const logger = require('../utils/logger');
const { buildRequestMeta } = require('../utils/requestMeta');

function safeJsonParse(data) {
  if (!data) return null;

  if (Buffer.isBuffer(data)) {
    try {
      return JSON.parse(data.toString('utf8'));
    } catch (error) {
      return null;
    }
  }

  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch (error) {
      return null;
    }
  }

  if (typeof data === 'object') {
    return data;
  }

  return null;
}

function getIdCandidateKeys(entityType) {
  const normalizedEntityType = String(entityType || '')
    .trim()
    .replace(/[-\s]+/g, '_')
    .replace(/__+/g, '_')
    .toLowerCase();

  const singularType = normalizedEntityType.endsWith('s')
    ? normalizedEntityType.slice(0, -1)
    : normalizedEntityType;

  const camelType = singularType.replace(/_([a-z])/g, (_, char) => char.toUpperCase());

  return [
    `${singularType}_id`,
    `${singularType}Id`,
    `${camelType}_id`,
    `${camelType}Id`,
    'id',
  ];
}

function extractEntityIdFromResponse(responseData, entityType) {
  const parsed = safeJsonParse(responseData);
  if (!parsed || typeof parsed !== 'object') return null;

  const payload = parsed.data && typeof parsed.data === 'object' ? parsed.data : parsed;
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;

  const candidateKeys = getIdCandidateKeys(entityType);

  for (const key of candidateKeys) {
    if (payload[key] !== undefined && payload[key] !== null && payload[key] !== '') {
      return String(payload[key]);
    }
  }

  return null;
}

// Middleware to log all API requests
const auditLogMiddleware = async (req, res, next) => {
  // Store original response send
  const originalSend = res.send;

  // Track request metadata
  const requestMetadata = {
    method: req.method,
    path: req.path,
    timestamp: new Date().toISOString(),
    ip: req.ip,
    userAgent: req.get('user-agent'),
    ...buildRequestMeta(req),
  };

  // Override res.send to capture response status
  res.send = function (data) {
    requestMetadata.statusCode = res.statusCode;
    requestMetadata.responseSize = Buffer.byteLength(data);
    requestMetadata.responseData = data;

    // Log certain operations based on HTTP method and route
    if (req.user && req.user.user_id) {
      logOperation(req, requestMetadata);
    }

    // Call original send
    res.send = originalSend;
    return res.send(data);
  };

  next();
};

// Determine what action to log based on HTTP method and route
async function logOperation(req, metadata) {
  try {
    const userId = req.user.user_id;
    const originalPath = req.originalUrl ? req.originalUrl.split('?')[0] : req.path;
    const path = req.path;
    const method = req.method;

    if (path.startsWith('/admin') || path.startsWith('/auth')) {
      return;
    }

    // Skip logging for read-only operations to reduce log size
    if (method === 'GET') {
      return; // Can enable if needed for audit trails
    }

    // Determine entity type from full original URL to avoid missing mount segments
    const pathSegments = originalPath.split('/').filter((segment) => segment && segment !== 'api');
    const entityType = pathSegments[0] || null;
    let entityId = pathSegments[1] || null;

    // Determine action
    let action = 'READ';
    if (method === 'POST') action = 'CREATE';
    else if (method === 'PUT' || method === 'PATCH') action = 'UPDATE';
    else if (method === 'DELETE') action = 'DELETE';

    if (action === 'CREATE' && !entityId) {
      entityId = extractEntityIdFromResponse(metadata.responseData, entityType);
    }

    // Log the activity
    await auditLogService.logActivity(
      userId,
      action,
      entityType,
      entityId,
      {
        method,
        path,
        statusCode: metadata.statusCode,
        body: sanitizeBody(req.body)
      },
      null,
      metadata
    );
  } catch (error) {
    logger.error('Error in auditLogMiddleware:', error);
    // Don't throw - middleware should not break the request
  }
}

// Sanitize request body to remove sensitive data
function sanitizeBody(body) {
  if (!body) return {};

  const sanitized = { ...body };
  const sensitiveFields = ['password', 'passwordHash', 'token', 'secret', 'apiKey'];

  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '***REDACTED***';
    }
  });

  return sanitized;
}

module.exports = auditLogMiddleware;
