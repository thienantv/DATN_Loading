import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/api';
import '../../styles/dashboard.css';
import '../../styles/admin/admin-dashboard.css';
import '../../styles/admin-layout.css';
import DashboardCard from '../../components/DashboardCard';
import '../../styles/dashboard-cards.css';

export const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchUsers();
    fetchRecentLogins();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await adminService.getAllUsers();
      setUsers(response.data.data || []);
    } catch (err) {
      setError('Lỗi tải danh sách người dùng');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const [recentLogins, setRecentLogins] = useState([]);

  const activeCount = users.filter(u => u.status === true || u.status === 'true' || u.status === 1).length;
  const lockedCount = users.length - activeCount;

  const fetchRecentLogins = async () => {
    try {
      const resp = await adminService.getActivityLogs({ action: 'LOGIN', limit: 6 });
      const data = (resp.data && resp.data.data) || [];
      // Ensure newest first
      data.sort((a, b) => new Date(b.logged_at) - new Date(a.logged_at));
      setRecentLogins(data);
    } catch (err) {
      console.error('Error fetching recent logins', err);
    }
  };

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
    <div className="dashboard admin-page">

      {error && <div className="alert alert-error">{error}</div>}

      <div className="admin-dashboard-main">
        <div className="left-column">
          <div className="admin-summary-row">
            <div className="card no-rating">
              <DashboardCard title="Tổng người dùng" value={users.length} description="Số tài khoản hiện có" />
            </div>

            <div className="card no-rating">
              <DashboardCard title="Còn hoạt động" value={activeCount} rating="cao" description="Tài khoản đang hoạt động" />
            </div>

            <div className="card no-rating">
              <DashboardCard title="Đã khoá" value={lockedCount} rating="canh_bao" description="Tài khoản đã bị khoá" />
            </div>
          </div>

          <div className="card quick-actions" style={{ marginTop: 16 }}>
            <div className="btn-group" style={{ marginTop: 8 }}>
              <a className="btn btn-primary" href="/admin/users">Quản lý người dùng</a>
              <a className="btn btn-secondary" href="/admin/user-login-history">Lịch sử đăng nhập</a>
            </div>
          </div>
        </div>

        <div className="right-column">
          <div className="card">
            <h3>Người dùng đăng nhập gần đây</h3>
            {recentLogins.length > 0 ? (
              <ul className="recent-logins-list">
                {recentLogins.map((log) => (
                  <li key={`login-${log.audit_id}`}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{log.actor_full_name || log.actor_username || `#${log.user_id}`}</div>
                      <div className="meta">{log.actor_username || '-'}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.95rem' }}>{new Date(log.logged_at).toLocaleString('vi-VN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</div>
                      <div className="meta">{log.entity_label || log.entity_type}</div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p>Chưa có hoạt động đăng nhập gần đây.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
