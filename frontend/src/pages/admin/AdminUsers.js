import React, { useEffect, useState } from 'react';
import { adminService, userService } from '../../services/api';
import '../../styles/dashboard.css';
import '../../styles/admin/admin-users.css';
import '../../styles/admin-layout.css';
import { showToast } from '../../utils/toast';

const ROLE_OPTIONS = [
  { value: 'OWNER', label: 'Chủ trại' },
  { value: 'MANAGER', label: 'Quản lý' },
  { value: 'TECHNICIAN', label: 'Kỹ thuật' },
  { value: 'WORKER', label: 'Công nhân' },
  { value: 'ACCOUNTANT', label: 'Kế toán' },
  { value: 'STOREKEEPER', label: 'Quản lý kho' },
];

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [farms, setFarms] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    phone: '',
    password: '',
    role: 'WORKER',
    farmId: '',
  });

  useEffect(() => {
    fetchUsers();
    fetchFarms();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await adminService.getAllUsers();
      setUsers(response.data.data || []);
    } catch (err) {
      showToast({ title: 'Lỗi tải danh sách người dùng', type: 'error' });
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter((user) => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const roleName = String(user.role || '').toUpperCase();
    const statusName = user.status ? 'ACTIVE' : 'INACTIVE';

    const searchMatched =
      !normalizedSearch ||
      String(user.full_name || '').toLowerCase().includes(normalizedSearch) ||
      String(user.username || '').toLowerCase().includes(normalizedSearch) ||
      String(user.email || '').toLowerCase().includes(normalizedSearch) ||
      String(user.phone || '').toLowerCase().includes(normalizedSearch);

    const roleMatched = roleFilter === 'ALL' || roleName === roleFilter;
    const statusMatched = statusFilter === 'ALL' || statusName === statusFilter;

    return searchMatched && roleMatched && statusMatched;
  });

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredUsers.length);
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const resetToFirstPage = () => {
    setCurrentPage(1);
  };

  const getAvatar = (fullName) => {
    const name = String(fullName || '').trim();
    if (!name) return 'U';
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
  };

  const getAvatarUrl = (user) => user?.avatar_url || user?.avatarUrl || '';

  const getRoleClassName = (role) => {
    switch (String(role || '').toUpperCase()) {
      case 'ADMIN':
        return 'admin-users_role admin-users_role--admin';
      case 'OWNER':
        return 'admin-users_role admin-users_role--owner';
      case 'MANAGER':
        return 'admin-users_role admin-users_role--manager';
      case 'TECHNICIAN':
        return 'admin-users_role admin-users_role--technician';
      case 'WORKER':
        return 'admin-users_role admin-users_role--worker';
      case 'ACCOUNTANT':
        return 'admin-users_role admin-users_role--accountant';
      case 'STOREKEEPER':
        return 'admin-users_role admin-users_role--storekeeper';
      default:
        return 'admin-users_role';
    }
  };

  const fetchFarms = async () => {
    try {
      const response = await adminService.getFarms();
      setFarms(response.data.data || []);
    } catch (err) {
      console.error('Lỗi tải danh sách trại nuôi:', err);
    }
  };

  const handleOpenModal = (user = null) => {
    if (user) {
      setSelectedUser(user);
      setFormData({
        fullName: user.full_name || '',
        username: user.username || '',
        email: user.email || '',
        phone: user.phone || '',
        password: '',
        role: String(user.role || 'WORKER').toUpperCase(),
        farmId: user.farm_id || '',
      });
    } else {
      setSelectedUser(null);
      setFormData({
        fullName: '',
        username: '',
        email: '',
        phone: '',
        password: '',
        role: 'WORKER',
        farmId: '',
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

  const isOwnerRole = String(formData.role || '').toUpperCase() === 'OWNER';

  const handleSubmit = async (e) => {
    e.preventDefault();
    // clear previous toasts handled by toast provider

    try {
      if (selectedUser) {
        // Update existing user info
        await userService.updateUser(selectedUser.user_id, {
          full_name: formData.fullName,
          email: formData.email,
          phone: formData.phone,
        });

        // Assign to farm if farmId changed
        if (formData.farmId && String(formData.farmId) !== String(selectedUser.farm_id || '')) {
          await userService.assignToFarm(selectedUser.user_id, formData.farmId);
        }

        showToast({ title: 'Cập nhật người dùng thành công', type: 'success' });
      } else {
        const payload = {
          fullName: formData.fullName,
          username: formData.username,
          email: formData.email,
          phone: formData.phone,
          role: formData.role,
          password: formData.password,
        };

        if (isOwnerRole) {
          payload.farmName = formData.farmId;
        } else {
          payload.farmId = formData.farmId;
        }

        await adminService.createUser({
          ...payload,
        });
        showToast({ title: 'Tạo người dùng mới thành công', type: 'success' });
      }

      handleCloseModal();
      fetchUsers();
    } catch (err) {
      showToast({ title: err.response?.data?.message || 'Lỗi xử lý', type: 'error' });
      console.error(err);
    }
  };

  const handleLockUser = async (userId) => {
    if (!window.confirm('Bạn có chắc chắn muốn khóa tài khoản này?')) {
      return;
    }

    try {
      await adminService.lockUser(userId);
      showToast({ title: 'Khóa tài khoản thành công', type: 'success' });
      fetchUsers();
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Lỗi khóa tài khoản';
      showToast({ title: errorMsg, type: 'error' });
      console.error(err);
    }
  };

  const handleUnlockUser = async (userId) => {
    try {
      await adminService.unlockUser(userId);
      showToast({ title: 'Mở khóa tài khoản thành công', type: 'success' });
      fetchUsers();
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Lỗi mở khóa tài khoản';
      showToast({ title: errorMsg, type: 'error' });
      console.error(err);
    }
  };

  const handleResetPassword = async (userId) => {
    if (!window.confirm('Bạn có chắc chắn muốn reset mật khẩu tài khoản này?')) {
      return;
    }

    try {
      await userService.resetPassword(userId);
      showToast({ title: 'Reset mật khẩu thành công (mật khẩu mặc định: 123456)', type: 'success' });
      fetchUsers();
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Lỗi reset mật khẩu';
      showToast({ title: errorMsg, type: 'error' });
      console.error(err);
    }
  };

  const getRoleLabel = (role) => {
    switch (String(role || '').toUpperCase()) {
      case 'ADMIN':
        return 'Quản trị viên';
      case 'OWNER':
        return 'Chủ trại';
      case 'MANAGER':
        return 'Quản lý';
      case 'TECHNICIAN':
        return 'Kỹ thuật';
      case 'WORKER':
        return 'Công nhân';
      case 'ACCOUNTANT':
        return 'Kế toán';
      case 'STOREKEEPER':
        return 'Quản lý kho';
      default:
        return 'Không xác định';
    }
  };

  if (loading) {
    return (
      <div className="dashboard">
        <div className="flex-center admin-users_loading-container">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard admin-page">
      {/* Toasts will display success/error messages */}

      <div className="table-container admin-users_panel">
        <div className="table-header admin-users_table-header">
          <div>
            <h2>Quản lý người dùng</h2>
            <p className="admin-users_subtitle">
              Hiển thị {filteredUsers.length === 0 ? 0 : startIndex + 1}-{endIndex} trên {filteredUsers.length} người dùng
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => handleOpenModal()}>
            ＋ Thêm người dùng mới
          </button>
        </div>

        <div className="admin-users_toolbar">
          <div className="admin-users_search-wrap">
            <span className="admin-users_search-icon">⌕</span>
            <input
              type="text"
              placeholder="Tìm người dùng..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                resetToFirstPage();
              }}
            />
          </div>

          <select
            className="admin-users_filter-select"
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              resetToFirstPage();
            }}
          >
            <option value="ALL">Tất cả vai trò</option>
            {ROLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
            <option value="ADMIN">Quản trị viên</option>
          </select>

          <select
            className="admin-users_filter-select"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              resetToFirstPage();
            }}
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Hoạt động</option>
            <option value="INACTIVE">Đã khóa</option>
          </select>
        </div>

        <div className="table-wrapper">
          <table className="admin-users_table">
            <thead>
                <tr>
                <th>Ảnh</th>
                <th>Họ tên</th>
                <th>Tên đăng nhập</th>
                <th>Email</th>
                <th>Số điện thoại</th>
                <th>Vai trò</th>
                <th>Trại nuôi</th>
                <th>Trạng thái</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.length > 0 ? (
                paginatedUsers.map((user) => (
                  <tr key={user.user_id}>
                    <td>
                      <div className="admin-users_avatar">
                        {getAvatarUrl(user) ? (
                          <img src={getAvatarUrl(user)} alt={user.full_name || user.username || 'Avatar'} className="admin-users_avatar-image" />
                        ) : (
                          getAvatar(user.full_name)
                        )}
                      </div>
                    </td>
                    <td>{user.full_name}</td>
                    <td>{user.username}</td>
                    <td>{user.email}</td>
                    <td>{user.phone || '-'}</td>
                    <td>
                      <span className={getRoleClassName(user.role)}>{getRoleLabel(user.role)}</span>
                    </td>
                    <td>{user.farm_name || user.farm_id || '-'}</td>
                    <td>
                      <span className={`status-badge ${user.status ? 'status-active' : 'status-inactive'}`}>
                        {user.status ? 'Hoạt động' : 'Đã khóa'}
                      </span>
                    </td>
                    <td>
                      <div className="admin-users_table-actions">
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => handleOpenModal(user)}
                          title="Chỉnh sửa"
                        >✎</button>
                        {user.status ? (
                          String(user.role || '').toUpperCase() === 'ADMIN' ? (
                            <button
                              className="btn btn-sm btn-danger admin-users_btn-disabled"
                              disabled
                              title="Không thể khóa tài khoản Admin"
                            >⛔</button>
                          ) : (
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => handleLockUser(user.user_id)}
                              title="Khóa"
                            >🔒</button>
                          )
                        ) : (
                          <button
                            className="btn btn-sm btn-success"
                            onClick={() => handleUnlockUser(user.user_id)}
                            title="Mở khóa"
                          >🔓</button>
                        )}
                        <button
                          className="btn btn-sm btn-warning"
                          onClick={() => handleResetPassword(user.user_id)}
                          title="Reset mật khẩu"
                        >↺</button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" className="admin-users_empty-row">
                    Không có người dùng nào
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="admin-users_pagination">
          <div className="admin-users_pagination-left">
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
            <span>
              {filteredUsers.length === 0 ? 0 : startIndex + 1}-{endIndex} trên {filteredUsers.length}
            </span>
          </div>

          <div className="admin-users_pagination-right">
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={safePage <= 1}
            >
              ‹
            </button>
            <span className="admin-users_page-pill">{safePage}</span>
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={safePage >= totalPages}
            >
              ›
            </button>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="modal" onClick={handleCloseModal}>
          <div className="modal-content admin-users_modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="admin-users_modal-close"
              onClick={(e) => { e.stopPropagation(); handleCloseModal(); }}
              aria-label="Close"
            >
              ×
            </button>

            <h2 className="admin-users_modal-title">{selectedUser ? '✏️ Chỉnh sửa người dùng' : 'Thêm người dùng mới'}</h2>
            <p className="admin-users_modal-subtitle">Điền thông tin để tạo tài khoản mới</p>

            <form className="admin-users_modal-form" onSubmit={handleSubmit}>
              <div className="admin-users_modal-grid">
                <div className="admin-users_form-column">
                  <div className="form-group">
                    <label>Họ và tên <span className="required">*</span></label>
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  {!selectedUser && (
                    <div className="form-group">
                      <label>Tên đăng nhập <span className="required">*</span></label>
                      <input
                        type="text"
                        name="username"
                        value={formData.username}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  )}

                  <div className="form-group">
                    <label>Vai trò <span className="required">*</span></label>
                    <select name="role" value={formData.role} onChange={handleChange} required>
                      {ROLE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {!selectedUser && (
                    <div className="form-group">
                      <label>Mật khẩu <span className="required">*</span></label>
                      <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="Nhập mật khẩu"
                        required
                      />
                    </div>
                  )}
                </div>

                <div className="admin-users_form-column">
                  {selectedUser && (
                    <div className="form-group">
                      <label>Trại nuôi</label>
                      <select name="farmId" value={formData.farmId} onChange={handleChange}>
                        <option value="">-- Chọn trại nuôi --</option>
                        {farms.map((farm) => (
                          <option key={farm.farm_id} value={farm.farm_id}>
                            {farm.farm_name} ({farm.farm_code})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="form-group">
                    <label>{isOwnerRole ? 'Tên trại nuôi mới' : 'Trại nuôi'} <span className="required">*</span></label>
                      {!selectedUser && (
                        <>
                          {isOwnerRole ? (
                            <input
                              type="text"
                              name="farmId"
                              value={formData.farmId}
                              onChange={handleChange}
                              placeholder="Nhập tên trang trại"
                              required
                            />
                          ) : (
                            <select name="farmId" value={formData.farmId} onChange={handleChange} required>
                              <option value="">-- Chọn trại nuôi --</option>
                              {farms.map((farm) => (
                                <option key={farm.farm_id} value={farm.farm_id}>
                                  {farm.farm_name} ({farm.farm_code})
                                </option>
                              ))}
                            </select>
                          )}
                        </>
                      )}
                  </div>

                  <div className="form-group">
                    <label>Số điện thoại</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="Nhập số điện thoại"
                    />
                  </div>

                  <div className="form-group">
                    <label>Email <span className="required">*</span></label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="admin-users_form-buttons admin-users_modal-buttons">
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary">
                  {selectedUser ? 'Lưu' : 'Tạo người dùng'}
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