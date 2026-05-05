import React, { useState, useEffect, useCallback } from 'react';
import { adminService } from '../../services/api';
import '../../styles/dashboard.css';

export const AdminAuditLog = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    userId: '',
    action: '',
    entityType: '',
    startDate: '',
    endDate: '',
  });

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
        ['User ID', 'Action', 'Entity Type', 'Entity ID', 'Description', 'Timestamp'],
        ...logs.map(log => [
          log.user_id,
          log.action,
          log.entity_type,
          log.entity_id,
          log.description,
          new Date(log.created_at).toLocaleString('vi-VN')
        ])
      ].map(row => row.join(',')).join('\n');

      const element = document.createElement('a');
      element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent));
      element.setAttribute('download', `audit-logs-${new Date().toISOString()}.csv`);
      element.style.display = 'none';
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    } catch (err) {
      console.error('Export error:', err);
    }
  };

  const actionColors = {
    CREATE: '#10b981',
    UPDATE: '#3b82f6',
    DELETE: '#ef4444',
    LOGIN: '#8b5cf6',
    LOCK: '#f97316',
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
        <p>Theo dõi tất cả các hoạt động trên hệ thống</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Filters */}
      <div className="filter-section">
        <h3>🔍 Bộ lọc</h3>
        <div className="filter-grid">
          <div className="filter-item">
            <label>User ID</label>
            <input
              type="text"
              name="userId"
              value={filters.userId}
              onChange={handleFilterChange}
              placeholder="Nhập User ID"
              className="filter-input"
            />
          </div>

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
              <option value="LOCK">Khóa</option>
            </select>
          </div>

          <div className="filter-item">
            <label>Entity Type</label>
            <select
              name="entityType"
              value={filters.entityType}
              onChange={handleFilterChange}
              className="filter-input"
            >
              <option value="">-- Tất cả --</option>
              <option value="USER">User</option>
              <option value="POND">Ao</option>
              <option value="SEASON">Mùa vụ</option>
              <option value="DISEASE">Bệnh</option>
              <option value="PRODUCT">Sản phẩm</option>
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
              <th>User ID</th>
              <th>Hành động</th>
              <th>Entity Type</th>
              <th>Entity ID</th>
              <th>Mô tả</th>
              <th>Thời gian</th>
            </tr>
          </thead>
          <tbody>
            {logs.length > 0 ? (
              logs.map((log, idx) => (
                <tr key={idx}>
                  <td>{log.user_id}</td>
                  <td>
                    <span
                      className="action-badge"
                      style={{ backgroundColor: actionColors[log.action] || '#6b7280' }}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td>{log.entity_type}</td>
                  <td>{log.entity_id}</td>
                  <td>{log.description}</td>
                  <td>{new Date(log.created_at).toLocaleString('vi-VN')}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="empty-cell">
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

        .action-badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 4px;
          color: white;
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
          font-size: 14px;
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
