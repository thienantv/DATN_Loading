import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/api';
import '../../styles/global.css';

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

  return (
    <div style={styles.container}>
      <h1>📝 Lịch sử đăng nhập người dùng</h1>
      
      <div style={styles.mainContent}>
        {/* Left Panel - Users List */}
        <div style={styles.leftPanel}>
          <h2>👥 Danh sách người dùng</h2>
          
          <div style={styles.searchBox}>
            <input
              type="text"
              placeholder="Tìm kiếm theo tên, username hoặc email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.searchInput}
            />
          </div>

          <div style={styles.usersList}>
            {loading && !selectedUser ? (
              <p style={styles.loadingText}>Đang tải...</p>
            ) : filteredUsers.length > 0 ? (
              filteredUsers.map(user => (
                <div
                  key={user.user_id}
                  onClick={() => fetchLoginLogs(user.user_id)}
                  style={{
                    ...styles.userItem,
                    backgroundColor: selectedUser?.user_id === user.user_id ? '#e3f2fd' : '#fff',
                    borderLeft: selectedUser?.user_id === user.user_id ? '4px solid #2196F3' : '4px solid transparent'
                  }}
                >
                  <div style={styles.userInfo}>
                    <div style={styles.userName}>{user.fullname || 'N/A'}</div>
                    <div style={styles.userEmail}>{user.email || 'N/A'}</div>
                    <div style={styles.userRole}>
                      <span style={{
                        ...styles.roleBadge,
                        backgroundColor: 
                          user.role === 'ADMIN' ? '#f44336' : 
                          user.role === 'MANAGER' ? '#ff9800' : 
                          '#4caf50'
                      }}>
                        {user.role || 'USER'}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p style={styles.noData}>Không có người dùng</p>
            )}
          </div>
        </div>

        {/* Right Panel - Login Logs */}
        <div style={styles.rightPanel}>
          {selectedUser ? (
            <>
              <h2>📋 Lịch sử đăng nhập: {selectedUser?.fullname || 'N/A'}</h2>
              
              <div style={styles.userDetailsCard}>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Tên đầy đủ:</span>
                  <span>{selectedUser.fullname || 'N/A'}</span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Username:</span>
                  <span>{selectedUser.username || 'N/A'}</span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Email:</span>
                  <span>{selectedUser.email || 'N/A'}</span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Vai trò:</span>
                  <span style={{
                    ...styles.roleBadge,
                    backgroundColor: 
                      selectedUser.role === 'ADMIN' ? '#f44336' : 
                      selectedUser.role === 'MANAGER' ? '#ff9800' : 
                      '#4caf50'
                  }}>
                    {selectedUser.role || 'USER'}
                  </span>
                </div>
              </div>

              <div style={styles.logsTable}>
                {loading ? (
                  <p style={styles.loadingText}>Đang tải lịch sử đăng nhập...</p>
                ) : loginLogs.length > 0 ? (
                  <table style={styles.table}>
                    <thead>
                      <tr style={styles.tableHeader}>
                        <th style={{...styles.th, flex: 2}}>Thời gian đăng nhập</th>
                        <th style={{...styles.th, flex: 2}}>Địa chỉ IP</th>
                        <th style={{...styles.th, flex: 1}}>Thiết bị</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loginLogs.map((log) => (
                        <tr key={log.log_id} style={styles.tableRow}>
                          <td style={{...styles.td, flex: 2}}>{formatDate(log.login_time)}</td>
                          <td style={{...styles.td, flex: 2}}>
                            <span style={styles.ipBadge}>{log.ip_address}</span>
                          </td>
                          <td style={{...styles.td, flex: 1}}>
                            {log.device_info || 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p style={styles.noData}>Chưa có lịch sử đăng nhập</p>
                )}
              </div>
            </>
          ) : (
            <div style={styles.emptyState}>
              <p style={styles.emptyIcon}>👈</p>
              <p style={styles.emptyText}>Chọn một người dùng để xem lịch sử đăng nhập</p>
            </div>
          )}
        </div>
      </div>

      {error && <div style={styles.errorMessage}>{error}</div>}
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
