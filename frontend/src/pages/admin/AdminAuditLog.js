import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { adminService } from '../../services/api';
import '../../styles/dashboard.css';
import '../../styles/admin/admin-auditlog.css';
import '../../styles/admin-layout.css';
import { showToast } from '../../utils/toast';

const ACTION_MAP = {
  CREATE: { vi: 'Tạo mới', color: '#0ea5e9' },
  UPDATE: { vi: 'Cập nhật', color: '#2563eb' },
  DELETE: { vi: 'Xóa', color: '#ef4444' },
  LOGIN: { vi: 'Đăng nhập', color: '#22c55e' },
  LOGIN_FAILED: { vi: 'Đăng nhập thất bại', color: '#dc2626' },
  LOCK: { vi: 'Khóa tài khoản', color: '#f97316' },
  UNLOCK: { vi: 'Mở khóa tài khoản', color: '#14b8a6' },
};

const ROLE_MAP = {
  ADMIN: 'Quản trị viên',
  MANAGER: 'Quản lý',
  TECHNICIAN: 'Kỹ thuật viên',
  WORKER: 'Công nhân',
  ACCOUNTANT: 'Kế toán',
  STOREKEEPER: 'Quản lý kho',
  OWNER: 'Chủ trại',
};

const MODULE_MAP = {
  USER: 'Người dùng',
  USERS: 'Người dùng',
  USER_ROLE: 'Vai trò',
  POND: 'Ao',
  PONDS: 'Ao',
  SEASON: 'Mùa vụ',
  SEASONS: 'Mùa vụ',
  PRODUCT: 'Sản phẩm',
  PRODUCTS: 'Sản phẩm',
  DISEASE: 'Bệnh tôm',
  DISEASES: 'Bệnh tôm',
  SENSOR: 'Cảm biến',
  SENSORS: 'Cảm biến',
  TASK: 'Công việc',
  TASKS: 'Công việc',
  ENVIRONMENT_LOG: 'Nhật ký môi trường',
  FEED_LOG: 'Nhật ký cho ăn',
  CULTIVATION_LOG: 'Nhật ký canh tác',
  NOTIFICATION: 'Thông báo',
  AUTH: 'Xác thực',
};

const DAYS_OPTIONS = [
  { value: 1, label: '24 giờ qua' },
  { value: 7, label: '7 ngày gần nhất' },
  { value: 30, label: '30 ngày gần nhất' },
  { value: 90, label: '90 ngày gần nhất' },
];

const MODULE_OPTIONS = [
  { value: '', label: 'Tất cả module' },
  { value: 'USER', label: 'Người dùng' },
  { value: 'USER_ROLE', label: 'Vai trò' },
  { value: 'POND', label: 'Ao nuôi' },
  { value: 'SEASON', label: 'Mùa vụ' },
  { value: 'TASK', label: 'Công việc' },
  { value: 'DISEASE', label: 'Bệnh tôm' },
  { value: 'SENSOR', label: 'Cảm biến' },
  { value: 'ENVIRONMENT_LOG', label: 'Môi trường' },
  { value: 'FEED_LOG', label: 'Cho ăn' },
  { value: 'NOTIFICATION', label: 'Thông báo' },
];

const SEVERITY_OPTIONS = [
  { value: '', label: 'Tất cả mức độ' },
  { value: 'LOW', label: 'Thấp' },
  { value: 'MEDIUM', label: 'Trung bình' },
  { value: 'HIGH', label: 'Cao' },
];

const ACTION_OPTIONS = [
  { value: '', label: 'Tất cả hành động' },
  { value: 'CREATE', label: 'Tạo mới' },
  { value: 'UPDATE', label: 'Cập nhật' },
  { value: 'DELETE', label: 'Xóa' },
  { value: 'LOGIN', label: 'Đăng nhập' },
  { value: 'LOGIN_FAILED', label: 'Đăng nhập thất bại' },
  { value: 'LOCK', label: 'Khóa tài khoản' },
  { value: 'UNLOCK', label: 'Mở khóa tài khoản' },
];

function normalizeEntityType(entityType) {
  if (!entityType) return '';
  return String(entityType)
    .trim()
    .replace(/[-\s]+/g, '_')
    .replace(/__+/g, '_')
    .toUpperCase();
}

function getSeverityVi(severity) {
  const key = String(severity || 'LOW').toUpperCase();
  if (key === 'HIGH') return 'Cao';
  if (key === 'MEDIUM') return 'Trung bình';
  return 'Thấp';
}

