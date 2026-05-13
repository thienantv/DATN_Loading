import React, { useState, useEffect, useCallback } from 'react';
import { adminService } from '../../services/api';
import '../../styles/dashboard.css';
import '../../styles/admin-auditlog.css';

export const AdminAuditLog = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    action: '',
    startDate: '',
    endDate: '',
  });

  // Mapping actions to Vietnamese descriptions
  const actionMap = {
    CREATE: { vi: 'Tạo mới', color: '#10b981' },
    UPDATE: { vi: 'Cập nhật', color: '#3b82f6' },
    DELETE: { vi: 'Xóa', color: '#ef4444' },
    LOGIN: { vi: 'Đăng nhập', color: '#8b5cf6' },
    LOGIN_FAILED: { vi: 'Đăng nhập thất bại', color: '#dc2626' },
    LOCK: { vi: 'Khóa tài khoản', color: '#f97316' },
    UNLOCK: { vi: 'Mở khóa tài khoản', color: '#06b6d4' },
  };

  // Role display names
  const roleMap = {
    ADMIN: 'Quản trị viên',
    MANAGER: 'Quản lý',
    TECHNICIAN: 'Kỹ thuật viên',
    WORKER: 'Công nhân',
    ACCOUNTANT: 'Kế toán',
  };

  const fallbackEntityMap = {
    USER: 'Người dùng',
    USERS: 'Người dùng',
    USER_ROLE: 'Vai trò',
    USER_ROLES: 'Vai trò',
    POND: 'Ao',
    PONDS: 'Ao',
    SEASON: 'Mùa vụ',
    SEASONS: 'Mùa vụ',
    PRODUCT: 'Sản phẩm',
    PRODUCTS: 'Sản phẩm',
    SENSOR: 'Cảm biến',
    SENSORS: 'Cảm biến',
    TASK: 'Công việc',
    TASKS: 'Công việc',
    DISEASE: 'Bệnh tôm',
    DISEASES: 'Bệnh tôm',
    ENVIRONMENT_LOG: 'Nhật ký môi trường',
    ENVIRONMENT_LOGS: 'Nhật ký môi trường',
    FEED_LOG: 'Nhật ký cho ăn',
    FEED_LOGS: 'Nhật ký cho ăn',
    CULTIVATION_LOG: 'Nhật ký canh tác',
    CULTIVATION_LOGS: 'Nhật ký canh tác',
    NOTIFICATION: 'Thông báo',
    NOTIFICATIONS: 'Thông báo',
  };

  const normalizeEntityType = (entityType) => {
    if (!entityType) return '';

    return String(entityType)
      .trim()
      .replace(/[-\s]+/g, '_')
      .replace(/__+/g, '_')
      .toUpperCase();
  };

  const getEntityLabel = (log) => {
    const normalizedEntityType = normalizeEntityType(log.entity_type);

    if (log.entity_label && log.entity_label !== 'Không xác định') {
      return log.entity_label;
    }

    return fallbackEntityMap[normalizedEntityType] || log.entity_label || log.entity_type || '-';
  };

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const response = await adminService.getActivityLogs(filters);
      setLogs(response.data.data || []);
    } catch (err) {
      setError('Lỗi tải activity logs');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleApplyFilter = () => {
    fetchLogs();
  };

  const handleExport = () => {
    try {
      const csvContent = [
        ['Vai trò', 'Hành động', 'Đối tượng', 'Thời gian'],
        ...logs.map(log => [
          roleMap[log.actor_role] || log.actor_role || '',
          actionMap[log.action]?.vi || log.action,
          getEntityLabel(log),
          new Date(log.logged_at || log.created_at).toLocaleString('vi-VN')
        ])
      ].map(row => row.map(cell => `"${cell.toString().replace(/"/g, '""')}"`).join(',')).join('\n');

      const element = document.createElement('a');
      element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent));
      element.setAttribute('download', `audit-logs-${new Date().toISOString().split('T')[0]}.csv`);
      element.style.display = 'none';
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    } catch (err) {
      console.error('Export error:', err);
    }
  };

  if (loading) {
    return (
      <div className="dashboard">
        <div className="flex-center admin-auditlog__loading-container">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>📋 Nhật ký hoạt động hệ thống</h1>
        <p>Theo dõi tất cả các hoạt động của {logs.length} bản ghi</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Filters */}
      <div className="filter-section">
        <h3>🔍 Bộ lọc</h3>
        <div className="filter-grid">
          <div className="filter-item">
            <label>Hành động</label>
            <select
              name="action"
              value={filters.action}
              onChange={handleFilterChange}
              className="filter-input"
            >
              <option value="">-- Tất cả --</option>
              <option value="CREATE">Tạo mới</option>
              <option value="UPDATE">Cập nhật</option>
              <option value="DELETE">Xóa</option>
              <option value="LOGIN">Đăng nhập</option>
              <option value="LOGIN_FAILED">Đăng nhập thất bại</option>
              <option value="LOCK">Khóa tài khoản</option>
              <option value="UNLOCK">Mở khóa tài khoản</option>
            </select>
          </div>

          <div className="filter-item">
            <label>Từ ngày</label>
            <input
              type="date"
              name="startDate"
              value={filters.startDate}
              onChange={handleFilterChange}
              className="filter-input"
            />
          </div>

          <div className="filter-item">
            <label>Đến ngày</label>
            <input
              type="date"
              name="endDate"
              value={filters.endDate}
              onChange={handleFilterChange}
              className="filter-input"
            />
          </div>

          <div className="filter-item filter-actions">
            <button onClick={handleApplyFilter} className="btn-primary">
              🔍 Áp dụng bộ lọc
            </button>
            <button onClick={handleExport} className="btn-secondary">
              📥 Xuất CSV
            </button>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Vai trò</th>
              <th>Hành động</th>
              <th>Đối tượng</th>
              <th>Thời gian</th>
            </tr>
          </thead>
          <tbody>
            {logs.length > 0 ? (
              logs.map((log, idx) => {
                const actionInfo = actionMap[log.action] || { vi: log.action, color: '#6b7280' };
                
                return (
                  <tr key={idx}>
                    <td>
                      <span className="role-badge">
                        {roleMap[log.actor_role] || log.actor_role || '-'}
                      </span>
                    </td>
                    <td>
                      <span
                        className="action-badge admin-auditlog__action-badge"
                        style={{ '--action-bg': actionInfo.color }}
                      >
                        {actionInfo.vi}
                      </span>
                    </td>
                    <td>
                      <div className="entity-info">
                        <strong>{getEntityLabel(log)}</strong>
                        {log.entity_id ? (
                          <small className="admin-auditlog__entity-id">ID: {log.entity_id}</small>
                        ) : (
                          <small className="admin-auditlog__entity-separator">-</small>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="time-info">
                        <div>{new Date(log.logged_at || log.created_at).toLocaleDateString('vi-VN')}</div>
                        <small className="admin-auditlog__time-text">
                          {new Date(log.logged_at || log.created_at).toLocaleTimeString('vi-VN')}
                        </small>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="4" className="empty-cell">
                  Không có dữ liệu
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
};

export default AdminAuditLog;
