import React, { useState, useEffect } from 'react';
import { notificationService } from '../services/api';
import '../styles/notification-bell.css';

export const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchNotifications();
    // Optionally refresh every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await notificationService.getNotifications();
      setNotifications(response.data.data || []);
      setUnreadCount(response.data.unread_count || 0);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await notificationService.markAsRead(notificationId);
      fetchNotifications();
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  const handleDelete = async (notificationId) => {
    try {
      await notificationService.deleteNotification(notificationId);
      fetchNotifications();
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  const handleDeleteAll = async () => {
    if (window.confirm('Bạn có chắc muốn xóa tất cả thông báo?')) {
      try {
        await notificationService.deleteAllNotifications();
        fetchNotifications();
      } catch (err) {
        console.error('Error deleting all notifications:', err);
      }
    }
  };

  return (
    <div className="notification-bell">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="notification-bell__trigger"
        title="Thông báo"
      >
        🔔
        {unreadCount > 0 && (
          <span className="notification-bell__badge">
            {unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <div
          className="notification-bell__dropdown"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="notification-bell__header">
            <h3 className="notification-bell__title">
              Thông báo ({notifications.length})
            </h3>
            {notifications.length > 0 && (
              <button
                onClick={handleDeleteAll}
                className="notification-bell__clear-btn"
              >
                Xóa tất cả
              </button>
            )}
          </div>

          {/* Notifications List */}
          {loading ? (
            <div className="notification-bell__loading">
              Đang tải...
            </div>
          ) : notifications.length > 0 ? (
            <div className="notification-bell__list">
              {notifications.map((notif) => (
                <div
                  key={notif.notification_id}
                  className={`notification-bell__item ${notif.is_read ? 'notification-bell__item--read' : 'notification-bell__item--unread'}`}
                >
                  <div className="notification-bell__item-row">
                    <div className="notification-bell__content">
                      <p className={`notification-bell__title-row ${notif.is_read ? 'notification-bell__title-row--read' : 'notification-bell__title-row--unread'}`}>
                        {notif.title}
                        {!notif.is_read && (
                          <span className="notification-bell__unread-dot" />
                        )}
                      </p>
                      <p className="notification-bell__text">
                        {notif.content}
                      </p>
                      <p className="notification-bell__meta">
                        {new Date(notif.created_at).toLocaleString('vi-VN')}
                      </p>
                    </div>
                    <div className="notification-bell__actions">
                      {!notif.is_read && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkAsRead(notif.notification_id);
                          }}
                          className="notification-bell__action-btn notification-bell__action-btn--read"
                          title="Đánh dấu đã đọc"
                        >
                          ✓
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(notif.notification_id);
                        }}
                        className="notification-bell__action-btn notification-bell__action-btn--delete"
                        title="Xóa"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="notification-bell__empty">
              Không có thông báo
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
