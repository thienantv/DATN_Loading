import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/auth.css';

export const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
      const role = result.user?.role;
      if (role === 'ADMIN') {
        navigate('/admin/dashboard');
      } else if (role === 'MANAGER') {
        navigate('/manager/dashboard');
      } else if (role === 'ACCOUNTANT') {
        navigate('/accountant/dashboard');
      } else if (role === 'WORKER') {
        navigate('/worker/dashboard');
      } else if (role === 'TECHNICIAN') {
        navigate('/technician/dashboard');
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
        <div className="left-panel">
          <div className="branding">
            <div className="logo">Hostify.vn</div>
            <h1 className="big-title">Tùy chỉnh
              <br />Trang đăng nhập
              <br />WordPress
            </h1>
            <h3 className="subtitle">TỪ A-Z</h3>

            <div className="contact">
              <p>Website: Hostify.vn</p>
              <p>Liên hệ Kinh doanh: 0247 10 12 369</p>
              <p>Facebook: /hostify.vn</p>
            </div>
          </div>
        </div>

        <div className="right-panel">
          <div className="form-card">
            <form onSubmit={handleSubmit} className="auth-form">
              <h2>Sign up</h2>

              {error && <div className="alert alert-error">{error}</div>}

              <div className="form-group">
                <label htmlFor="username">Name</label>
                <input
                  id="username"
                  type="text"
                  placeholder="Nhập tên đăng nhập"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">Password</label>
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

              <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                {loading ? '🔄 Đang...' : '🔒 Log in'}
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
