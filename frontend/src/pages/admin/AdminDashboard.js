import React, { useEffect, useState } from 'react';
import { adminService } from '../../services/api';
import '../../styles/dashboard.css';
import '../../styles/admin/admin-dashboard.css';
import '../../styles/admin-layout.css';
import { showToast } from '../../utils/toast';

export const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [recentLogins, setRecentLogins] = useState([]);
  const [loginTrend, setLoginTrend] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const getMonthKey = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  };

  const buildLoginTrend = (logs) => {
    const now = new Date();
    const months = [];

    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: getMonthKey(d),
        label: `Th${d.getMonth() + 1}`,
        count: 0,
      });
    }

    const monthMap = months.reduce((acc, item) => {
      acc[item.key] = item;
      return acc;
    }, {});

    logs.forEach((log) => {
      const parsed = new Date(log.logged_at || log.created_at || Date.now());
      const key = getMonthKey(parsed);
      if (monthMap[key]) {
        monthMap[key].count += 1;
      }
    });

    return months;
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [usersResponse, loginResponse] = await Promise.all([
        adminService.getAllUsers(),
        adminService.getActivityLogs({ action: 'LOGIN', limit: 120 }),
      ]);

      const userData = usersResponse?.data?.data || [];
      const loginData = loginResponse?.data?.data || [];

      loginData.sort((a, b) => new Date(b.logged_at) - new Date(a.logged_at));

      setUsers(userData);
      setRecentLogins(loginData.slice(0, 6));
      setLoginTrend(buildLoginTrend(loginData));
    } catch (err) {
      showToast({ title: 'Lỗi tải dữ liệu dashboard admin', type: 'error' });
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const activeCount = users.filter((u) => u.status === true || u.status === 'true' || u.status === 1).length;
  const lockedCount = users.length - activeCount;

  const now = new Date();
  const newUsersThisMonth = users.filter((u) => {
    if (!u.created_at) return false;
    const createdAt = new Date(u.created_at);
    return createdAt.getMonth() === now.getMonth() && createdAt.getFullYear() === now.getFullYear();
  }).length;

  const ownerCount = users.filter((u) => String(u.role || '').toUpperCase() === 'OWNER').length;

  const maxTrend = Math.max(...loginTrend.map((item) => item.count), 1);
  const svgWidth = 540;
  const svgHeight = 220;
  const padding = 28;
  const chartWidth = svgWidth - padding * 2;
  const chartHeight = svgHeight - padding * 2;

  const linePoints = loginTrend.map((item, index) => {
    const x = padding + (chartWidth / Math.max(loginTrend.length - 1, 1)) * index;
    const y = padding + chartHeight - (item.count / maxTrend) * chartHeight;
    return { ...item, x, y };
  });

  const linePath = linePoints
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');

  const activePercent = users.length ? Math.round((activeCount / users.length) * 100) : 0;
  const lockedPercent = Math.max(0, 100 - activePercent);

  const alerts = [
    {
      level: lockedCount > 0 ? 'warning' : 'success',
      message: lockedCount > 0 ? `Có ${lockedCount} tài khoản đang bị khóa` : 'Không có tài khoản bị khóa',
    },
    {
      level: ownerCount === 0 ? 'danger' : 'info',
      message: ownerCount === 0 ? 'Chưa có tài khoản OWNER nào trong hệ thống' : `Đang có ${ownerCount} tài khoản OWNER`,
    },
    {
      level: recentLogins.length === 0 ? 'warning' : 'info',
      message: recentLogins.length === 0 ? 'Không có hoạt động đăng nhập gần đây' : `Đã ghi nhận ${recentLogins.length} đăng nhập gần nhất`,
    },
  ];

  if (loading) {
    return (
      <div className="dashboard">
        <div className="flex-center admin-dashboard__loading-container">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard admin-page admin-analytics">
      {/* Toasts will display errors if any */}

      <section className="admin-hero-grid">
        <article className="admin-kpi-card">
          <p className="admin-kpi-card__label">Tổng người dùng</p>
          <h3 className="admin-kpi-card__value">{users.length.toLocaleString('vi-VN')}</h3>
          <p className="admin-kpi-card__sub">Toàn bộ tài khoản trong hệ thống</p>
        </article>

        <article className="admin-kpi-card">
          <p className="admin-kpi-card__label">Người dùng hoạt động</p>
          <div className="admin-kpi-card__row">
            <h3 className="admin-kpi-card__value">{activeCount.toLocaleString('vi-VN')}</h3>
            <span className="admin-pill admin-pill--success">Hoạt động</span>
          </div>
          <p className="admin-kpi-card__sub">{activePercent}% tổng số tài khoản</p>
        </article>

        <article className="admin-kpi-card">
          <p className="admin-kpi-card__label">Tài khoản bị khóa</p>
          <div className="admin-kpi-card__row">
            <h3 className="admin-kpi-card__value">{lockedCount.toLocaleString('vi-VN')}</h3>
            <span className="admin-pill admin-pill--warning">Cảnh báo</span>
          </div>
          <p className="admin-kpi-card__sub">Cần rà soát nguyên nhân khóa</p>
        </article>

        <article className="admin-kpi-card">
          <p className="admin-kpi-card__label">Người dùng mới tháng này</p>
          <div className="admin-kpi-card__row">
            <h3 className="admin-kpi-card__value">{newUsersThisMonth.toLocaleString('vi-VN')}</h3>
            <span className="admin-pill admin-pill--info">Tăng</span>
          </div>
          <p className="admin-kpi-card__sub">Tăng trưởng theo tháng hiện tại</p>
        </article>
      </section>

      <section className="admin-chart-grid">
        <article className="card admin-chart-card">
          <div className="admin-card-header">
            <h3>Thống kê đăng nhập</h3>
          </div>
          <div className="admin-line-chart">
            {loginTrend.length > 0 ? (
              <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} aria-label="Biểu đồ đăng nhập">
                {[0, 1, 2, 3].map((line) => {
                  const y = padding + (chartHeight / 3) * line;
                  return (
                    <line
                      key={`grid-${line}`}
                      x1={padding}
                      y1={y}
                      x2={svgWidth - padding}
                      y2={y}
                      className="admin-line-chart__grid"
                    />
                  );
                })}

                <path d={linePath} className="admin-line-chart__path" />

                {linePoints.map((point) => (
                  <g key={point.key}>
                    <circle cx={point.x} cy={point.y} r="4" className="admin-line-chart__dot" />
                    <text x={point.x} y={svgHeight - 6} textAnchor="middle" className="admin-line-chart__label">
                      {point.label}
                    </text>
                  </g>
                ))}
              </svg>
            ) : (
              <p>Chưa có dữ liệu đăng nhập để hiển thị biểu đồ.</p>
            )}
          </div>
        </article>

        <article className="card admin-chart-card">
          <div className="admin-card-header">
            <h3>Phân tích hoạt động người dùng</h3>
          </div>

          <div className="admin-donut-wrap">
            <div
              className="admin-donut"
              style={{ background: `conic-gradient(#2563eb 0 ${activePercent}%, #93c5fd ${activePercent}% 100%)` }}
            >
              <div className="admin-donut__center">
                <span>{activePercent}%</span>
              </div>
            </div>

            <div className="admin-donut-legend">
              <div><span className="dot dot--active" /> Hoạt động: {activeCount}</div>
              <div><span className="dot dot--idle" /> Bị khóa: {lockedCount}</div>
              <div><span className="dot dot--light" /> Không hoạt động: {lockedPercent}%</div>
            </div>
          </div>
        </article>
      </section>

      <section className="admin-bottom-grid">
        <article className="card admin-table-card">
          <div className="admin-card-header">
            <h3>Nhật ký đăng nhập gần đây</h3>
            <a className="btn btn-secondary btn-sm" href="/admin/user-login-history">Xem đầy đủ</a>
          </div>

          <div className="admin-login-table-wrap">
            <table className="admin-login-table">
              <thead>
                <tr>
                  <th>Tên người dùng</th>
                  <th>Username</th>
                  <th>Thời gian</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {recentLogins.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="admin-table-empty">Chưa có hoạt động đăng nhập gần đây.</td>
                  </tr>
                ) : (
                  recentLogins.map((log) => (
                    <tr key={`login-${log.audit_id}`}>
                      <td>{log.actor_full_name || `Người dùng #${log.user_id}`}</td>
                      <td>{log.actor_username || '-'}</td>
                      <td>
                        {new Date(log.logged_at).toLocaleString('vi-VN', {
                          year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
                        })}
                      </td>
                      <td><span className="admin-status admin-status--success">Thành công</span></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </article>

        <article className="card admin-alerts-card">
          <div className="admin-card-header">
            <h3>Cảnh báo hệ thống</h3>
          </div>

          <ul className="admin-alert-list">
            {alerts.map((alertItem, index) => (
              <li key={`alert-${index}`} className={`admin-alert-item admin-alert-item--${alertItem.level}`}>
                <span className="admin-alert-icon">⚠</span>
                <span>{alertItem.message}</span>
              </li>
            ))}
          </ul>

          <div className="admin-alert-actions">
            <a className="btn btn-primary" href="/admin/users">Quản lý người dùng</a>
            <a className="btn btn-secondary" href="/admin/activity-logs">Xem nhật ký</a>
          </div>
        </article>
      </section>
    </div>
  );
};

export default AdminDashboard;
