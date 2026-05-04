const auditLogService = require('../services/auditLogService');
const logger = require('../utils/logger');

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
  };

  // Override res.send to capture response status
  res.send = function (data) {
    requestMetadata.statusCode = res.statusCode;
    requestMetadata.responseSize = Buffer.byteLength(data);

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
    const path = req.path;
    const method = req.method;

    // Skip logging for read-only operations to reduce log size
    if (method === 'GET') {
      return; // Can enable if needed for audit trails
    }

    // Determine entity type from path
    const pathSegments = path.split('/').filter(s => s && s !== 'api');
    const entityType = pathSegments[0];
    const entityId = pathSegments[2] || null;

    // Determine action
    let action = 'READ';
    if (method === 'POST') action = 'CREATE';
    else if (method === 'PUT' || method === 'PATCH') action = 'UPDATE';
    else if (method === 'DELETE') action = 'DELETE';

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
      }
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
