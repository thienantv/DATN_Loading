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
      switch (userRole) {
        case 'OWNER':
          return '/owner/dashboard';
        case 'WORKER':
          return '/worker/dashboard';
        case 'ACCOUNTANT':
          return '/accountant/dashboard';
        case 'TECHNICIAN':
          return '/technician/dashboard';
        default:
          return '/login';
      }
    };

    const commonItems = [
      {
        label: 'Bảng điều khiển',
        icon: '📊',
        path: getDashboardPath(),
        roles: ['OWNER', 'WORKER', 'TECHNICIAN', 'ACCOUNTANT'],
      },
    ];

    // Admin UI removed

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
        label: 'Quản lý ao nuôi',
        icon: '🏞️',
        path: '/technician/ponds',
        roles: ['TECHNICIAN'],
      },
      {
        label: 'Quản lý mùa vụ',
        icon: '📅',
        path: '/technician/seasons',
        roles: ['TECHNICIAN'],
      },
      {
        label: 'Nhập môi trường',
        icon: '🌡️',
        path: '/technician/environment',
        roles: ['TECHNICIAN'],
      },
      {
        label: 'Quản lý cảm biến',
        icon: '🔧',
        path: '/technician/sensors',
        roles: ['TECHNICIAN'],
      },
      {
        label: 'Quản lý sản phẩm',
        icon: '🧪',
        path: '/technician/products',
        roles: ['TECHNICIAN'],
      },
      {
        label: 'Phân công công việc',
        icon: '📌',
        path: '/technician/tasks',
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

    const ownerItems = [
      {
        label: 'Quản lý ao nuôi',
        icon: '🏞️',
        path: '/owner/ponds',
        roles: ['OWNER'],
      },
      {
        label: 'Dữ liệu cảm biến',
        icon: '📈',
        path: '/owner/sensor-data',
        roles: ['OWNER'],
      },
      {
        label: 'Dữ liệu môi trường',
        icon: '🌡️',
        path: '/owner/environment',
        roles: ['OWNER'],
      },
      {
        label: 'Quản lý mùa vụ',
        icon: '📅',
        path: '/owner/seasons',
        roles: ['OWNER'],
      },
      {
        label: 'Quản lý sản phẩm',
        icon: '🧪',
        path: '/owner/products',
        roles: ['OWNER'],
      },
      {
        label: 'Nhật ký canh tác',
        icon: '📋',
        path: '/owner/farming-logs',
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

    if (userRole === 'OWNER') {
      items = [...items, ...ownerItems];
    } else if (userRole === 'WORKER') {
      items = [...items, ...workerItems];
    } else if (userRole === 'TECHNICIAN') {
      items = [...items, ...technicianItems];
    } else if (userRole === 'ACCOUNTANT') {
      items = [...items, ...accountantItems];
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
