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
    // Tùy chọn làm mới mỗi 30 giây
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
        className="notification-bell_trigger"
        title="Thông báo"
      >
        🔔
        {unreadCount > 0 && (
          <span className="notification-bell_badge">
            {unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <div
          className="notification-bell_dropdown"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="notification-bell_header">
            <h3 className="notification-bell_title">
              Thông báo ({notifications.length})
            </h3>
            {notifications.length > 0 && (
              <button
                onClick={handleDeleteAll}
                className="notification-bell_clear-btn"
              >
                Xóa tất cả
              </button>
            )}
          </div>

          {/* Notifications List */}
          {loading ? (
            <div className="notification-bell_loading">
              Đang tải...
            </div>
          ) : notifications.length > 0 ? (
            <div className="notification-bell_list">
              {notifications.map((notif) => (
                <div
                  key={notif.notification_id}
                  className={`notification-bell_item ${notif.is_read ? 'notification-bell_item--read' : 'notification-bell_item--unread'}`}
                >
                  <div className="notification-bell_item-row">
                    <div className="notification-bell_content">
                      <p className={`notification-bell_title-row ${notif.is_read ? 'notification-bell_title-row--read' : 'notification-bell_title-row--unread'}`}>
                        {notif.title}
                        {!notif.is_read && (
                          <span className="notification-bell_unread-dot" />
                        )}
                      </p>
                      <p className="notification-bell_text">
                        {notif.content}
                      </p>
                      <p className="notification-bell_meta">
                        {new Date(notif.created_at).toLocaleString('vi-VN')}
                      </p>
                    </div>
                    <div className="notification-bell_actions">
                      {!notif.is_read && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkAsRead(notif.notification_id);
                          }}
                          className="notification-bell_action-btn notification-bell_action-btn--read"
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
                        className="notification-bell_action-btn notification-bell_action-btn--delete"
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
            <div className="notification-bell_empty">
              Không có thông báo
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
