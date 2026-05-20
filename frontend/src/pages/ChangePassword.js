import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/api';
import '../styles/dashboard.css';
import '../styles/profile.css';
import '../styles/change-password.css';

export const ChangePassword = () => {
  const navigate = useNavigate();
  useAuth();

  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError(null);
  };

  const validateForm = () => {
    if (!formData.currentPassword) {
      setError('Vui lòng nhập mật khẩu hiện tại');
      return false;
    }
    if (!formData.newPassword) {
      setError('Vui lòng nhập mật khẩu mới');
      return false;
    }
    if (!formData.confirmPassword) {
      setError('Vui lòng xác nhận mật khẩu mới');
      return false;
    }
    if (formData.newPassword.length < 6) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự');
      return false;
    }
    if (formData.newPassword !== formData.confirmPassword) {
      setError('Mật khẩu xác nhận không trùng khớp');
      return false;
    }
    if (formData.currentPassword === formData.newPassword) {
      setError('Mật khẩu mới không được giống mật khẩu hiện tại');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      const res = await authService.changePassword({
        oldPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      });

      if (res.data.success) {
        setSuccess('Đổi mật khẩu thành công');
        setFormData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
        setTimeout(() => {
          navigate('/');
        }, 2000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Lỗi đổi mật khẩu');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-container profile-page change-password-page">
      <div className="profile-container change-password-container">
        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <div className="profile-content profile-card change-password-card">
          <div className="profile-page__header">
            <h1>Đổi mật khẩu</h1>
            <p>Cập nhật mật khẩu của bạn để bảo vệ tài khoản an toàn hơn.</p>
          </div>

          <div className="profile-form-separator" />

          <div className="change-password-content">
            <form onSubmit={handleSubmit} className="profile-form change-password-form">
              <div className="form-group">
                <label>Mật khẩu hiện tại *</label>
                <div className="change-password-input-wrap">
                  <input
                    type={showPasswords.current ? 'text' : 'password'}
                    name="currentPassword"
                    value={formData.currentPassword}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="Nhập mật khẩu hiện tại"
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() =>
                      setShowPasswords((prev) => ({
                        ...prev,
                        current: !prev.current,
                      }))
                    }
                  >
                    {showPasswords.current ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>Mật khẩu mới *</label>
                <div className="change-password-input-wrap">
                  <input
                    type={showPasswords.new ? 'text' : 'password'}
                    name="newPassword"
                    value={formData.newPassword}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() =>
                      setShowPasswords((prev) => ({
                        ...prev,
                        new: !prev.new,
                      }))
                    }
                  >
                    {showPasswords.new ? '🙈' : '👁️'}
                  </button>
                </div>
                <small className="form-help change-password-note">
                  Sử dụng kết hợp chữ hoa, chữ thường, số và ký tự đặc biệt để tăng độ bảo mật.
                </small>
              </div>

              <div className="form-group">
                <label>Xác nhận mật khẩu mới *</label>
                <div className="change-password-input-wrap">
                  <input
                    type={showPasswords.confirm ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="Nhập lại mật khẩu mới"
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() =>
                      setShowPasswords((prev) => ({
                        ...prev,
                        confirm: !prev.confirm,
                      }))
                    }
                  >
                    {showPasswords.confirm ? '🙈' : '👁️'}
                  </button>
                </div>
                {formData.newPassword &&
                  formData.confirmPassword &&
                  formData.newPassword === formData.confirmPassword && (
                    <small className="form-help change-password__match">Mật khẩu xác nhận trùng khớp.</small>
                  )}
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Đang cập nhật...' : 'Đổi mật khẩu'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => navigate('/')}>
                  Hủy
                </button>
              </div>
            </form>

            <div className="profile-note change-password-tips">
              <h3>Mẹo bảo mật</h3>
              <ul>
                <li>Sử dụng mật khẩu dài (tối thiểu 8 ký tự).</li>
                <li>Kết hợp chữ hoa, chữ thường, số và ký tự đặc biệt.</li>
                <li>Không dùng thông tin cá nhân dễ đoán.</li>
                <li>Thay đổi mật khẩu định kỳ.</li>
                <li>Không chia sẻ mật khẩu với người khác.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChangePassword;