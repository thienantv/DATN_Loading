import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { userService } from '../services/api';
import '../styles/dashboard.css';
import '../styles/profile.css';

export const Profile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setProfileLoading(true);
        const res = await userService.getCurrentUser();
        const currentUser = res?.data?.data || user || null;
        setProfile(currentUser);
        if (currentUser) {
          setFormData({
            fullName: currentUser.full_name || '',
            email: currentUser.email || '',
            phone: currentUser.phone || '',
          });
        }
      } catch (err) {
        setProfile(user || null);
        if (user) {
          setFormData({
            fullName: user.full_name || '',
            email: user.email || '',
            phone: user.phone || '',
          });
        }
      } finally {
        setProfileLoading(false);
      }
    };

    loadProfile();
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      
      const res = await userService.updateProfile({
        full_name: formData.fullName,
        email: formData.email,
        phone: formData.phone,
      });

      if (res.data.success) {
        setSuccess('Cập nhật hồ sơ thành công');
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setError('Lỗi cập nhật hồ sơ');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getRoleClass = (role) => {
    switch (String(role || '').toUpperCase()) {
      case 'ADMIN':
        return 'role-admin';
      case 'MANAGER':
        return 'role-manager';
      case 'WORKER':
        return 'role-worker';
      case 'TECHNICIAN':
        return 'role-technician';
      case 'ACCOUNTANT':
        return 'role-accountant';
      default:
        return 'role-default';
    }
  };

  const getRoleName = (role) => {
    switch (String(role || '').toUpperCase()) {
      case 'ADMIN':
        return 'Quản trị viên';
      case 'MANAGER':
        return 'Quản lý';
      case 'WORKER':
        return 'Công nhân';
      case 'TECHNICIAN':
        return 'Kỹ thuật viên';
      case 'ACCOUNTANT':
        return 'Kế toán';
      default:
        return role || 'Chưa xác định';
    }
  };

  const getRoleDescription = (role) => {
    switch (String(role || '').toUpperCase()) {
      case 'ADMIN':
        return 'Quản trị toàn bộ hệ thống, người dùng và cấu hình.';
      case 'MANAGER':
        return 'Quản lý ao nuôi, mùa vụ, công việc và các báo cáo vận hành.';
      case 'WORKER':
        return 'Thực hiện nhật ký canh tác, ghi chép công việc và thao tác ao nuôi.';
      case 'TECHNICIAN':
        return 'Theo dõi cảm biến, môi trường và xử lý dữ liệu kỹ thuật.';
      case 'ACCOUNTANT':
        return 'Theo dõi chi phí, ghi chép tài chính và quản lý danh mục chi phí.';
      default:
        return 'Tài khoản hệ thống với các quyền hạn theo vai trò hiện tại.';
    }
  };

  const account = profile || user || {};

  return (
    <div className="dashboard-container">
      <div className="profile-container">
        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <div className="profile-content">
          <div className="profile-avatar-section">
            <div className={`profile-avatar ${getRoleClass(account?.role)}`}>
              {(account?.full_name || '?').charAt(0).toUpperCase()}
            </div>
            <div className="profile-role-info">
              <p className={`profile-role-badge ${getRoleClass(account?.role)}`}>
                {getRoleName(account?.role)}
              </p>
              <p className="profile-role-description">{getRoleDescription(account?.role)}</p>
            </div>
          </div>

          {profileLoading && (
            <div className="profile-loading">
              <div className="spinner" />
            </div>
          )}

          <div className="profile-summary-grid">
            <div className="profile-summary-card">
              <span className="profile-summary-label">Trạng thái</span>
              <strong className={account?.status ? 'profile-status-active' : 'profile-status-inactive'}>
                {account?.status ? 'Đang hoạt động' : 'Đã khóa'}
              </strong>
            </div>
            <div className="profile-summary-card">
              <span className="profile-summary-label">Ngày tạo</span>
              <strong>{account?.created_at ? new Date(account.created_at).toLocaleDateString('vi-VN') : '-'}</strong>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="profile-form">
            <div className="form-group">
              <label>Họ và tên *</label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label>Email *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label>Số điện thoại</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="form-input"
                placeholder="Nhập số điện thoại"
              />
            </div>

            <div className="profile-note">
              Tài khoản này đang dùng vai trò <strong>{getRoleName(account?.role)}</strong>.
              Mọi thay đổi trên màn hình này sẽ cập nhật cho toàn bộ loại tài khoản trong hệ thống.
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? '⏳ Đang lưu...' : '💾 Lưu thay đổi'}
              </button>
            </div>
          </form>
        </div>
      </div>

    </div>
  );
};

export default Profile;
