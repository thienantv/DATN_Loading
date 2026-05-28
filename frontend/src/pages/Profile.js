import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { showToast } from '../utils/toast';
import { userService } from '../services/api';
import '../styles/profile.css';

export const Profile = () => {
  const { user, setUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [initialFormData, setInitialFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
  });
  const [initialAvatarUrl, setInitialAvatarUrl] = useState('');
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
  });
  const [avatarPreview, setAvatarPreview] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setProfileLoading(true);
        const res = await userService.getCurrentUser();
        const currentUser = res?.data?.data || user || null;
        setProfile(currentUser);
        if (currentUser) {
          const nextFormData = {
            fullName: currentUser.full_name || '',
            email: currentUser.email || '',
            phone: currentUser.phone || '',
          };
          setFormData(nextFormData);
          setInitialFormData(nextFormData);
          setInitialAvatarUrl(currentUser.avatar_url || '');
          setAvatarPreview(currentUser.avatar_url || '');
        }
      } catch (err) {
        setProfile(user || null);
        if (user) {
          const nextFormData = {
            fullName: user.full_name || '',
            email: user.email || '',
            phone: user.phone || '',
          };
          setFormData(nextFormData);
          setInitialFormData(nextFormData);
          setInitialAvatarUrl(user.avatar_url || '');
          setAvatarPreview(user.avatar_url || '');
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

  const handleAvatarPick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Vui lòng chọn một tệp hình ảnh hợp lệ');
      return;
    }

    const localPreviewUrl = URL.createObjectURL(file);
    setAvatarPreview(localPreviewUrl);
    setAvatarUploading(true);
    setError(null);

    const uploadData = new FormData();
    uploadData.append('avatar', file);

    userService.updateProfileAvatar(uploadData)
      .then((res) => {
        const uploadedAvatarUrl = res?.data?.data?.avatar_url || res?.data?.avatar_url || '';
        if (!uploadedAvatarUrl) {
          throw new Error('Không nhận được URL ảnh đại diện từ server');
        }

        setAvatarPreview(uploadedAvatarUrl);
        setInitialAvatarUrl(uploadedAvatarUrl);

        const updatedUser = {
          ...account,
          avatar_url: uploadedAvatarUrl,
        };
        setProfile(updatedUser);
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
      })
      .catch((uploadError) => {
        setAvatarPreview(initialAvatarUrl);
        setError(uploadError.response?.data?.message || uploadError.message || 'Lỗi tải ảnh đại diện');
      })
      .finally(() => {
        setAvatarUploading(false);
      });

    e.target.value = '';
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
        avatar_url: account?.avatar_url || avatarPreview || null,
      });

        if (res.data.success) {
        const nextFormData = {
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
        };
        setFormData(nextFormData);
        setInitialFormData(nextFormData);
        setInitialAvatarUrl(account?.avatar_url || avatarPreview || '');
        const updatedUser = {
          ...account,
          full_name: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          avatar_url: account?.avatar_url || avatarPreview || null,
        };
        setProfile(updatedUser);
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setSuccess('Cập nhật hồ sơ thành công');
        showToast({ title: 'Cập nhật hồ sơ thành công', type: 'success' });
      }
    } catch (err) {
      setError('Lỗi cập nhật hồ sơ');
      showToast({ title: 'Lỗi cập nhật hồ sơ', type: 'error' });
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getRoleClass = (role) => {
    switch (String(role || '').toUpperCase()) {
      case 'OWNER':
        return 'role-admin';
      case 'WORKER':
        return 'role-worker';
      case 'TECHNICIAN':
        return 'role-technician';
      case 'ACCOUNTANT':
        return 'role-accountant';
      case 'STOREKEEPER':
        return 'role-storekeeper';
      default:
        return 'role-default';
    }
  };

  const getRoleName = (role) => {
    switch (String(role || '').toUpperCase()) {
      case 'OWNER':
        return 'Quản trị (Owner)';
      case 'WORKER':
        return 'Công nhân';
      case 'TECHNICIAN':
        return 'Kỹ thuật viên';
      case 'ACCOUNTANT':
        return 'Kế toán';
      case 'STOREKEEPER':
        return 'Quản lý kho';
      default:
        return role || 'Chưa xác định';
    }
  };

  const getRoleDescription = (role) => {
    switch (String(role || '').toUpperCase()) {
      case 'OWNER':
        return 'Quản trị toàn bộ hệ thống, người dùng và cấu hình.';
      case 'WORKER':
        return 'Thực hiện nhật ký canh tác, ghi chép công việc và thao tác ao nuôi.';
      case 'TECHNICIAN':
        return 'Theo dõi cảm biến, môi trường và xử lý dữ liệu kỹ thuật.';
      case 'ACCOUNTANT':
        return 'Theo dõi chi phí, ghi chép tài chính và quản lý danh mục chi phí.';
      case 'STOREKEEPER':
        return 'Quản lý hàng hóa kho, ghi nhận xuất nhập và công bố cảnh báo tồn kho.';
      default:
        return 'Tài khoản hệ thống với các quyền hạn theo vai trò hiện tại.';
    }
  };

  const handleReset = () => {
    setFormData(initialFormData);
    setAvatarPreview(initialAvatarUrl);
    setError(null);
    setSuccess(null);
  };

  const getInitials = (fullName) => {
    const name = String(fullName || '').trim();
    if (!name) return '?';
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }
    return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
  };

  const account = profile || user || {};
  const farmLabel = account?.farm_name || account?.farmName || account?.farm_id || 'Chưa xác định';
  const avatarSrc = avatarPreview || account?.avatar_url || '';

  return (
    <div className="dashboard-container profile-page">
      <div className="profile-container">
        {/* Notifications shown via toast */}

        <div className="profile-content profile-card">
          <div className="profile-page_header">
            <div>
              <h1>Hồ sơ cá nhân</h1>
              <p>Thông tin cá nhân của tài khoản hiện tại</p>
            </div>
          </div>

          {profileLoading && (
            <div className="profile-loading">
              <div className="spinner" />
            </div>
          )}

          <div className="profile-identity-card">
            <div className="profile-identity-top">
              <div className="profile-avatar-wrap">
                <button type="button" className="profile-avatar-button" onClick={handleAvatarPick}>
                  <div className={`profile-avatar profile-avatar--large ${getRoleClass(account?.role)}`}>
                    {avatarSrc ? (
                      <img src={avatarSrc} alt="Avatar" className="profile-avatar-image" />
                    ) : (
                      <span>{getInitials(account?.full_name)}</span>
                    )}
                  </div>
                  <span className="profile-avatar-edit-badge">📷</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="profile-avatar-input"
                  onChange={handleAvatarChange}
                />
                <button type="button" className="profile-avatar-action" onClick={handleAvatarPick}>
                  Change Avatar
                </button>
                {avatarUploading && <div className="profile-avatar-uploading">Đang tải ảnh...</div>}
              </div>

              <div className="profile-identity-meta">
                <div className="profile-identity-name-row">
                  <h2>{account?.full_name || 'Chưa cập nhật'}</h2>
                  <span className={`profile-chip ${getRoleClass(account?.role)}`}>{getRoleName(account?.role)}</span>
                </div>
                <div className="profile-identity-subrow">
                  <span>{account?.username || 'Chưa xác định'}</span>
                  <span className={`profile-status-pill ${account?.status ? 'profile-status-pill--active' : 'profile-status-pill--inactive'}`}>
                    {account?.status ? 'active' : 'inactive'}
                  </span>
                </div>
                <p className="profile-role-description">{getRoleDescription(account?.role)}</p>
              </div>
            </div>

            <div className="profile-form-separator" />

            <form onSubmit={handleSubmit} className="profile-form">
              <div className="profile-form-grid">
                <div className="form-group">
                  <label>Họ và tên</label>
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
                  <label>Trại nuôi</label>
                  <input
                    type="text"
                    value={farmLabel}
                    className="form-input form-input--readonly"
                    readOnly
                  />
                </div>

                <div className="form-group">
                  <label>Tên đăng nhập</label>
                  <input
                    type="text"
                    value={account?.username || ''}
                    className="form-input form-input--readonly"
                    readOnly
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

                <div className="form-group">
                  <label>Vai trò</label>
                  <input
                    type="text"
                    value={getRoleName(account?.role)}
                    className="form-input form-input--readonly"
                    readOnly
                  />
                </div>

                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="form-input"
                    required
                  />
                </div>
              </div>

              <div className="profile-note profile-note--compact">
                Tài khoản này đang dùng vai trò <strong>{getRoleName(account?.role)}</strong>.
              </div>

              <div className="form-actions profile-actions">
                <button type="submit" className="btn-primary" disabled={loading || avatarUploading}>
                  {loading ? 'Đang lưu...' : 'Chỉnh sửa thông tin'}
                </button>
                <button type="button" className="btn-secondary" onClick={handleReset} disabled={loading || avatarUploading}>
                  Hủy thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Profile;
