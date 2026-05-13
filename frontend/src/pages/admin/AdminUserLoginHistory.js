import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/api';
import '../../styles/dashboard.css';
import '../../styles/global.css';
import '../../styles/admin/admin-user-login-history.css';
import '../../styles/admin-layout.css';

const AdminUserLoginHistory = () => {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loginLogs, setLoginLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await adminService.getAllUsers();
      if (response.data.success) {
        setUsers(response.data.data);
      }
      setError('');
    } catch (err) {
      setError('Lỗi khi tải danh sách người dùng');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLoginLogs = async (userId) => {
    try {
      setLoading(true);
      const response = await adminService.getUserLoginLogs(userId);
      if (response.data.success) {
        setLoginLogs(response.data.data);
        const user = users.find(u => u.user_id === userId);
        setSelectedUser(user);
      }
      setError('');
    } catch (err) {
      setError('Lỗi khi tải lịch sử đăng nhập');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
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

  const filteredUsers = users.filter(user =>
    (user.full_name || user.fullname || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedUserLabel = selectedUser?.full_name || selectedUser?.fullname || 'Chưa chọn người dùng';

  const displayLoginLogs = (() => {
    return [...loginLogs]
      .sort((left, right) => {
        const leftTime = left.login_time ? new Date(left.login_time).getTime() : 0;
        const rightTime = right.login_time ? new Date(right.login_time).getTime() : 0;

        if (rightTime !== leftTime) {
          return rightTime - leftTime;
        }

        return Number(right.log_id) - Number(left.log_id);
      })
      .map((log) => ({
        ...log,
        isFullyMissing: !log.login_time && !log.ip_address && !log.device_info,
      }));
  })();

  const validLoginLogs = loginLogs
    .filter((log) => log.login_time)
    .slice()
    .sort((left, right) => new Date(right.login_time) - new Date(left.login_time));

  const latestLogin = validLoginLogs[0] || null;
  const firstLogin = validLoginLogs[validLoginLogs.length - 1] || null;
  const missingLogCount = displayLoginLogs.filter((log) => !log.login_time || !log.ip_address || !log.device_info).length;

  return (
    <div className="dashboard admin-user-login-history admin-page">
      <div className="admin-user-login-history__main">
        <div className="admin-user-login-history__left-panel">
          <div className="admin-user-login-history__section-head">
            <div className="admin-user-login-history__list-heading-row">
              <h2>👥 Danh sách người dùng</h2>
              <span className="admin-user-login-history__count-badge">{filteredUsers.length}/{users.length}</span>
            </div>
          </div>
          
          <div className="admin-user-login-history__search-box">
            <input
              type="text"
              placeholder="Tìm kiếm theo tên, username hoặc email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="admin-user-login-history__search-input"
            />
          </div>

          <div className="admin-user-login-history__selection-summary">
            <span className="admin-user-login-history__selection-label">Đang xem:</span>
            <span className="admin-user-login-history__selection-value">{selectedUserLabel}</span>
          </div>

          <div className="admin-user-login-history__users-list">
            {loading && !selectedUser ? (
              <p className="admin-user-login-history__loading-text">Đang tải...</p>
            ) : filteredUsers.length > 0 ? (
              filteredUsers.map(user => (
                <div
                  key={user.user_id}
                  onClick={() => fetchLoginLogs(user.user_id)}
                  className={`admin-user-login-history__user-item ${selectedUser?.user_id === user.user_id ? 'admin-user-login-history__user-item--selected' : ''}`}
                >
                  <div className="admin-user-login-history__user-info">
                    <div className="admin-user-login-history__user-topline">
                      <div className="admin-user-login-history__user-name">{user.full_name || user.fullname || 'N/A'}</div>
                      <span className="admin-user-login-history__user-pointer">Xem log</span>
                    </div>
                    <div className="admin-user-login-history__user-meta">@{user.username || 'N/A'} · {user.email || 'N/A'}</div>
                    <div className="admin-user-login-history__user-role">
                      <span className={`role-badge role-badge--${(user.role || 'user').toLowerCase()}`}>{user.role || 'USER'}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="admin-user-login-history__no-data">Không có người dùng</p>
            )}
          </div>
        </div>

        {/* Right Panel - Login Logs */}
        <div className="admin-user-login-history__right-panel">
          {selectedUser ? (
            <>
              <div className="admin-user-login-history__section-head">
                <h2>📋 Lịch sử đăng nhập: {selectedUser?.full_name || selectedUser?.fullname || 'N/A'}</h2>
              </div>

              <div className="admin-user-login-history__summary-grid">
                <div className="admin-user-login-history__summary-card">
                  <span className="admin-user-login-history__summary-label">Người dùng</span>
                  <span className="admin-user-login-history__summary-value">{selectedUser.full_name || selectedUser.fullname || 'N/A'}</span>
                  <span className="admin-user-login-history__summary-subvalue">ID: {selectedUser.user_id || 'N/A'}</span>
                </div>
                <div className="admin-user-login-history__summary-card">
                  <span className="admin-user-login-history__summary-label">Vai trò</span>
                  <span className={`role-badge role-badge--${(selectedUser.role || 'user').toLowerCase()}`}>{selectedUser.role || 'USER'}</span>
                  <span className="admin-user-login-history__summary-subvalue">Username: {selectedUser.username || 'N/A'}</span>
                </div>
                <div className="admin-user-login-history__summary-card">
                  <span className="admin-user-login-history__summary-label">Lượt log</span>
                  <span className="admin-user-login-history__summary-value">{loginLogs.length}</span>
                  <span className="admin-user-login-history__summary-subvalue">Thiếu dữ liệu: {missingLogCount}</span>
                </div>
                <div className="admin-user-login-history__summary-card">
                  <span className="admin-user-login-history__summary-label">Đăng nhập gần nhất</span>
                  <span className="admin-user-login-history__summary-value">{latestLogin ? formatDate(latestLogin.login_time) : 'N/A'}</span>
                  <span className="admin-user-login-history__summary-subvalue">Đăng nhập đầu tiên: {firstLogin ? formatDate(firstLogin.login_time) : 'N/A'}</span>
                </div>
              </div>
              
              <div className="admin-user-login-history__user-details-card">
                <div className="admin-user-login-history__detail-grid">
                <div className="admin-user-login-history__detail-row">
                  <span className="admin-user-login-history__detail-label">Tên đầy đủ:</span>
                  <span>{selectedUser.full_name || selectedUser.fullname || 'N/A'}</span>
                </div>
                <div className="admin-user-login-history__detail-row">
                  <span className="admin-user-login-history__detail-label">Username:</span>
                  <span>{selectedUser.username || 'N/A'}</span>
                </div>
                <div className="admin-user-login-history__detail-row">
                  <span className="admin-user-login-history__detail-label">Email:</span>
                  <span>{selectedUser.email || 'N/A'}</span>
                </div>
                <div className="admin-user-login-history__detail-row">
                  <span className="admin-user-login-history__detail-label">Vai trò:</span>
                  <span className={`role-badge role-badge--${(selectedUser.role || 'user').toLowerCase()}`}>{selectedUser.role || 'USER'}</span>
                </div>
                <div className="admin-user-login-history__detail-row">
                  <span className="admin-user-login-history__detail-label">Số lượt đăng nhập:</span>
                  <span>{loginLogs.length || 0}</span>
                </div>
                <div className="admin-user-login-history__detail-row">
                  <span className="admin-user-login-history__detail-label">IP gần nhất:</span>
                  <span>{latestLogin?.ip_address || 'N/A'}</span>
                </div>
                <div className="admin-user-login-history__detail-row">
                  <span className="admin-user-login-history__detail-label">Thiết bị gần nhất:</span>
                  <span>{latestLogin?.device_info || 'N/A'}</span>
                </div>
                </div>
              </div>

              <div className="admin-user-login-history__logs-table">
                {loading ? (
                  <p className="admin-user-login-history__loading-text">Đang tải lịch sử đăng nhập...</p>
                ) : loginLogs.length > 0 ? (
                  <table className="admin-user-login-history__table">
                    <thead>
                      <tr className="admin-user-login-history__table-header">
                        <th className="admin-user-login-history__th admin-user-login-history__th--2">Thời gian đăng nhập</th>
                        <th className="admin-user-login-history__th admin-user-login-history__th--2">Địa chỉ IP</th>
                        <th className="admin-user-login-history__th admin-user-login-history__th--1">Thiết bị</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayLoginLogs.map((log) => (
                        <tr
                          key={`log-${log.log_id}`}
                          className={`admin-user-login-history__table-row ${log.isFullyMissing ? 'admin-user-login-history__table-row--missing' : ''}`}
                        >
                          <td className="admin-user-login-history__td admin-user-login-history__td--2">
                            {formatDate(log.login_time)}
                          </td>
                          <td className="admin-user-login-history__td admin-user-login-history__td--2">
                            {!log.ip_address ? (
                              <span className="admin-user-login-history__missing-badge">Thiếu</span>
                            ) : (
                              <span className="admin-user-login-history__ip-badge">{log.ip_address || 'N/A'}</span>
                            )}
                          </td>
                          <td className="admin-user-login-history__td admin-user-login-history__td--1">
                            {log.device_info || 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="admin-user-login-history__no-data">Chưa có lịch sử đăng nhập</p>
                )}
              </div>
            </>
          ) : (
            <div className="admin-user-login-history__empty-state">
              <p className="admin-user-login-history__empty-icon">👈</p>
              <p className="admin-user-login-history__empty-text">Chọn một người dùng để xem lịch sử đăng nhập</p>
            </div>
          )}
        </div>
      </div>

      {error && <div className="admin-user-login-history__error-message">{error}</div>}
    </div>
  );
};

export default AdminUserLoginHistory;
