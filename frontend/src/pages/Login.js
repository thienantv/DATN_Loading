import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/login.css';

export const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!username || !password) {
      setError('Vui lòng nhập tên đăng nhập và mật khẩu');
      setLoading(false);
      return;
    }

    const result = await login(username, password);
    setLoading(false);

    if (result.success) {
      // Redirect đến dashboard dựa trên role
      const role = String(result.user?.role || '').trim().toUpperCase();
      if (role === 'ADMIN') {
        navigate('/admin/dashboard');
      } else if (role === 'OWNER') {
        navigate('/owner/dashboard');
      } else if (role === 'MANAGER') {
        navigate('/manager/dashboard');
      } else if (role === 'ACCOUNTANT') {
        navigate('/accountant/dashboard');
      } else if (role === 'WORKER') {
        navigate('/worker/dashboard');
      } else if (role === 'TECHNICIAN') {
        navigate('/technician/dashboard');
      } else if (role === 'STOREKEEPER') {
        navigate('/storekeeper/dashboard');
      } else {
        navigate('/');
      }
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-layout">
        <div className="center-panel">
          <div className="form-card form-card--large">
            <div className="auth-brand-mark">
              <div className="auth-brand-mark__icon">🦐</div>
            </div>
            <form onSubmit={handleSubmit} className="auth-form">
              <h2>Đăng nhập</h2>
              <p className="auth-form__subtitle">Hệ thống quản lý ao tôm thông minh</p>

              {error && <div className="alert alert-error">{error}</div>}

              <div className="form-group">
                <label htmlFor="username">Tên đăng nhập</label>
                <input
                  id="username"
                  type="text"
                  className="auth-text-input"
                  placeholder="Nhập tên đăng nhập hoặc email"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">Mật khẩu</label>
                <div className="password-input-wrapper">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Nhập mật khẩu"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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

              <div className="auth-options-row">
                <label className="auth-remember">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span>Ghi nhớ đăng nhập</span>
                </label>
                <span className="auth-forgot">Quên mật khẩu?</span>
              </div>

              <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                {loading ? '🔄 Đang đăng nhập...' : '🔒 Đăng nhập'}
              </button>
            </form>

            <div className="auth-footer">
              <p>
                Chưa có tài khoản?{' '}
                <Link to="/register" className="auth-link">
                  Đăng ký ngay
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;





