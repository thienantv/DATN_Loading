import React, { useState, useEffect, useCallback } from 'react';
import { adminService } from '../../services/api';
import '../../styles/dashboard.css';

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
        <div className="flex-center" style={{ minHeight: '400px' }}>
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
                        className="action-badge"
                        style={{ backgroundColor: actionInfo.color }}
                      >
                        {actionInfo.vi}
                      </span>
                    </td>
                    <td>
                      <div className="entity-info">
                        <strong>{getEntityLabel(log)}</strong>
                        {log.entity_id ? (
                          <small style={{ color: '#6b7280' }}>ID: {log.entity_id}</small>
                        ) : (
                          <small style={{ color: '#d1d5db' }}>-</small>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="time-info">
                        <div>{new Date(log.logged_at || log.created_at).toLocaleDateString('vi-VN')}</div>
                        <small style={{ color: '#6b7280' }}>
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

      <style>{`
        .filter-section {
          background: white;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 30px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .filter-section h3 {
          margin: 0 0 20px 0;
          color: #374151;
          font-size: 16px;
        }

        .filter-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
          align-items: flex-end;
        }

        .filter-item {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .filter-item label {
          font-size: 13px;
          font-weight: 600;
          color: #374151;
        }

        .filter-input {
          padding: 8px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 13px;
          font-family: inherit;
          transition: all 0.2s;
        }

        .filter-input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
        }

        .filter-actions {
          display: flex;
          gap: 10px;
        }

        .btn-primary, .btn-secondary {
          padding: 8px 16px;
          border: none;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .btn-primary {
          background-color: #3b82f6;
          color: white;
        }

        .btn-primary:hover {
          background-color: #2563eb;
        }

        .btn-secondary {
          background-color: #f3f4f6;
          color: #374151;
          border: 1px solid #d1d5db;
        }

        .btn-secondary:hover {
          background-color: #e5e7eb;
        }

        .table-container {
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .data-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }

        .data-table thead {
          background-color: #f9fafb;
          border-bottom: 2px solid #e5e7eb;
        }

        .data-table th {
          padding: 12px;
          text-align: left;
          font-weight: 600;
          color: #374151;
        }

        .data-table td {
          padding: 12px;
          border-bottom: 1px solid #e5e7eb;
        }

        .data-table tbody tr:hover {
          background-color: #f9fafb;
        }

        .actor-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .actor-info strong {
          color: #1f2937;
        }

        .entity-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .entity-info small {
          font-family: 'Monaco', 'Courier New', monospace;
        }

        .time-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .time-info small {
          color: #6b7280;
          font-size: 11px;
        }

        .action-badge {
          display: inline-block;
          padding: 6px 12px;
          border-radius: 4px;
          color: white;
          font-weight: 600;
          font-size: 12px;
        }

        .role-badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 4px;
          background-color: #dbeafe;
          color: #1e40af;
          font-weight: 600;
          font-size: 12px;
        }

        .empty-cell {
          text-align: center;
          color: #9ca3af;
          padding: 40px 12px !important;
        }

        .alert {
          padding: 12px 16px;
          border-radius: 6px;
          margin-bottom: 20px;
          font-size: 13px;
        }

        .alert-error {
          background-color: #fee2e2;
          color: #991b1b;
          border: 1px solid #fecaca;
        }
      `}</style>
    </div>
  );
};

export default AdminAuditLog;
