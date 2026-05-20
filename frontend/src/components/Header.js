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
    // Show confirmation dialog
    if (window.confirm('Bạn có chắc chắn muốn đăng xuất?')) {
      logout();
      navigate('/login');
    }
  };

  const getDashboardPath = () => {
    switch(userRole) {
      case 'ADMIN':
        return '/admin/dashboard';
      case 'OWNER':
        return '/owner/dashboard';
      case 'MANAGER':
        return '/manager/dashboard';
      case 'WORKER':
        return '/worker/dashboard';
      case 'TECHNICIAN':
        return '/technician/dashboard';
      case 'ACCOUNTANT':
        return '/accountant/dashboard';
      case 'STOREKEEPER':
        return '/storekeeper/dashboard';
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
      case 'ACCOUNTANT':
        return '#f59e0b';
      case 'STOREKEEPER':
        return '#8b5cf6';
      default:
        return '#6b7280';
    }
  };

  const getRoleName = (role) => {
    switch (role) {
      case 'OWNER':
        return 'Chủ trại';
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
      case 'STOREKEEPER':
        return 'Quản lý kho';
      default:
        return role;
    }
  };

  const getRoleClassName = (role) => {
    switch (role) {
      case 'ADMIN':
        return 'header__role--admin';
      case 'MANAGER':
        return 'header__role--manager';
      case 'WORKER':
        return 'header__role--worker';
      case 'TECHNICIAN':
        return 'header__role--technician';
      case 'ACCOUNTANT':
        return 'header__role--accountant';
      case 'STOREKEEPER':
        return 'header__role--storekeeper';
      default:
        return 'header__role--default';
    }
  };

  const getInitials = (fullName) => {
    const name = String(fullName || '').trim();
    if (!name) return '?';
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
  };

  const avatarSrc = user?.avatar_url || '';

  return (
    <header className="header">
      <div className="header-content">
        <Link to={getDashboardPath()} className="logo">
          <span className="logo-icon">🦐</span>
          <span className="logo-text">Nuôi Tôm Thông Minh</span>
        </Link>

        <div className="header-right">
          <NotificationBell />
          <div className="user-menu">
            <div className={`user-info ${getRoleClassName(user?.role)}`} onClick={() => setShowDropdown(!showDropdown)}>
              <div className="user-avatar">
                {avatarSrc ? (
                  <img src={avatarSrc} alt="Avatar" className="user-avatar__image" />
                ) : (
                  getInitials(user?.full_name)
                )}
              </div>
              <div className="user-details">
                <div className="user-name">{user?.full_name}</div>
                <div className="user-role">
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
                <hr className="header__divider" />
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
