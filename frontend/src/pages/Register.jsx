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
    phone: '',
    farmName: '',
    password: '',
    passwordConfirm: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
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
    // Clear field-level error when user edits the field
    setFieldErrors((prev) => {
      if (!prev || !prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const validateForm = () => {
    // Required fields
    const required = ['fullName', 'username', 'email', 'phone', 'farmName', 'password', 'passwordConfirm'];
    for (const f of required) {
      if (!String(formData[f] || '').trim()) {
        setError('Vui lòng điền đầy đủ thông tin');
        showToast({ title: 'Vui lòng điền đầy đủ thông tin', type: 'error' });
        return false;
      }
    }

    // Full name
    if (String(formData.fullName).trim().length < 2) {
      setError('Họ và tên phải có ít nhất 2 ký tự');
      showToast({ title: 'Họ và tên phải có ít nhất 2 ký tự', type: 'error' });
      return false;
    }
    const fullNameValid = /^[\p{L}\p{M}0-9\s'.-]{2,}$/u
    if (!fullNameValid.test(formData.fullName)) {
      setError('Họ và tên chứa ký tự không hợp lệ');
      showToast({ title: 'Họ và tên chứa ký tự không hợp lệ', type: 'error' });
      return false;
    }

    // Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Email không hợp lệ');
      showToast({ title: 'Email không hợp lệ', type: 'error' });
      return false;
    }

    // Phone: numeric, start with 0, 10 digits
    const phoneRegex = /^0\d{9}$/;
    if (!phoneRegex.test(formData.phone)) {
      setError('Số điện thoại phải bắt đầu bằng 0 và có đúng 10 chữ số');
      showToast({ title: 'Số điện thoại phải bắt đầu bằng 0 và có đúng 10 chữ số', type: 'error' });
      return false;
    }

    // Username
    const usernameRegex = /^[A-Za-z0-9_]{4,30}$/;
    if (!usernameRegex.test(formData.username)) {
      setError('Tên tài khoản chỉ gồm chữ, số và dấu gạch dưới, độ dài 4-30');
      showToast({ title: 'Tên tài khoản chỉ gồm chữ, số và dấu gạch dưới, độ dài 4-30', type: 'error' });
      return false;
    }

    // Password strength
    const passwordStrong = /(?=.{8,})(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
    if (!passwordStrong.test(formData.password)) {
      setError('Mật khẩu phải ít nhất 8 ký tự, có chữ hoa, chữ thường và chữ số');
      showToast({ title: 'Mật khẩu phải ít nhất 8 ký tự, có chữ hoa, chữ thường và chữ số', type: 'error' });
      return false;
    }

    if (formData.password !== formData.passwordConfirm) {
      setError('Mật khẩu không khớp');
      showToast({ title: 'Mật khẩu không khớp', type: 'error' });
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
      formData.phone,
      formData.password,
      formData.passwordConfirm,
      formData.farmName
    );
    setLoading(false);
    if (result.success) {
      showToast({ title: 'Đăng ký tài khoản thành công', type: 'success' });
      // Clear passwords but keep other inputs per spec
      setFormData((prev) => ({ ...prev, password: '', passwordConfirm: '' }));
      // Redirect user to login page
      navigate('/login');
    } else {
      // Preserve non-password fields, clear passwords
      setFormData((prev) => ({ ...prev, password: '', passwordConfirm: '' }));
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
              <div className="auth-brand-mark_icon">🦐</div>
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
                  {fieldErrors.fullName && <div className="field-error">{fieldErrors.fullName}</div>}
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
                  {fieldErrors.username && <div className="field-error">{fieldErrors.username}</div>}
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
                  {fieldErrors.email && <div className="field-error">{fieldErrors.email}</div>}
                </div>

                <div className="form-group">
                  <label htmlFor="phone">Số điện thoại</label>
                  <input
                    id="phone"
                    type="tel"
                    name="phone"
                    className="auth-text-input"
                    placeholder="Nhập số điện thoại (bắt đầu 0, 10 chữ số)"
                    value={formData.phone}
                    onChange={handleChange}
                    disabled={loading}
                    required
                  />
                  {fieldErrors.phone && <div className="field-error">{fieldErrors.phone}</div>}
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
                  {fieldErrors.farmName && <div className="field-error">{fieldErrors.farmName}</div>}
                </div>
              </div>

              {error && <div className="form-error" role="alert">{error}</div>}

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
                  {fieldErrors.password && <div className="field-error">{fieldErrors.password}</div>}
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




