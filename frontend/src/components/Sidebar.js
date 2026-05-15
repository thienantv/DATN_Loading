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
        case 'OWNER':
          return '/owner/dashboard';
        case 'MANAGER':
          return '/manager/dashboard';
        case 'WORKER':
          return '/worker/dashboard';
        case 'ACCOUNTANT':
          return '/accountant/dashboard';
        case 'TECHNICIAN':
          return '/technician/dashboard';
        case 'STOREKEEPER':
          return '/storekeeper/dashboard';
        default:
          return '/login';
      }
    };

    const commonItems = [
      {
        label: 'Dashboard',
        icon: '📊',
        path: getDashboardPath(),
        roles: ['ADMIN', 'OWNER', 'MANAGER', 'WORKER', 'TECHNICIAN', 'ACCOUNTANT', 'STOREKEEPER'],
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
        icon: '📅',
        path: '/manager/seasons',
        roles: ['MANAGER'],
      },
      {
        label: 'Nhật ký xử lý',
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
        label: 'Theo dõi cho ăn',
        icon: '🍖',
        path: '/manager/feed-logs',
        roles: ['MANAGER'],
      },
    ];

    const workerItems = [
      {
        label: 'Ao được phân công',
        icon: '🏞️',
        path: '/worker/ponds',
        roles: ['WORKER'],
      },
      {
        label: 'Nhật ký cho ăn',
        icon: '🍖',
        path: '/worker/feed-logs',
        roles: ['WORKER'],
      },
      {
        label: 'Nhật ký canh tác',
        icon: '📝',
        path: '/worker/cultivation-logs',
        roles: ['WORKER'],
      },
      {
        label: 'Công việc được giao',
        icon: '📋',
        path: '/worker/tasks',
        roles: ['WORKER'],
      },
    ];

    const technicianItems = [
      {
        label: 'Nhập môi trường',
        icon: '🌡️',
        path: '/technician/environment',
        roles: ['TECHNICIAN'],
      },
      {
        label: 'Cảm biến realtime',
        icon: '📡',
        path: '/technician/sensor',
        roles: ['TECHNICIAN'],
      },
      {
        label: 'Quản lý cảm biến',
        icon: '🔧',
        path: '/technician/sensors',
        roles: ['TECHNICIAN'],
      },
    ];

    const accountantItems = [
      {
        label: 'Quản lý chi phí',
        icon: '💰',
        path: '/accountant/expenses',
        roles: ['ACCOUNTANT'],
      },
    ];

    const storekeeperItems = [
      {
        label: 'Danh mục sản phẩm',
        icon: '🏷️',
        path: '/storekeeper/categories',
        roles: ['STOREKEEPER'],
      },
      {
        label: 'Quản lý sản phẩm',
        icon: '📦',
        path: '/storekeeper/inventory',
        roles: ['STOREKEEPER'],
      },
      {
        label: 'Nhập kho',
        icon: '📥',
        path: '/storekeeper/imports',
        roles: ['STOREKEEPER'],
      },
      {
        label: 'Xuất kho',
        icon: '📤',
        path: '/storekeeper/exports',
        roles: ['STOREKEEPER'],
      },
      {
        label: 'Cảnh báo tồn kho',
        icon: '⚠️',
        path: '/storekeeper/alerts',
        roles: ['STOREKEEPER'],
      },
    ];

    const ownerItems = [
      {
        label: 'Quản lý ao nuôi',
        icon: '🏞️',
        path: '/owner/ponds',
        roles: ['OWNER'],
      },
      {
        label: 'Quản lý nhân viên',
        icon: '👥',
        path: '/owner/users',
        roles: ['OWNER'],
      },
    ];

    let items = [...commonItems];

    if (userRole === 'ADMIN') {
      items = [...items, ...adminItems];
    } else if (userRole === 'OWNER') {
      items = [...items, ...ownerItems];
    } else if (userRole === 'MANAGER') {
      items = [...items, ...managerItems];
    } else if (userRole === 'WORKER') {
      items = [...items, ...workerItems];
    } else if (userRole === 'TECHNICIAN') {
      items = [...items, ...technicianItems];
    } else if (userRole === 'ACCOUNTANT') {
      items = [...items, ...accountantItems];
    } else if (userRole === 'STOREKEEPER') {
      items = [...items, ...storekeeperItems];
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
