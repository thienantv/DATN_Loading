import React, { useState, useEffect } from 'react';
import { adminService, userService } from '../../services/api';
import '../../styles/dashboard.css';

export const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    roleId: 3,
  });

  useEffect(() => {
    fetchUsers();
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

  const handleOpenModal = (user = null) => {
    if (user) {
      setSelectedUser(user);
      setFormData({
        fullName: user.full_name || '',
        username: user.username || '',
        email: user.email || '',
        roleId: user.role_id || 3,
      });
    } else {
      setSelectedUser(null);
      setFormData({
        fullName: '',
        username: '',
        email: '',
        roleId: 3,
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedUser(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      if (selectedUser) {
        await userService.updateUser(selectedUser.user_id, {
          full_name: formData.fullName,
          email: formData.email,
        });
        setSuccess('Cập nhật người dùng thành công');
      } else {
        await adminService.createUser({
          full_name: formData.fullName,
          username: formData.username,
          email: formData.email,
          role_id: parseInt(formData.roleId),
        });
        setSuccess('Tạo người dùng mới thành công');
      }
      handleCloseModal();
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Lỗi xử lý');
    }
  };

  const handleLockUser = async (userId) => {
    if (window.confirm('Bạn có chắc chắn muốn khóa tài khoản này?')) {
      try {
        await userService.lockUser(userId);
        setSuccess('Khóa tài khoản thành công');
        fetchUsers();
      } catch (err) {
        setError('Lỗi khóa tài khoản');
      }
    }
  };

  const handleUnlockUser = async (userId) => {
    try {
      await userService.unlockUser(userId);
      setSuccess('Mở khóa tài khoản thành công');
      fetchUsers();
    } catch (err) {
      setError('Lỗi mở khóa tài khoản');
    }
  };

  const handleResetPassword = async (userId) => {
    if (window.confirm('Bạn có chắc chắn muốn reset mật khẩu tài khoản này?')) {
      try {
        await userService.resetPassword(userId);
        setSuccess('Reset mật khẩu thành công (mật khẩu mặc định: 123456)');
        fetchUsers();
      } catch (err) {
        setError('Lỗi reset mật khẩu');
      }
    }
  };

  const getRoleName = (roleId) => {
    const roles = { 1: 'Admin', 2: 'Quản lý', 3: 'Nhân viên' };
    return roles[roleId] || 'Không xác định';
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
        <h1>👥 Quản lý tài khoản</h1>
        <p>Quản lý người dùng hệ thống</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="table-container">
        <div className="table-header">
          <h2>Danh sách người dùng</h2>
          <button className="btn btn-primary" onClick={() => handleOpenModal()}>
            ➕ Thêm người dùng
          </button>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Họ tên</th>
                <th>Tên đăng nhập</th>
                <th>Email</th>
                <th>Vai trò</th>
                <th>Trạng thái</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {users.length > 0 ? (
                users.map((user) => (
                  <tr key={user.user_id}>
                    <td>{user.full_name}</td>
                    <td>{user.username}</td>
                    <td>{user.email}</td>
                    <td>{getRoleName(user.role_id)}</td>
                    <td>
                      <span
                        className={`status-badge ${
                          user.status ? 'status-active' : 'status-inactive'
                        }`}
                      >
                        {user.status ? '✓ Hoạt động' : '✗ Khóa'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '5px' }}>
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => handleOpenModal(user)}
                          title="Chỉnh sửa"
                        >
                          ✏️
                        </button>
                        {user.status ? (
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => handleLockUser(user.user_id)}
                            title="Khóa"
                          >
                            🔒
                          </button>
                        ) : (
                          <button
                            className="btn btn-sm btn-success"
                            onClick={() => handleUnlockUser(user.user_id)}
                            title="Mở khóa"
                          >
                            🔓
                          </button>
                        )}
                        <button
                          className="btn btn-sm btn-warning"
                          onClick={() => handleResetPassword(user.user_id)}
                          title="Reset mật khẩu"
                        >
                          🔑
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>
                    Không có người dùng nào
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{selectedUser ? '✏️ Chỉnh sửa người dùng' : '➕ Thêm người dùng mới'}</h2>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Họ và tên</label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                />
              </div>

              {!selectedUser && (
                <>
                  <div className="form-group">
                    <label>Tên đăng nhập</label>
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Vai trò</label>
                    <select
                      name="roleId"
                      value={formData.roleId}
                      onChange={handleChange}
                      required
                    >
                      <option value={1}>Admin</option>
                      <option value={2}>Quản lý</option>
                      <option value={3}>Nhân viên</option>
                    </select>
                  </div>
                </>
              )}

              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  💾 Lưu
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  onClick={handleCloseModal}
                >
                  ❌ Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
