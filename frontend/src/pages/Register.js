import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { showToast } from '../utils/toast';
import '../styles/register.css';

export const Register = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    farmName: '',
    password: '',
    passwordConfirm: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateForm = () => {
    if (!formData.fullName || !formData.username || !formData.email || !formData.farmName || !formData.password || !formData.passwordConfirm) {
      setError('Vui lòng điền đầy đủ thông tin');
      showToast({ title: 'Vui lòng điền đầy đủ thông tin', type: 'error' });
      return false;
    }

    if (formData.password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự');
      showToast({ title: 'Mật khẩu phải có ít nhất 6 ký tự', type: 'error' });
      return false;
    }

    if (formData.password !== formData.passwordConfirm) {
      setError('Mật khẩu không khớp');
      showToast({ title: 'Mật khẩu không khớp', type: 'error' });
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Email không hợp lệ');
      showToast({ title: 'Email không hợp lệ', type: 'error' });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!validateForm()) {
      setLoading(false);
      return;
    }

    const result = await register(
      formData.fullName,
      formData.username,
      formData.email,
      formData.password,
      formData.passwordConfirm,
      formData.farmName
    );
    setLoading(false);

    if (result.success) {
      showToast({ title: 'Đăng ký thành công', type: 'success' });
      // Redirect đến dashboard dựa trên role
      const role = result.user?.role;
      if (role === 'ADMIN') {
        navigate('/admin/dashboard');
      } else if (role === 'OWNER') {
        navigate('/owner/dashboard');
      } else if (role === 'MANAGER') {
        navigate('/manager/dashboard');
      } else if (role === 'WORKER') {
        navigate('/worker/dashboard');
      } else if (role === 'TECHNICIAN') {
        navigate('/technician/dashboard');
      } else if (role === 'ACCOUNTANT') {
        navigate('/accountant/dashboard');
      } else if (role === 'STOREKEEPER') {
        navigate('/storekeeper/dashboard');
      } else {
        navigate('/');
      }
    } else {
      setError(result.message);
      showToast({ title: result.message || 'Đăng ký thất bại', type: 'error' });
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-layout">
        <div className="center-panel">
          <div className="form-card form-card--large form-card--register">
            <div className="auth-brand-mark">
              <div className="auth-brand-mark__icon">🦐</div>
            </div>
            <form onSubmit={handleSubmit} className="auth-form auth-form--register">
              <h2>Đăng ký</h2>

              {/* Notifications shown via toast */}

              <div className="register-fields-grid">
                <div className="form-group">
                  <label htmlFor="fullName">Họ và tên</label>
                  <input
                    id="fullName"
                    type="text"
                    name="fullName"
                    className="auth-text-input"
                    placeholder="Nhập họ và tên"
                    value={formData.fullName}
                    onChange={handleChange}
                    disabled={loading}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="username">Tên đăng nhập</label>
                  <input
                    id="username"
                    type="text"
                    name="username"
                    className="auth-text-input"
                    placeholder="Nhập tên đăng nhập"
                    value={formData.username}
                    onChange={handleChange}
                    disabled={loading}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <input
                    id="email"
                    type="email"
                    name="email"
                    className="auth-text-input"
                    placeholder="Nhập email"
                    value={formData.email}
                    onChange={handleChange}
                    disabled={loading}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="farmName">Tên trại nuôi</label>
                  <input
                    id="farmName"
                    type="text"
                    name="farmName"
                    className="auth-text-input"
                    placeholder="Nhập tên trại nuôi"
                    value={formData.farmName}
                    onChange={handleChange}
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <div className="register-password-grid">
                <div className="form-group">
                  <label htmlFor="password">Mật khẩu</label>
                  <div className="password-input-wrapper">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      placeholder="Nhập mật khẩu (tối thiểu 6 ký tự)"
                      value={formData.password}
                      onChange={handleChange}
                      disabled={loading}
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex="-1"
                    >
                      {showPassword ? '👁️‍🗨️' : '👁️'}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="passwordConfirm">Xác nhận mật khẩu</label>
                  <div className="password-input-wrapper">
                    <input
                      id="passwordConfirm"
                      type={showPasswordConfirm ? 'text' : 'password'}
                      name="passwordConfirm"
                      placeholder="Xác nhận mật khẩu"
                      value={formData.passwordConfirm}
                      onChange={handleChange}
                      disabled={loading}
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                      tabIndex="-1"
                    >
                      {showPasswordConfirm ? '👁️‍🗨️' : '👁️'}
                    </button>
                  </div>
                </div>
              </div>

              <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                {loading ? '🔄 Đang đăng ký...' : '✍️ Đăng ký'}
              </button>
            </form>

            <div className="auth-footer">
              <p>
                Đã có tài khoản?{' '}
                <Link to="/login" className="auth-link">
                  Đăng nhập ngay
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;




