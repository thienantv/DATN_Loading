import React, { useEffect, useState } from 'react';
import { adminService } from '../../services/api';
import '../../styles/dashboard.css';
import '../../styles/global.css';
import '../../styles/admin/admin-user-login-history.css';
import '../../styles/admin-layout.css';
import { showToast } from '../../utils/toast';

const AdminUserLoginHistory = () => {
  const [loginLogs, setLoginLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchLoginLogs();
  }, []);

  const fetchLoginLogs = async () => {
    try {
      setLoading(true);
      const response = await adminService.getActivityLogs({ limit: 500, days: 30 });
      const data = response?.data?.data || [];
      const sorted = [...data].sort((left, right) => {
        const leftTime = new Date(left.logged_at || left.created_at || 0).getTime();
        const rightTime = new Date(right.logged_at || right.created_at || 0).getTime();
        return rightTime - leftTime;
      });
      setLoginLogs(sorted);
    } catch (err) {
      showToast({ title: 'Lỗi khi tải lịch sử đăng nhập', type: 'error' });
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Không xác định';
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getActorLabel = (log) => log.actor_full_name || log.full_name || log.username || log.actor_username || `Người dùng #${log.user_id || log.actor_id || '-'}`;

  const getActorAvatarUrl = (log) => log.actor_avatar_url || log.avatar_url || log.avatarUrl || '';

  const getStatusValue = (log) => {
    const actionName = String(log.action || '').toUpperCase();
    if (actionName === 'LOGIN_FAILED') return 'FAILED';
    if (actionName === 'LOGIN') return 'SUCCESS';

    const rawStatus = String(log.status || log.login_status || log.result || '').toLowerCase();
    if (['success', 'successful', 'thanh cong', 'thành công', 'ok'].includes(rawStatus)) return 'SUCCESS';
    if (['fail', 'failed', 'thất bại', 'that bai', 'error', 'denied'].includes(rawStatus)) return 'FAILED';
    if (log.is_success === true || log.is_success === 1) return 'SUCCESS';
    if (log.is_success === false || log.is_success === 0) return 'FAILED';
    return 'SUCCESS';
  };

  const getRiskLevel = (log) => {
    // Prefer server-computed risk_level if present
    if (log.risk_level) return String(log.risk_level).toUpperCase();

    const ipMissing = !String(log.ip_address || log.client_ip || '').trim();
    const deviceMissing = !String(log.device_info || log.device || '').trim();
    const browserMissing = !String(log.browser || log.user_agent || '').trim();

    if (ipMissing || deviceMissing) return 'HIGH';
    if (browserMissing) return 'MEDIUM';
    return 'LOW';
  };

  const getRiskLabel = (level) => {
    switch (level) {
      case 'HIGH':
        return 'Cao';
      case 'MEDIUM':
        return 'Trung bình';
      default:
        return 'Thấp';
    }
  };

  const getRiskClass = (level) => {
    switch (level) {
      case 'HIGH':
        return 'admin-user-login-history_risk-pill admin-user-login-history_risk-pill--high';
      case 'MEDIUM':
        return 'admin-user-login-history_risk-pill admin-user-login-history_risk-pill--medium';
      default:
        return 'admin-user-login-history_risk-pill admin-user-login-history_risk-pill--low';
    }
  };

  const getStatusLabel = (value) => (value === 'FAILED' ? 'Thất bại' : 'Thành công');

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const loginEntries = loginLogs.filter((log) => {
    const actionName = String(log.action || '').toUpperCase();
    return actionName === 'LOGIN' || actionName === 'LOGIN_FAILED';
  });

  const totalCount = loginEntries.length;
  const todayCount = loginEntries.filter((log) => new Date(log.logged_at || log.created_at || 0) >= startOfDay).length;
  const last24hCount = loginEntries.filter((log) => new Date(log.logged_at || log.created_at || 0) >= last24h).length;
  const highRiskCount = loginEntries.filter((log) => getRiskLevel(log) === 'HIGH').length;
  const mediumRiskCount = loginEntries.filter((log) => getRiskLevel(log) === 'MEDIUM').length;
  const lowRiskCount = loginEntries.filter((log) => getRiskLevel(log) === 'LOW').length;

  const recentDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (6 - index));
    const key = date.toISOString().slice(0, 10);
    return {
      key,
      label: `${date.getDate()}/${date.getMonth() + 1}`,
      count: loginEntries.filter((log) => {
        const logDate = new Date(log.logged_at || log.created_at || 0).toISOString().slice(0, 10);
        return logDate === key;
      }).length,
    };
  });

  const maxTrendCount = Math.max(...recentDays.map((item) => item.count), 1);
  const trendPoints = recentDays.map((item, index) => ({
    ...item,
    x: 24 + (index * 76),
    y: 148 - Math.round((item.count / maxTrendCount) * 108),
  }));
  const trendPath = trendPoints.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');

  const filteredLogs = loginEntries.filter((log) => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const actorLabel = getActorLabel(log).toLowerCase();
    const username = String(log.actor_username || log.username || '').toLowerCase();
    const ipAddress = String(log.ip_address || log.client_ip || '').toLowerCase();
    const device = String(log.device_info || log.device || '').toLowerCase();
    const browser = String(log.browser || log.user_agent || '').toLowerCase();
    const operatingSystem = String(log.operating_system || log.os || '').toLowerCase();
    const location = String(log.location || log.address || '').toLowerCase();

    const searchMatched =
      !normalizedSearch ||
      actorLabel.includes(normalizedSearch) ||
      username.includes(normalizedSearch) ||
      ipAddress.includes(normalizedSearch) ||
      device.includes(normalizedSearch) ||
      browser.includes(normalizedSearch) ||
      operatingSystem.includes(normalizedSearch) ||
      location.includes(normalizedSearch);

    const statusValue = getStatusValue(log);
    const statusMatched = statusFilter === 'ALL' || statusValue === statusFilter;

    const riskValue = getRiskLevel(log);
    const riskMatched = riskFilter === 'ALL' || riskValue === riskFilter;

    return searchMatched && statusMatched && riskMatched;
  });

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredLogs.length);
  const paginatedLogs = filteredLogs.slice(startIndex, endIndex);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  return (
    <div className="dashboard admin-user-login-history admin-page">
      <div className="admin-user-login-history_page-head">
        <div>
          <h2>Lịch sử đăng nhập</h2>
          <p>Theo dõi lượt đăng nhập, IP, thiết bị, trình duyệt và mức rủi ro của toàn bộ tài khoản trong hệ thống.</p>
        </div>
      </div>

      <div className="admin-user-login-history_toolbar">
        <div className="admin-user-login-history_search-box admin-user-login-history_search-box--wide">
          <span className="admin-user-login-history_search-icon">⌕</span>
          <input
            type="text"
            placeholder="Tìm kiếm người dùng, IP, thiết bị, trình duyệt..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="admin-user-login-history_search-input"
          />
        </div>

        <select
          className="admin-user-login-history_filter-select"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setCurrentPage(1);
          }}
        >
          <option value="ALL">Tất cả trạng thái</option>
          <option value="SUCCESS">Thành công</option>
          <option value="FAILED">Thất bại</option>
        </select>

        <select
          className="admin-user-login-history_filter-select"
          value={riskFilter}
          onChange={(e) => {
            setRiskFilter(e.target.value);
            setCurrentPage(1);
          }}
        >
          <option value="ALL">Tất cả rủi ro</option>
          <option value="LOW">Thấp</option>
          <option value="MEDIUM">Trung bình</option>
          <option value="HIGH">Cao</option>
        </select>
      </div>

      {loading ? (
        <div className="admin-user-login-history_loading-shell">
          <div className="spinner"></div>
        </div>
      ) : (
        <>
          <section className="admin-user-login-history_hero-grid">
            <article className="admin-user-login-history_card admin-user-login-history_card--summary">
              <div className="admin-user-login-history_card-header">
                <h3>Tóm tắt đăng nhập (24 giờ)</h3>
                <button className="btn btn-secondary btn-sm" type="button" onClick={fetchLoginLogs}>Làm mới</button>
              </div>
              <div className="admin-user-login-history_summary-main">
                <strong>{last24hCount.toLocaleString('vi-VN')}</strong>
                <span>Lượt đăng nhập gần nhất</span>
              </div>
              <div className="admin-user-login-history_summary-metrics">
                <div><span className="dot dot--active" /> Hôm nay: {todayCount}</div>
                <div><span className="dot dot--idle" /> Tổng: {totalCount}</div>
                <div><span className="dot dot--light" /> Rủi ro cao: {highRiskCount}</div>
              </div>
              <div className="admin-user-login-history_mini-bars" aria-hidden="true">
                {recentDays.map((item) => (
                  <span key={item.key} style={{ height: `${Math.max(12, (item.count / maxTrendCount) * 100)}%` }} />
                ))}
              </div>
            </article>

            <article className="admin-user-login-history_card admin-user-login-history_card--chart">
              <div className="admin-user-login-history_card-header">
                <h3>Biểu đồ đăng nhập</h3>
                <span className="admin-user-login-history_pill">7 ngày gần đây</span>
              </div>
              <div className="admin-user-login-history_line-chart">
                <svg viewBox="0 0 540 220" aria-label="Biểu đồ đăng nhập">
                  {[0, 1, 2, 3].map((line) => {
                    const y = 28 + (108 / 3) * line;
                    return <line key={line} x1="24" y1={y} x2="516" y2={y} className="admin-user-login-history_grid-line" />;
                  })}
                  <path d={trendPath} className="admin-user-login-history_trend-path" />
                  {trendPoints.map((point) => (
                    <g key={point.key}>
                      <circle cx={point.x} cy={point.y} r="4" className="admin-user-login-history_trend-dot" />
                      <text x={point.x} y="204" textAnchor="middle" className="admin-user-login-history_trend-label">{point.label}</text>
                    </g>
                  ))}
                </svg>
                <div className="admin-user-login-history_chart-legend">
                  <span><i className="admin-user-login-history_legend-dot admin-user-login-history_legend-dot--success" /> Thành công</span>
                  <span><i className="admin-user-login-history_legend-dot admin-user-login-history_legend-dot--failure" /> Thất bại</span>
                </div>
              </div>
            </article>

            <article className="admin-user-login-history_card admin-user-login-history_card--risk">
              <div className="admin-user-login-history_card-header">
                <h3>Phân tích rủi ro & thiết bị</h3>
                <span className="admin-user-login-history_pill">Đã lọc</span>
              </div>
              <div className="admin-user-login-history_donut-wrap">
                <div className="admin-user-login-history_donut" style={{ background: `conic-gradient(#2563eb 0 ${Math.max(1, (lowRiskCount / Math.max(totalCount, 1)) * 100)}%, #f59e0b ${Math.max(1, (lowRiskCount / Math.max(totalCount, 1)) * 100)}% ${Math.max(1, ((lowRiskCount + mediumRiskCount) / Math.max(totalCount, 1)) * 100)}%, #dc2626 ${Math.max(1, ((lowRiskCount + mediumRiskCount) / Math.max(totalCount, 1)) * 100)}% 100%)` }}>
                  <div className="admin-user-login-history_donut-center">
                    <strong>{totalCount}</strong>
                    <span>tổng lượt</span>
                  </div>
                </div>
                <div className="admin-user-login-history_donut-legend">
                  <div><span className="dot dot--active" /> Thấp: {lowRiskCount}</div>
                  <div><span className="dot dot--warning" /> Trung bình: {mediumRiskCount}</div>
                  <div><span className="dot dot--danger" /> Cao: {highRiskCount}</div>
                </div>
              </div>
            </article>
          </section>

          <section className="admin-user-login-history_table-card">
            <div className="admin-user-login-history_table-head">
              <div>
                <h3>Chi tiết lịch sử đăng nhập</h3>
                <p>{filteredLogs.length === 0 ? 0 : startIndex + 1}-{endIndex} trên {filteredLogs.length}</p>
              </div>
              <div className="admin-user-login-history_table-actions">
                <div className="admin-user-login-history_page-size">
                  <label htmlFor="pageSize">Số mục trên trang:</label>
                  <select
                    id="pageSize"
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
              </div>
            </div>

            <div className="admin-user-login-history_table-wrap">
              <table className="admin-user-login-history_table">
                <thead>
                  <tr>
                    <th>Người dùng</th>
                    <th>Thời gian đăng nhập</th>
                    <th>IP</th>
                    <th>Thiết bị</th>
                    <th>Trình duyệt</th>
                    <th>Hệ điều hành</th>
                    <th>Trạng thái</th>
                    <th>Mức rủi ro</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedLogs.length > 0 ? (
                    paginatedLogs.map((log, index) => {
                      const statusValue = getStatusValue(log);
                      const riskValue = getRiskLevel(log);
                      const rowId = log.audit_id || log.log_id || `${log.user_id || 'user'}-${index}`;

                      return (
                        <tr key={rowId}>
                          <td>
                            <div className="admin-user-login-history_user-cell">
                              <div className="admin-user-login-history_avatar">
                                {getActorAvatarUrl(log) ? (
                                  <img src={getActorAvatarUrl(log)} alt={getActorLabel(log)} className="admin-user-login-history_avatar-image" />
                                ) : (
                                  String(getActorLabel(log)).charAt(0).toUpperCase()
                                )}
                              </div>
                              <div>
                                <div className="admin-user-login-history_user-name">{getActorLabel(log)}</div>
                                <div className="admin-user-login-history_user-subtext">@{log.actor_username || log.username || 'Không xác định'}</div>
                              </div>
                            </div>
                          </td>
                          <td>{formatDate(log.logged_at || log.created_at || log.login_time)}</td>
                          <td>{log.ip_address || log.client_ip || 'Không xác định'}</td>
                          <td>{log.device_info || log.device || 'Không xác định'}</td>
                          <td>{log.browser || log.user_agent || 'Không xác định'}</td>
                          <td>{log.operating_system || log.os || 'Không xác định'}</td>
                          <td>
                            <span className={`admin-user-login-history_status-pill admin-user-login-history_status-pill--${statusValue === 'FAILED' ? 'failed' : 'success'}`}>
                              {getStatusLabel(statusValue)}
                            </span>
                          </td>
                          <td>
                            <span className={getRiskClass(riskValue)}>{getRiskLabel(riskValue)}{log.risk_score !== undefined ? ` • ${log.risk_score}` : ''}</span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="8" className="admin-user-login-history_empty-row">Không có dữ liệu phù hợp</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="admin-user-login-history_pagination">
              <span className="admin-user-login-history_pagination-info">{filteredLogs.length === 0 ? 0 : startIndex + 1}-{endIndex} trên {filteredLogs.length}</span>
              <div className="admin-user-login-history_pagination-controls">
                <button type="button" className="btn btn-sm btn-secondary" onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))} disabled={safePage <= 1}>‹</button>
                <span className="admin-user-login-history_page-pill">{safePage}</span>
                <button type="button" className="btn btn-sm btn-secondary" onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))} disabled={safePage >= totalPages}>›</button>
              </div>
            </div>
          </section>
        </>
      )}

      {/* Errors are shown via global toasts */}
    </div>
  );
};

export default AdminUserLoginHistory;
