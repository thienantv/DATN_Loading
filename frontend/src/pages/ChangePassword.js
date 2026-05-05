import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/api';
import '../styles/dashboard.css';

export const ChangePassword = () => {
  const navigate = useNavigate();
  useAuth(); // Check authentication
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
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
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
    <div className="dashboard-container">
      <div className="change-password-container">
        <div className="change-password-header">
          <h2>🔒 Đổi mật khẩu</h2>
          <p className="subtitle">Cập nhật mật khẩu của bạn để bảo vệ tài khoản</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <div className="change-password-content">
          <form onSubmit={handleSubmit} className="change-password-form">
            <div className="form-group">
              <label>Mật khẩu hiện tại *</label>
              <div className="password-input-wrapper">
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
                  onClick={() => setShowPasswords(prev => ({
                    ...prev,
                    current: !prev.current
                  }))}
                >
                  {showPasswords.current ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>Mật khẩu mới *</label>
              <div className="password-input-wrapper">
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
                  onClick={() => setShowPasswords(prev => ({
                    ...prev,
                    new: !prev.new
                  }))}
                >
                  {showPasswords.new ? '🙈' : '👁️'}
                </button>
              </div>
              <small className="form-help password-strength">
                💡 Sử dụng kết hợp chữ hoa, chữ thường, số và ký tự đặc biệt để tăng độ bảo mật
              </small>
            </div>

            <div className="form-group">
              <label>Xác nhận mật khẩu mới *</label>
              <div className="password-input-wrapper">
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
                  onClick={() => setShowPasswords(prev => ({
                    ...prev,
                    confirm: !prev.confirm
                  }))}
                >
                  {showPasswords.confirm ? '🙈' : '👁️'}
                </button>
              </div>
              {formData.newPassword && formData.confirmPassword && 
                formData.newPassword === formData.confirmPassword && (
                <small className="form-help" style={{ color: '#10b981' }}>
                  ✅ Mật khẩu xác nhận trùng khớp
                </small>
              )}
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? '⏳ Đang cập nhật...' : '✅ Đổi mật khẩu'}
              </button>
              <button 
                type="button" 
                className="btn-secondary"
                onClick={() => navigate('/')}
              >
                ❌ Hủy
              </button>
            </div>
          </form>

          <div className="password-tips">
            <h3>🔐 Mẹo bảo mật</h3>
            <ul>
              <li>Sử dụng mật khẩu dài (tối thiểu 8 ký tự)</li>
              <li>Kết hợp chữ hoa, chữ thường, số và ký tự đặc biệt</li>
              <li>Không sử dụng thông tin cá nhân (tên, ngày sinh, ...)</li>
              <li>Thay đổi mật khẩu định kỳ (tối thiểu 3 tháng một lần)</li>
              <li>Không chia sẻ mật khẩu với bất kỳ ai</li>
              <li>Sử dụng mật khẩu khác nhau cho các tài khoản khác nhau</li>
            </ul>
          </div>
        </div>
      </div>

      <style>{`
        .change-password-container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }

        .change-password-header {
          margin-bottom: 30px;
          border-bottom: 2px solid #e5e7eb;
          padding-bottom: 20px;
        }

        .change-password-header h2 {
          margin: 0 0 8px 0;
          color: #1f2937;
          font-size: 24px;
        }

        .subtitle {
          margin: 0;
          color: #6b7280;
          font-size: 14px;
        }

        .change-password-content {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
        }

        .change-password-form {
          background: white;
          border-radius: 8px;
          padding: 30px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: 600;
          color: #374151;
          font-size: 14px;
        }

        .password-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .form-input {
          width: 100%;
          padding: 10px 40px 10px 12px;
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

        .password-toggle {
          position: absolute;
          right: 12px;
          background: none;
          border: none;
          font-size: 18px;
          cursor: pointer;
          padding: 4px 8px;
          transition: transform 0.2s;
        }

        .password-toggle:hover {
          transform: scale(1.2);
        }

        .form-help {
          display: block;
          font-size: 12px;
          color: #9ca3af;
          margin-top: 4px;
        }

        .password-strength {
          color: #f59e0b;
        }

        .form-actions {
          display: flex;
          gap: 10px;
          margin-top: 30px;
        }

        .btn-primary {
          flex: 1;
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

        .btn-secondary {
          flex: 1;
          padding: 12px 24px;
          background-color: #e5e7eb;
          color: #374151;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
          font-size: 14px;
        }

        .btn-secondary:hover {
          background-color: #d1d5db;
        }

        .password-tips {
          background: white;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .password-tips h3 {
          margin: 0 0 15px 0;
          color: #1f2937;
          font-size: 16px;
        }

        .password-tips ul {
          margin: 0;
          padding-left: 20px;
          color: #6b7280;
          font-size: 14px;
          line-height: 1.6;
        }

        .password-tips li {
          margin-bottom: 8px;
        }

        .alert {
          padding: 12px 16px;
          border-radius: 6px;
          margin-bottom: 20px;
          font-size: 14px;
        }

        .alert-error {
          background-color: #fee2e2;
          color: #991b1b;
          border-left: 4px solid #dc2626;
        }

        .alert-success {
          background-color: #dcfce7;
          color: #166534;
          border-left: 4px solid #16a34a;
        }
      `}</style>
    </div>
  );
};

export default ChangePassword;
