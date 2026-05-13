import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { notificationService } from '../../services/api'
import '../../styles/dashboard.css'
import '../../styles/manager/manager-common.css'
import '../../styles/manager/manager-notifications.css'

const filterOptions = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'UNREAD', label: 'Chưa đọc' },
  { key: 'ENV', label: 'Môi trường' },
  { key: 'TASK', label: 'Task trễ hạn' },
]

const formatDateTime = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(date)
}

const detectNotificationType = (notification) => {
  const title = `${notification?.title || ''} ${notification?.content || ''}`.toLowerCase()

  if (title.includes('task') || title.includes('công việc') || title.includes('trễ hạn') || title.includes('quá hạn')) {
    return 'TASK'
  }

  if (
    title.includes('oxy') ||
    title.includes('pH') ||
    title.includes('ph ') ||
    title.includes('nhiệt độ') ||
    title.includes('độ mặn') ||
    title.includes('ammonia') ||
    title.includes('vượt ngưỡng')
  ) {
    return 'ENV'
  }

  return 'ALL'
}

const getTypeMeta = (type) => {
  switch (type) {
    case 'ENV':
      return { label: 'Môi trường', badge: 'status-pending', icon: '🌡️' }
    case 'TASK':
      return { label: 'Task', badge: 'status-active', icon: '📋' }
    default:
      return { label: 'Khác', badge: 'status-pending', icon: '🔔' }
  }
}

const ManagerNotifications = () => {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [filter, setFilter] = useState('ALL')
  const [unreadCount, setUnreadCount] = useState(0)

  const fetchNotifications = useCallback(async () => {
    try {
      setRefreshing(true)
      const response = await notificationService.getNotifications()
      setNotifications(response?.data?.data || [])
      setUnreadCount(response?.data?.unread_count || 0)
      setError('')
    } catch (err) {
      setError(err?.response?.data?.message || 'Không tải được thông báo')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const summary = useMemo(() => {
    return {
      total: notifications.length,
      unread: unreadCount,
      env: notifications.filter((item) => detectNotificationType(item) === 'ENV').length,
      task: notifications.filter((item) => detectNotificationType(item) === 'TASK').length,
    }
  }, [notifications, unreadCount])

  const filteredNotifications = useMemo(() => {
    if (filter === 'ALL') return notifications
    if (filter === 'UNREAD') return notifications.filter((item) => !item.is_read)
    return notifications.filter((item) => detectNotificationType(item) === filter)
  }, [notifications, filter])

  const handleMarkAsRead = async (notificationId) => {
    try {
      await notificationService.markAsRead(notificationId)
      setSuccess('Đã đánh dấu thông báo là đã đọc')
      await fetchNotifications()
    } catch (err) {
      setError(err?.response?.data?.message || 'Không thể đánh dấu đã đọc')
    }
  }

  const handleDeleteNotification = async (notificationId) => {
    if (!window.confirm('Bạn muốn xóa thông báo này?')) return

    try {
      await notificationService.deleteNotification(notificationId)
      setSuccess('Đã xóa thông báo')
      await fetchNotifications()
    } catch (err) {
      setError(err?.response?.data?.message || 'Không thể xóa thông báo')
    }
  }

  if (loading) {
    return (
      <div className="dashboard manager-page">
        <div className="flex-center manager-notifications__loading">
          <div className="spinner" />
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard manager-page">
      <div className="dashboard-header">
        <h1>🚨 Nhận cảnh báo</h1>
        <p>Thông báo khi môi trường vượt ngưỡng hoặc task trễ hạn</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="stats-grid manager-notifications__stats-grid">
        <div className="stat-card">
          <div className="stat-icon manager-notifications__stat-icon--danger">🚨</div>
          <div className="stat-content">
            <p className="stat-label">Tổng thông báo</p>
            <p className="stat-value">{summary.total}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon manager-notifications__stat-icon--warning">🔔</div>
          <div className="stat-content">
            <p className="stat-label">Chưa đọc</p>
            <p className="stat-value">{summary.unread}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon manager-notifications__stat-icon--info">🌡️</div>
          <div className="stat-content">
            <p className="stat-label">Cảnh báo môi trường</p>
            <p className="stat-value">{summary.env}</p>
          </div>
        </div>
      </div>

      <div className="manager-notifications__filters">
        {filterOptions.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => setFilter(option.key)}
            className={`manager-notifications__filter-btn ${filter === option.key ? 'manager-notifications__filter-btn--active' : ''}`}
          >
            {option.label}
          </button>
        ))}

        <button
          type="button"
          onClick={fetchNotifications}
          disabled={refreshing}
          className="btn btn-primary"
          className="btn btn-primary manager-notifications__refresh-btn"
        >
          {refreshing ? 'Đang tải...' : '🔄 Làm mới'}
        </button>
      </div>

      <div className="table-container">
        <div className="table-header">
          <h2>Danh sách cảnh báo</h2>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Loại</th>
                <th>Tiêu đề</th>
                <th>Nội dung</th>
                <th>Thời gian</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredNotifications.length > 0 ? (
                filteredNotifications.map((notification) => {
                  const type = detectNotificationType(notification)
                  const meta = getTypeMeta(type)

                  return (
                    <tr key={notification.notification_id} className={notification.is_read ? 'manager-notifications__row--unread' : ''}>
                      <td>
                        <span className={`status-badge ${meta.badge} manager-notifications__meta-badge`}>
                          <span>{meta.icon}</span>
                          {meta.label}
                        </span>
                      </td>
                      <td className="manager-notifications__title">{notification.title || '-'}</td>
                      <td className="manager-notifications__content">{notification.content || '-'}</td>
                      <td>{formatDateTime(notification.created_at)}</td>
                      <td>
                        {notification.is_read ? (
                          <span className="status-badge status-active">✅ Đã đọc</span>
                        ) : (
                          <span className="status-badge status-pending">⏳ Chưa đọc</span>
                        )}
                      </td>
                      <td>
                        <div className="manager-notifications__actions">
                          {!notification.is_read && (
                            <button
                              type="button"
                              onClick={() => handleMarkAsRead(notification.notification_id)}
                              className="btn btn-primary"
                              className="btn btn-primary manager-notifications__action-btn"
                            >
                              Đã đọc
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteNotification(notification.notification_id)}
                            className="btn btn-secondary"
                            className="btn btn-secondary manager-notifications__action-btn"
                          >
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan="6" className="manager-notifications__empty-cell">
                    Không có thông báo phù hợp
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="manager-notifications__examples">
        <div className="table-container">
          <div className="table-header">
            <h2>Ví dụ cảnh báo</h2>
          </div>
          <div className="manager-notifications__examples-inner">
            <div className="manager-notifications__example-item">
              Oxy thấp ở ao A2
            </div>
            <div className="manager-notifications__example-item">
              Task vệ sinh ao A1 đã trễ hạn
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ManagerNotifications