function safeJsonParse(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
}

export const AdminAuditLog = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [uiFilters, setUiFilters] = useState({
    days: 7,
    module: '',
    severity: '',
    action: '',
  });
  const [apiFilters, setApiFilters] = useState({
    days: 7,
    module: '',
    severity: '',
    action: '',
  });

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        days: apiFilters.days,
        limit: 1000,
        offset: 0,
      };
      if (apiFilters.module) params.module = apiFilters.module;
      if (apiFilters.severity) params.severity = apiFilters.severity;
      if (apiFilters.action) params.action = apiFilters.action;

      const response = await adminService.getActivityLogs(params);
      setLogs(response?.data?.data || []);
    } catch (err) {
      showToast({ title: 'Không thể tải nhật ký hoạt động. Vui lòng thử lại.', type: 'error' });
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [apiFilters]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const filteredLogs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return logs.filter((log) => {
      if (!q) return true;
      const actor = String(log.actor_full_name || log.actor_username || '').toLowerCase();
      const action = String(log.action || '').toLowerCase();
      const entity = String(log.entity_label || log.entity_type || '').toLowerCase();
      const details = String(log.details || '').toLowerCase();
      const ip = String(log.ip_address || '').toLowerCase();
      return actor.includes(q) || action.includes(q) || entity.includes(q) || details.includes(q) || ip.includes(q);
    });
  }, [logs, searchQuery]);

  const severityCounts = useMemo(() => {
    return filteredLogs.reduce(
      (acc, item) => {
        const key = String(item.risk_level || 'LOW').toUpperCase();
        if (key === 'HIGH') acc.high += 1;
        else if (key === 'MEDIUM') acc.medium += 1;
        else acc.low += 1;
        return acc;
      },
      { low: 0, medium: 0, high: 0 }
    );
  }, [filteredLogs]);

  const activityBars = useMemo(() => {
    const bins = Array.from({ length: 12 }, (_, idx) => ({
      idx,
      label: `${String(idx * 2).padStart(2, '0')}:00`,
      count: 0,
    }));

    filteredLogs.forEach((log) => {
      const raw = log.logged_at || log.created_at;
      const date = raw ? new Date(raw) : null;
      if (!date || Number.isNaN(date.getTime())) return;
      const hour = date.getHours();
      const index = Math.min(11, Math.floor(hour / 2));
      bins[index].count += 1;
    });

    const maxCount = Math.max(...bins.map((b) => b.count), 1);
    return bins.map((bin) => ({
      ...bin,
      height: Math.max(8, Math.round((bin.count / maxCount) * 92)),
    }));
  }, [filteredLogs]);

  const alerts = useMemo(() => {
    const failedByIp = {};
    filteredLogs.forEach((log) => {
      if (String(log.action || '').toUpperCase() !== 'LOGIN_FAILED') return;
      const ip = log.ip_address || 'Không xác định';
      failedByIp[ip] = (failedByIp[ip] || 0) + 1;
    });

    const flaggedIp = Object.entries(failedByIp)
      .sort((a, b) => b[1] - a[1])[0];

    const highRiskCount = severityCounts.high;
    const rows = [];

    if (flaggedIp && flaggedIp[1] >= 2) {
      rows.push({
        title: 'IP bị gắn cờ',
        detail: `${flaggedIp[0]} (${flaggedIp[1]} lần thất bại)`,
      });
    }

    if (highRiskCount > 0) {
      rows.push({
        title: 'Sự kiện rủi ro cao',
        detail: `${highRiskCount} bản ghi`,
      });
    }

    return rows.slice(0, 3);
  }, [filteredLogs, severityCounts.high]);

  const donutTotal = Math.max(1, severityCounts.low + severityCounts.medium + severityCounts.high);
  const lowPct = Math.round((severityCounts.low / donutTotal) * 100);
  const medPct = Math.round((severityCounts.medium / donutTotal) * 100);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredLogs.length);
  const paginatedLogs = filteredLogs.slice(startIndex, endIndex);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const onUiFilterChange = (name, value) => {
    setUiFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleApplyFilter = () => {
    setCurrentPage(1);
    setApiFilters(uiFilters);
  };

  const handleExport = () => {
    try {
      const csvContent = [
        ['Thời gian', 'Người dùng', 'Hành động', 'Mô-đun', 'Mô tả', 'IP', 'Trạng thái', 'Mức độ rủi ro'],
        ...filteredLogs.map((log) => {
          const actionInfo = ACTION_MAP[log.action] || { vi: log.action || '-' };
          const status = String(log.action || '').toUpperCase() === 'LOGIN_FAILED' ? 'Thất bại' : 'Thành công';
          const detailsObj = safeJsonParse(log.details);
          const detailsText = detailsObj ? JSON.stringify(detailsObj) : (log.details || '-');
          return [
            new Date(log.logged_at || log.created_at || Date.now()).toLocaleString('vi-VN'),
            log.actor_full_name || log.actor_username || '-',
            actionInfo.vi,
            MODULE_MAP[normalizeEntityType(log.entity_type)] || log.entity_type || '-',
            detailsText,
            log.ip_address || '-',
            status,
            getSeverityVi(log.risk_level),
          ];
        }),
      ].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');

      const csvWithBOM = '\uFEFF' + csvContent;
      const element = document.createElement('a');
      element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvWithBOM));
      element.setAttribute('download', `nhat-ky-hoat-dong-${new Date().toISOString().split('T')[0]}.csv`);
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
    <div className="dashboard admin-page admin-auditlog-page">
      {/* Toasts will display errors if any */}

      <div className="admin-auditlog__top">
        <div className="admin-auditlog__search">
          <span className="admin-auditlog__search-icon">🔎</span>
          <input
            type="text"
            placeholder="Tìm kiếm người dùng, hành động, địa chỉ IP..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="filter-input"
          />
        </div>

        <div className="admin-auditlog__cards">
          <div className="card card--chart">
            <div className="card__title-row">
              <h4>Hoạt động theo thời gian</h4>
              <span className="card__chip">24 giờ</span>
            </div>
            <div className="sparkline" aria-hidden="true">
              {activityBars.map((bar) => (
                <div key={bar.idx} className="sparkline__item" title={`${bar.label}: ${bar.count} sự kiện`}>
                  <span style={{ height: `${bar.height}px` }}></span>
                </div>
              ))}
            </div>
            <div className="sparkline__labels">
              <span>00:00</span>
              <span>08:00</span>
              <span>16:00</span>
              <span>22:00</span>
            </div>
          </div>

          <div className="card card--donut">
            <div className="card__title-row">
              <h4>Mức độ rủi ro</h4>
            </div>
            <div className="donut-legend">
              <div
                className="donut"
                style={{
                  background: `conic-gradient(#22c55e 0 ${lowPct}%, #f59e0b ${lowPct}% ${Math.min(100, lowPct + medPct)}%, #ef4444 ${Math.min(100, lowPct + medPct)}% 100%)`,
                }}
              ></div>
              <div className="legend">
                <div><span className="dot dot--active" /> Thấp: {severityCounts.low}</div>
                <div><span className="dot dot--warning" /> Trung bình: {severityCounts.medium}</div>
                <div><span className="dot dot--danger" /> Cao: {severityCounts.high}</div>
              </div>
            </div>
          </div>

          <div className="card card--alerts">
            <div className="card__title-row">
              <h4>Cảnh báo</h4>
            </div>
            {alerts.length > 0 ? (
              <div className="alerts-list">
                {alerts.map((item) => (
                  <div className="alerts-item" key={`${item.title}-${item.detail}`}>
                    <strong>{item.title}</strong>
                    <span>{item.detail}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="alerts-empty">Không có cảnh báo bất thường</div>
            )}
          </div>
        </div>
      </div>

      <div className="filter-section admin-auditlog__filters">
        <div className="filter-grid">
          <div className="filter-item">
            <label>Khoảng thời gian</label>
            <select className="filter-input" value={uiFilters.days} onChange={(e) => onUiFilterChange('days', Number(e.target.value))}>
              {DAYS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div className="filter-item">
            <label>Mô-đun</label>
            <select className="filter-input" value={uiFilters.module} onChange={(e) => onUiFilterChange('module', e.target.value)}>
              {MODULE_OPTIONS.map((option) => (
                <option key={option.value || 'ALL_MODULE'} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div className="filter-item">
            <label>Mức độ rủi ro</label>
            <select className="filter-input" value={uiFilters.severity} onChange={(e) => onUiFilterChange('severity', e.target.value)}>
              {SEVERITY_OPTIONS.map((option) => (
                <option key={option.value || 'ALL_RISK'} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div className="filter-item">
            <label>Loại hành động</label>
            <select className="filter-input" value={uiFilters.action} onChange={(e) => onUiFilterChange('action', e.target.value)}>
              {ACTION_OPTIONS.map((option) => (
                <option key={option.value || 'ALL_ACTION'} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div className="filter-item filter-actions">
            <button onClick={handleApplyFilter} className="btn-primary">Áp dụng</button>
            <button onClick={handleExport} className="btn-secondary">Xuất CSV</button>
          </div>
        </div>
      </div>

      <div className="table-container">
        <div className="admin-auditlog__table-head">
          <h3>Lịch sử hoạt động chi tiết</h3>
          <span>{filteredLogs.length === 0 ? 0 : startIndex + 1}-{endIndex} trên {filteredLogs.length} bản ghi</span>
        </div>
        <table className="data-table admin-auditlog__table-wide">
          <thead>
            <tr>
              <th className="admin-auditlog__col-time">Thời gian</th>
              <th className="admin-auditlog__col-user">Người dùng</th>
              <th className="admin-auditlog__col-action">Hành động</th>
              <th className="admin-auditlog__col-module">Mô-đun</th>
              <th className="admin-auditlog__col-ip">Địa chỉ IP</th>
              <th className="admin-auditlog__col-status">Trạng thái</th>
              <th className="admin-auditlog__col-severity">Mức độ</th>
            </tr>
          </thead>
          <tbody>
            {paginatedLogs.length > 0 ? (
              paginatedLogs.map((log, idx) => {
                const actionInfo = ACTION_MAP[log.action] || { vi: log.action || '-', color: '#64748b' };
                const actorLabel = log.actor_full_name || log.actor_username || 'Không xác định';
                const moduleName = MODULE_MAP[normalizeEntityType(log.entity_type)] || log.entity_type || '-';
                const status = String(log.action || '').toUpperCase() === 'LOGIN_FAILED' ? 'Thất bại' : 'Thành công';
                const severity = String(log.risk_level || 'LOW').toUpperCase();
                const roleText = ROLE_MAP[log.actor_role] || log.actor_role || '-';
                const ipText = log.ip_address || '-';

                return (
                  <tr key={log.audit_id || idx}>
                    <td className="admin-auditlog__col-time">{new Date(log.logged_at || log.created_at || Date.now()).toLocaleString('vi-VN')}</td>
                    <td className="admin-auditlog__col-user">
                      <div className="actor-info">
                        <strong className="admin-auditlog__truncate admin-auditlog__tooltip" data-tooltip={actorLabel}>{actorLabel}</strong>
                        <small className="admin-auditlog__truncate admin-auditlog__tooltip" data-tooltip={roleText}>{roleText}</small>
                      </div>
                    </td>
                    <td className="admin-auditlog__col-action">
                      <span className="action-badge admin-auditlog__action-badge" style={{ '--action-bg': actionInfo.color }}>
                        {actionInfo.vi}
                      </span>
                    </td>
                    <td className="admin-auditlog__col-module">
                      <span className="admin-auditlog__truncate admin-auditlog__tooltip" data-tooltip={moduleName}>{moduleName}</span>
                    </td>
                    <td className="admin-auditlog__col-ip">
                      <span className="admin-auditlog__truncate admin-auditlog__tooltip" data-tooltip={ipText}>{ipText}</span>
                    </td>
                    <td className="admin-auditlog__col-status">
                      <span className={`admin-auditlog__status ${status === 'Thất bại' ? 'admin-auditlog__status--failed' : 'admin-auditlog__status--success'}`}>
                        {status}
                      </span>
                    </td>
                    <td className="admin-auditlog__col-severity">
                      <span className={`admin-auditlog__severity admin-auditlog__severity--${severity.toLowerCase()}`}>
                        {getSeverityVi(severity)}
                      </span>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="7" className="empty-cell">Không có dữ liệu phù hợp</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="admin-auditlog__pagination">
        <div className="admin-auditlog__page-controls">
          <label>Số mục mỗi trang:</label>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>
        <div className="admin-auditlog__pager">
          <button className="btn btn-sm btn-secondary" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={safePage <= 1}>‹</button>
          <span className="admin-auditlog__page-pill">{safePage}</span>
          <button className="btn btn-sm btn-secondary" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages}>›</button>
        </div>
        <div className="admin-auditlog__pagination-info">Tổng: {filteredLogs.length} bản ghi</div>
      </div>
    </div>
  );
};

export default AdminAuditLog;
