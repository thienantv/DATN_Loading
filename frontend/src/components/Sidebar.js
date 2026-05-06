import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/sidebar.css';

export const Sidebar = () => {
  const { userRole } = useAuth();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(true);

  const getMenuItems = () => {
    // Dynamic dashboard path based on user role
    const getDashboardPath = () => {
      switch(userRole) {
        case 'ADMIN':
          return '/admin/dashboard';
        case 'MANAGER':
          return '/manager/dashboard';
        case 'STAFF':
          return '/staff/dashboard';
        default:
          return '/login';
      }
    };

    const commonItems = [
      {
        label: 'Dashboard',
        icon: '📊',
        path: getDashboardPath(),
        roles: ['ADMIN', 'MANAGER', 'STAFF'],
      },
    ];

    const adminItems = [
      {
        label: 'Quản lý tài khoản',
        icon: '👥',
        path: '/admin/users',
        roles: ['ADMIN'],
      },
      {
        label: 'Lịch sử đăng nhập',
        icon: '📝',
        path: '/admin/user-login-history',
        roles: ['ADMIN'],
      },
      {
        label: 'Nhật ký hoạt động',
        icon: '📊',
        path: '/admin/activity-logs',
        roles: ['ADMIN'],
      },
      {
        label: 'Quản lý AI',
        icon: '🤖',
        path: '/admin/ai',
        roles: ['ADMIN'],
      },
    ];

    const managerItems = [
      {
        label: 'Quản lý ao nuôi',
        icon: '🏞️',
        path: '/manager/ponds',
        roles: ['MANAGER'],
      },
      {
        label: 'Quản lý mùa vụ',
        icon: '🌾',
        path: '/manager/seasons',
        roles: ['MANAGER'],
      },
      {
        label: 'Thiết bị cảm biến',
        icon: '📡',
        path: '/manager/sensors',
        roles: ['MANAGER'],
      },
      {
        label: 'Quản lý môi trường',
        icon: '🌡️',
        path: '/manager/environment',
        roles: ['MANAGER'],
      },
      {
        label: 'Nhật ký canh tác',
        icon: '📝',
        path: '/manager/cultivation-logs',
        roles: ['MANAGER'],
      },
      {
        label: 'Quản lý công việc',
        icon: '✓',
        path: '/manager/tasks',
        roles: ['MANAGER'],
      },
      {
        label: 'Quản lý sản phẩm',
        icon: '🍖',
        path: '/manager/products',
        roles: ['MANAGER'],
      },
      {
        label: 'Quản lý bệnh tôm',
        icon: '🦠',
        path: '/manager/diseases',
        roles: ['MANAGER'],
      },
      {
        label: 'Quản lý chi phí',
        icon: '💰',
        path: '/manager/expenses',
        roles: ['MANAGER'],
      },
      {
        label: 'Báo cáo & Thống kê',
        icon: '📊',
        path: '/manager/reports',
        roles: ['MANAGER'],
      },
    ];

    const staffItems = [
      {
        label: 'Ao phụ trách',
        icon: '🏞️',
        path: '/staff/ponds',
        roles: ['STAFF'],
      },
      {
        label: 'Nhật ký canh tác',
        icon: '📝',
        path: '/staff/cultivation-logs',
        roles: ['STAFF'],
      },
      {
        label: 'Nhập dữ liệu môi trường',
        icon: '🌡️',
        path: '/staff/environment',
        roles: ['STAFF'],
      },
      {
        label: 'Nhật ký cho ăn',
        icon: '🍖',
        path: '/staff/feed-logs',
        roles: ['STAFF'],
      },
      {
        label: 'Công việc của tôi',
        icon: '✓',
        path: '/staff/tasks',
        roles: ['STAFF'],
      },
      {
        label: 'Báo cáo bệnh',
        icon: '🦠',
        path: '/staff/disease-report',
        roles: ['STAFF'],
      },
      {
        label: 'Yêu cầu chi phí',
        icon: '💰',
        path: '/staff/expenses',
        roles: ['STAFF'],
      },
    ];

    let items = [...commonItems];

    if (userRole === 'ADMIN') {
      items = [...items, ...adminItems];
    } else if (userRole === 'MANAGER') {
      items = [...items, ...managerItems];
    } else if (userRole === 'STAFF') {
      items = [...items, ...staffItems];
    }

    return items;
  };

  const isActive = (path) => location.pathname === path;

  const MenuItem = ({ item }) => {
    const [submenuOpen, setSubmenuOpen] = useState(false);

    if (item.submenu) {
      return (
        <div className="menu-item-group">
          <button
            className="menu-item submenu-toggle"
            onClick={() => setSubmenuOpen(!submenuOpen)}
          >
            <span className="menu-icon">{item.icon}</span>
            {isOpen && <span className="menu-label">{item.label}</span>}
            {isOpen && (
              <span className={`submenu-arrow ${submenuOpen ? 'open' : ''}`}>
                ›
              </span>
            )}
          </button>
          {submenuOpen && isOpen && (
            <div className="submenu">
              {item.submenu.map((subitem) => (
                <Link
                  key={subitem.path}
                  to={subitem.path}
                  className={`submenu-item ${isActive(subitem.path) ? 'active' : ''}`}
                >
                  {subitem.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      );
    }

    return (
      <Link
        to={item.path}
        className={`menu-item ${isActive(item.path) ? 'active' : ''}`}
      >
        <span className="menu-icon">{item.icon}</span>
        {isOpen && <span className="menu-label">{item.label}</span>}
      </Link>
    );
  };

  return (
    <aside className={`sidebar ${isOpen ? 'open' : 'collapsed'}`}>
      <button
        className="sidebar-toggle"
        onClick={() => setIsOpen(!isOpen)}
        title={isOpen ? 'Thu gọn' : 'Mở rộng'}
      >
        {isOpen ? '◀' : '▶'}
      </button>

      <nav className="sidebar-menu">
        {getMenuItems().map((item) => (
          <MenuItem key={item.path || item.label} item={item} />
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
