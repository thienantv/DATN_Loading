import React, { useState, useEffect, useCallback } from 'react';
import { adminService } from '../../services/api';
import '../../styles/dashboard.css';
import '../../styles/admin/admin-auditlog.css';
import '../../styles/admin-layout.css';

export const AdminAuditLog = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    action: '',
    startDate: '',
    endDate: '',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

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
    STOREKEEPER: 'Quản lý kho',
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

  // derived
  const filtered = logs.filter((log) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    const actor = (log.actor_full_name || log.username || log.actor_username || '').toString().toLowerCase();
    const action = (log.action || '').toString().toLowerCase();
    const entity = (log.entity_label || log.entity_type || '').toString().toLowerCase();
    const desc = (log.details || '').toString().toLowerCase();
    const ip = (log.ip_address || '').toString().toLowerCase();
    return actor.includes(q) || action.includes(q) || entity.includes(q) || desc.includes(q) || ip.includes(q);
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filtered.length);
  const paginated = filtered.slice(startIndex, endIndex);

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

      // Add UTF-8 BOM for proper Vietnamese text in Excel
      const csvWithBOM = '\uFEFF' + csvContent;
      
      const element = document.createElement('a');
      element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvWithBOM));
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
            <div className="admin-auditlog__top">
              <div className="admin-auditlog__search">
                <input
                  type="text"
                  placeholder="Tìm kiếm người dùng, log, cài đặt..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  className="filter-input"
                />
              </div>
              <div className="admin-auditlog__cards">
                <div className="card card--chart">
                  <h4>Real-time Activity</h4>
                  <div className="sparkline">
                    <svg viewBox="0 0 300 80">
                      {/* simple placeholder bars based on recent logs */}
                      {Array.from({ length: 12 }).map((_, i) => {
                        const val = Math.round(Math.random() * 40 + (i * 5));
                        const x = 10 + i * 22;
                        const h = Math.max(4, Math.min(60, val));
                        return <rect key={i} x={x} y={80 - h} width="14" height={h} fill="#3b82f6" opacity="0.85" />;
                      })}
                    </svg>
                  </div>
                </div>
                <div className="card card--donut">
                  <h4>Severities</h4>
                  <div className="donut-legend">
                    <div className="donut" />
                    <div className="legend">
                      <div><span className="dot dot--active" /> Low</div>
                      <div><span className="dot dot--warning" /> Medium</div>
                      <div><span className="dot dot--danger" /> High</div>
                    </div>
                  </div>
                </div>
                <div className="card card--alerts">
                  <h4>Alerts</h4>
                  <div className="alerts-empty">Không có cảnh báo</div>
                </div>
              </div>
            </div>

            <div className="filter-section" style={{ marginTop: 18 }}>
              <div className="filter-grid">
                <div className="filter-item">
                  <label>Last 7 Days</label>
                  <select className="filter-input" name="lastRange" onChange={() => {}}>
                    <option>Last 7 Days</option>
                    <option>Last 30 Days</option>
                    <option>All Time</option>
                  </select>
                </div>
                <div className="filter-item">
                  <label>Module</label>
                  <select className="filter-input" name="module" onChange={() => {}}>
                    <option>All Modules</option>
                    <option>Auth</option>
                    <option>UserMgmt</option>
                  </select>
                </div>
                <div className="filter-item">
                  <label>Severity</label>
                  <select className="filter-input" name="severity" onChange={() => {}}>
                    <option>All Severities</option>
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                  </select>
                </div>
                <div className="filter-item filter-actions">
                  <button onClick={handleApplyFilter} className="btn-primary">Apply</button>
                  <button onClick={handleExport} className="btn-secondary">Export</button>
                </div>
              </div>
            </div>

            <div className="table-container">
              <table className="data-table admin-auditlog__table-wide">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>User</th>
                    <th>Action Type</th>
                    <th>Description</th>
                    <th>Module</th>
                    <th>IP Address</th>
                    <th>Status</th>
                    <th>Severity</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.length > 0 ? (
                    paginated.map((log, idx) => {
                      const actionInfo = actionMap[log.action] || { vi: log.action, color: '#6b7280' };
                      const actorLabel = log.actor_full_name || log.username || log.actor_username || 'Unknown';
                      const desc = log.details || log.entity_label || '';
                      const moduleName = log.entity_type || '-';
                      const status = log.action === 'LOGIN_FAILED' ? 'Failed' : 'Success';
                      const severity = (log.risk_level || 'LOW').toString();

                      return (
                        <tr key={`${log.audit_id || idx}`}>
                          <td>
                            <div className="time-info">
                              <div>{new Date(log.logged_at || log.created_at).toLocaleString('vi-VN')}</div>
                            </div>
                          </td>
                          <td>
                            <div className="actor-info">
                              <strong>{actorLabel}</strong>
                              <small className="admin-auditlog__entity-id">@{log.actor_username || log.username || ''}</small>
                            </div>
                          </td>
                          <td>
                            <span className="action-badge admin-auditlog__action-badge" style={{ '--action-bg': actionInfo.color }}>{actionInfo.vi}</span>
                          </td>
                          <td>
                            <div className="entity-info"><strong>{desc || '-'}</strong></div>
                          </td>
                          <td>{moduleName}</td>
                          <td>{log.ip_address || log.client_ip || '-'}</td>
                          <td><span className={`role-badge`}>{status}</span></td>
                          <td><span className={`admin-auditlog__severity admin-auditlog__severity--${severity.toLowerCase()}`}>{severity}</span></td>
                          <td><button className="btn-secondary btn-sm">View Detail</button></td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="9" className="empty-cell">Không có dữ liệu</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="admin-auditlog__pagination">
              <div className="admin-auditlog__page-controls">
                <label>Số mục trên trang:</label>
                <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
              <div className="admin-auditlog__pager">
                <button className="btn btn-sm btn-secondary" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safePage <= 1}>‹</button>
                <span className="admin-auditlog__page-pill">{safePage}</span>
                <button className="btn btn-sm btn-secondary" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages}>›</button>
              </div>
              <div className="admin-auditlog__pagination-info">{startIndex + 1}-{endIndex} trên {filtered.length}</div>
            </div>
              </tr>
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
};

export default AdminAuditLog;
