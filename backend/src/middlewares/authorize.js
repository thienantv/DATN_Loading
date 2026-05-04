const logger = require('../utils/logger')

const authorize = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      logger.warn('No user in request')
      return res.status(401).json({
        success: false,
        message: 'Vui lòng đăng nhập',
      })
    }

    // Nếu không chỉ định role, cho phép tất cả
    if (allowedRoles.length === 0) {
      return next()
    }

    // Kiểm tra role
    if (!allowedRoles.includes(req.user.role)) {
      logger.warn(`User ${req.user.user_id} không có quyền truy cập: ${req.originalUrl}`)
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền truy cập',
      })
    }

    next()
  }
}

module.exports = {
  authorize,
}
