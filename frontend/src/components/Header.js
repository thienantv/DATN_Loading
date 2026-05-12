import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';
import '../styles/header.css';

export const Header = () => {
  const { user, logout, userRole } = useAuth();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getDashboardPath = () => {
    switch(userRole) {
      case 'ADMIN':
        return '/admin/dashboard';
      case 'MANAGER':
        return '/manager/dashboard';
      case 'WORKER':
        return '/worker/dashboard';
      case 'TECHNICIAN':
        return '/technician/dashboard';
      default:
        return '/login';
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'ADMIN':
        return '#dc2626';
      case 'MANAGER':
        return '#2563eb';
      case 'WORKER':
        return '#16a34a';
      case 'TECHNICIAN':
        return '#7c3aed';
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
      case 'WORKER':
        return 'Công nhân';
      case 'TECHNICIAN':
        return 'Kỹ thuật viên';
      default:
        return role;
    }
  };

  return (
    <header className="header">
      <div className="header-content">
        <Link to={getDashboardPath()} className="logo">
          <span className="logo-icon">🦐</span>
          <span className="logo-text">Smart Shrimp</span>
        </Link>

        <div className="header-right">
          <NotificationBell />
          <div className="user-menu">
            <div className="user-info" onClick={() => setShowDropdown(!showDropdown)}>
              <div className="user-avatar" style={{ backgroundColor: getRoleColor(user?.role) }}>
                {user?.full_name?.charAt(0).toUpperCase()}
              </div>
              <div className="user-details">
                <div className="user-name">{user?.full_name}</div>
                <div className="user-role" style={{ color: getRoleColor(user?.role) }}>
                  {getRoleName(user?.role)}
                </div>
              </div>
            </div>

            {showDropdown && (
              <div className="dropdown-menu">
                <Link to="/profile" className="dropdown-item">
                  👤 Hồ sơ cá nhân
                </Link>
                <Link to="/change-password" className="dropdown-item">
                  🔒 Đổi mật khẩu
                </Link>
                <hr style={{ margin: '8px 0', border: 'none', borderTop: '1px solid #e5e7eb' }} />
                <button className="dropdown-item danger" onClick={handleLogout}>
                  🚪 Đăng xuất
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
