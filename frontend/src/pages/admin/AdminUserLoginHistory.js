import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/api';
import '../../styles/dashboard.css';
import '../../styles/global.css';
import '../../styles/admin-user-login-history.css';

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
    (user.fullname || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const displayLoginLogs = (() => {
    const sortedLogs = [...loginLogs].sort((left, right) => Number(left.log_id) - Number(right.log_id));

    if (sortedLogs.length === 0) {
      return [];
    }

    const logsById = new Map(sortedLogs.map((log) => [Number(log.log_id), log]));
    const minLogId = Number(sortedLogs[0].log_id);
    const maxLogId = Number(sortedLogs[sortedLogs.length - 1].log_id);
    const rows = [];

    for (let logId = minLogId; logId <= maxLogId; logId += 1) {
      const log = logsById.get(logId);
      if (log) {
        rows.push({ ...log, isMissing: false });
      } else {
        rows.push({
          log_id: logId,
          login_time: null,
          ip_address: null,
          device_info: null,
          isMissing: true,
        });
      }
    }

    return rows;
  })();

  return (
    <div className="dashboard admin-user-login-history">
      <div className="dashboard-header">
        <h1>📝 Lịch sử đăng nhập người dùng</h1>
        <p>Xem hoạt động đăng nhập theo từng người dùng trong hệ thống</p>
      </div>
      
      <div className="admin-user-login-history__main">
        {/* Left Panel - Users List */}
        <div className="admin-user-login-history__left-panel">
          <h2>👥 Danh sách người dùng</h2>
          
          <div className="admin-user-login-history__search-box">
            <input
              type="text"
              placeholder="Tìm kiếm theo tên, username hoặc email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="admin-user-login-history__search-input"
            />
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
                    <div className="admin-user-login-history__user-name">{user.fullname || 'N/A'}</div>
                    <div className="admin-user-login-history__user-email">{user.email || 'N/A'}</div>
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
              <h2>📋 Lịch sử đăng nhập: {selectedUser?.fullname || 'N/A'}</h2>
              
              <div className="admin-user-login-history__user-details-card">
                <div className="admin-user-login-history__detail-row">
                  <span className="admin-user-login-history__detail-label">Tên đầy đủ:</span>
                  <span>{selectedUser.fullname || 'N/A'}</span>
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
                          className={`admin-user-login-history__table-row ${log.isMissing ? 'admin-user-login-history__table-row--missing' : ''}`}
                        >
                          <td className="admin-user-login-history__td admin-user-login-history__td--2">
                            {log.isMissing ? 'Thiếu dữ liệu' : formatDate(log.login_time)}
                          </td>
                          <td className="admin-user-login-history__td admin-user-login-history__td--2">
                            {log.isMissing ? (
                              <span className="admin-user-login-history__missing-badge">Thiếu</span>
                            ) : (
                              <span className="admin-user-login-history__ip-badge">{log.ip_address || 'N/A'}</span>
                            )}
                          </td>
                          <td className="admin-user-login-history__td admin-user-login-history__td--1">
                            {log.isMissing ? 'N/A' : (log.device_info || 'N/A')}
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

const styles = {
  container: {
    padding: '20px',
    backgroundColor: '#f5f5f5',
    minHeight: '100vh'
  },
  mainContent: {
    display: 'flex',
    gap: '20px',
    marginTop: '20px',
    height: 'calc(100vh - 150px)'
  },
  leftPanel: {
    flex: '0 0 35%',
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    display: 'flex',
    flexDirection: 'column'
  },
  rightPanel: {
    flex: '1',
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto'
  },
  searchBox: {
    marginBottom: '15px'
  },
  searchInput: {
    width: '100%',
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    boxSizing: 'border-box'
  },
  usersList: {
    flex: 1,
    overflowY: 'auto',
    borderTop: '1px solid #eee'
  },
  userItem: {
    padding: '12px',
    borderBottom: '1px solid #eee',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  userInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px'
  },
  userName: {
    fontWeight: '600',
    fontSize: '14px',
    color: '#333'
  },
  userEmail: {
    fontSize: '12px',
    color: '#666'
  },
  userRole: {
    display: 'flex',
    gap: '8px'
  },
  roleBadge: {
    padding: '2px 8px',
    borderRadius: '4px',
    color: '#fff',
    fontSize: '11px',
    fontWeight: '500',
    width: 'fit-content'
  },
  userDetailsCard: {
    backgroundColor: '#f9f9f9',
    padding: '15px',
    borderRadius: '4px',
    marginBottom: '20px',
    borderLeft: '4px solid #2196F3'
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid #eee',
    fontSize: '14px'
  },
  detailLabel: {
    fontWeight: '600',
    color: '#666',
    minWidth: '120px'
  },
  logsTable: {
    flex: 1,
    overflowY: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '10px'
  },
  tableHeader: {
    backgroundColor: '#f5f5f5',
    position: 'sticky',
    top: 0,
    zIndex: 1
  },
  th: {
    padding: '12px',
    textAlign: 'left',
    fontWeight: '600',
    fontSize: '13px',
    color: '#333',
    borderBottom: '2px solid #ddd'
  },
  tableRow: {
    borderBottom: '1px solid #eee',
    transition: 'background-color 0.2s'
  },
  td: {
    padding: '12px',
    fontSize: '13px',
    color: '#555'
  },
  ipBadge: {
    backgroundColor: '#e8f5e9',
    padding: '2px 6px',
    borderRadius: '3px',
    fontSize: '12px',
    fontFamily: 'monospace',
    color: '#2e7d32'
  },
  missingBadge: {
    backgroundColor: '#fff3cd',
    color: '#8a6d3b',
    padding: '2px 6px',
    borderRadius: '3px',
    fontSize: '12px',
    fontWeight: '500'
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    color: '#999'
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '10px'
  },
  emptyText: {
    fontSize: '16px'
  },
  loadingText: {
    textAlign: 'center',
    padding: '20px',
    color: '#999'
  },
  noData: {
    textAlign: 'center',
    padding: '20px',
    color: '#999'
  },
  errorMessage: {
    backgroundColor: '#ffebee',
    color: '#c62828',
    padding: '12px',
    borderRadius: '4px',
    marginTop: '10px',
    fontSize: '14px'
  }
};

export default AdminUserLoginHistory;
