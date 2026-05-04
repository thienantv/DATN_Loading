import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { userService } from '../services/api';
import '../styles/dashboard.css';

export const Profile = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (user) {
      setFormData({
        fullName: user.full_name || '',
        email: user.email || '',
        phone: user.phone || '',
      });
    }
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

  const getRoleColor = (role) => {
    switch (role) {
      case 'ADMIN':
        return '#dc2626';
      case 'MANAGER':
        return '#2563eb';
      case 'STAFF':
        return '#16a34a';
      default:
        return '#6b7280';
    }
  };

  const getRoleName = (role) => {
    switch (role) {
      case 'ADMIN':
        return 'Quản trị viên';
      case 'MANAGER':
        return 'Quản lý';
      case 'STAFF':
        return 'Nhân viên';
      default:
        return role;
    }
  };

  return (
    <div className="dashboard-container">
      <div className="profile-container">
        <div className="profile-header">
          <h2>👤 Hồ sơ cá nhân</h2>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <div className="profile-content">
          <div className="profile-avatar-section">
            <div 
              className="profile-avatar" 
              style={{ backgroundColor: getRoleColor(user?.role) }}
            >
              {user?.full_name?.charAt(0).toUpperCase()}
            </div>
            <div className="profile-role-info">
              <p className="role-badge" style={{ backgroundColor: getRoleColor(user?.role) }}>
                {getRoleName(user?.role)}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="profile-form">
            <div className="form-group">
              <label>Tên đăng nhập</label>
              <input
                type="text"
                value={user?.username || ''}
                disabled
                className="form-input"
              />
              <small className="form-help">Không thể thay đổi tên đăng nhập</small>
            </div>

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

            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? '⏳ Đang lưu...' : '💾 Lưu thay đổi'}
              </button>
            </div>
          </form>
        </div>

        <div className="profile-info-section">
          <h3>ℹ️ Thông tin tài khoản</h3>
          <div className="info-item">
            <span className="info-label">Ngày tạo tài khoản:</span>
            <span className="info-value">
              {user?.created_at ? new Date(user.created_at).toLocaleDateString('vi-VN') : 'N/A'}
            </span>
          </div>
          <div className="info-item">
            <span className="info-label">Trạng thái:</span>
            <span className="info-value">
              {user?.status ? '✅ Hoạt động' : '❌ Vô hiệu'}
            </span>
          </div>
          <div className="info-item">
            <span className="info-label">ID Người dùng:</span>
            <span className="info-value">{user?.user_id}</span>
          </div>
        </div>
      </div>

      <style>{`
        .profile-container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }

        .profile-header {
          margin-bottom: 30px;
          border-bottom: 2px solid #e5e7eb;
          padding-bottom: 20px;
        }

        .profile-header h2 {
          margin: 0;
          color: #1f2937;
          font-size: 24px;
        }

        .profile-content {
          background: white;
          border-radius: 8px;
          padding: 30px;
          margin-bottom: 30px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .profile-avatar-section {
          text-align: center;
          margin-bottom: 30px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .profile-avatar {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 48px;
          color: white;
          font-weight: bold;
          margin-bottom: 15px;
        }

        .role-badge {
          display: inline-block;
          padding: 8px 16px;
          border-radius: 20px;
          color: white;
          font-weight: 600;
          font-size: 14px;
        }

        .profile-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
        }

        .form-group label {
          margin-bottom: 8px;
          font-weight: 600;
          color: #374151;
          font-size: 14px;
        }

        .form-input {
          padding: 10px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
          font-family: inherit;
          transition: all 0.3s;
        }

        .form-input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .form-input:disabled {
          background-color: #f3f4f6;
          color: #9ca3af;
          cursor: not-allowed;
        }

        .form-help {
          font-size: 12px;
          color: #9ca3af;
          margin-top: 4px;
        }

        .form-actions {
          display: flex;
          gap: 10px;
          margin-top: 10px;
        }

        .btn-primary {
          padding: 12px 24px;
          background-color: #3b82f6;
          color: white;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
          font-size: 14px;
        }

        .btn-primary:hover:not(:disabled) {
          background-color: #2563eb;
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(59, 130, 246, 0.3);
        }

        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .profile-info-section {
          background: white;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .profile-info-section h3 {
          margin: 0 0 20px 0;
          color: #1f2937;
          font-size: 16px;
        }

        .info-item {
          display: flex;
          justify-content: space-between;
          padding: 12px 0;
          border-bottom: 1px solid #e5e7eb;
        }

        .info-item:last-child {
          border-bottom: none;
        }

        .info-label {
          color: #6b7280;
          font-weight: 500;
        }

        .info-value {
          color: #1f2937;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
};

export default Profile;
