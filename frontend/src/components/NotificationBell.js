import React, { useState, useEffect } from 'react';
import { notificationService } from '../services/api';
import '../styles/dashboard.css';

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
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: '20px',
          position: 'relative',
          padding: '8px',
        }}
        title="Thông báo"
      >
        🔔
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-2px',
              right: '-2px',
              backgroundColor: '#dc2626',
              color: 'white',
              borderRadius: '50%',
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 'bold',
            }}
          >
            {unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: '100%',
            backgroundColor: 'white',
            border: '1px solid #ddd',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 1000,
            minWidth: '320px',
            maxWidth: '400px',
            maxHeight: '500px',
            overflowY: 'auto',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid #eee',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>
              Thông báo ({notifications.length})
            </h3>
            {notifications.length > 0 && (
              <button
                onClick={handleDeleteAll}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#666',
                  fontSize: '12px',
                  textDecoration: 'underline',
                }}
              >
                Xóa tất cả
              </button>
            )}
          </div>

          {/* Notifications List */}
          {loading ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
              Đang tải...
            </div>
          ) : notifications.length > 0 ? (
            <div>
              {notifications.map((notif) => (
                <div
                  key={notif.notification_id}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid #f0f0f0',
                    backgroundColor: notif.is_read ? '#fff' : '#f9f3ff',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = notif.is_read
                      ? '#f5f5f5'
                      : '#f3e8ff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = notif.is_read
                      ? '#fff'
                      : '#f9f3ff';
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <p
                        style={{
                          margin: '0 0 4px 0',
                          fontWeight: notif.is_read ? 400 : 600,
                          fontSize: '13px',
                        }}
                      >
                        {notif.title}
                        {!notif.is_read && (
                          <span
                            style={{
                              display: 'inline-block',
                              width: '6px',
                              height: '6px',
                              backgroundColor: '#7c3aed',
                              borderRadius: '50%',
                              marginLeft: '6px',
                            }}
                          />
                        )}
                      </p>
                      <p
                        style={{
                          margin: 0,
                          fontSize: '12px',
                          color: '#666',
                          wordBreak: 'break-word',
                        }}
                      >
                        {notif.content}
                      </p>
                      <p
                        style={{
                          margin: '4px 0 0 0',
                          fontSize: '11px',
                          color: '#999',
                        }}
                      >
                        {new Date(notif.created_at).toLocaleString('vi-VN')}
                      </p>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        gap: '4px',
                        marginLeft: '8px',
                      }}
                    >
                      {!notif.is_read && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkAsRead(notif.notification_id);
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#7c3aed',
                            fontSize: '12px',
                            padding: '2px 4px',
                          }}
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
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#dc2626',
                          fontSize: '12px',
                          padding: '2px 4px',
                        }}
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
            <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
              Không có thông báo
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
