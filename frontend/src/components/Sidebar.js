import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/sidebar.css';

export const Sidebar = () => {
  const { userRole } = useAuth();
  const location = useLocation();
  
  // Tự động mở nếu là màn hình máy tính, đóng nếu là điện thoại
  const [isOpen, setIsOpen] = useState(window.innerWidth > 768);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // Theo dõi sự thay đổi kích thước màn hình
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (mobile) {
        setIsOpen(false); // Màn hình nhỏ thì tự thu gọn
      } else {
        setIsOpen(true);  // Màn hình to thì tự mở ra
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getMenuItems = () => {
    const getDashboardPath = () => {
      switch (userRole) {
        case 'OWNER': return '/owner/dashboard';
        case 'WORKER': return '/worker/dashboard';
        case 'TECHNICIAN': return '/technician/dashboard';
        default: return '/login';
      }
    };

    const commonItems = [
      { label: 'Bảng điều khiển', icon: '📊', path: getDashboardPath(), roles: ['OWNER', 'WORKER', 'TECHNICIAN'] },
    ];

    const workerItems = [
      { label: 'Công việc được giao', icon: '📋', path: '/worker/tasks', roles: ['WORKER'] },
    ];

    const technicianItems = [
      { label: 'Quản lý ao nuôi', icon: '🏞️', path: '/technician/ponds', roles: ['TECHNICIAN'] },
      { label: 'Quản lý mùa vụ', icon: '📅', path: '/technician/seasons', roles: ['TECHNICIAN'] },
      { label: 'Nhập môi trường', icon: '🌡️', path: '/technician/environment', roles: ['TECHNICIAN'] },
      { label: 'Quản lý cảm biến', icon: '🔧', path: '/technician/sensors', roles: ['TECHNICIAN'] },
      { label: 'Quản lý sản phẩm', icon: '🧪', path: '/technician/products', roles: ['TECHNICIAN'] },
      { label: 'Phân công công việc', icon: '📌', path: '/technician/tasks', roles: ['TECHNICIAN'] },
    ];

    const ownerItems = [
      { label: 'Quản lý ao nuôi', icon: '🏞️', path: '/owner/ponds', roles: ['OWNER'] },
      { label: 'Dữ liệu cảm biến', icon: '📈', path: '/owner/sensor-data', roles: ['OWNER'] },
      { label: 'Dữ liệu môi trường', icon: '🌡️', path: '/owner/environment', roles: ['OWNER'] },
      { label: 'Quản lý mùa vụ', icon: '📅', path: '/owner/seasons', roles: ['OWNER'] },
      { label: 'Quản lý sản phẩm', icon: '🧪', path: '/owner/products', roles: ['OWNER'] },
      { label: 'Nhật ký canh tác', icon: '📋', path: '/owner/farming-logs', roles: ['OWNER'] },
      { label: 'Quản lý chi phí', icon: '💰', path: '/owner/costs', roles: ['OWNER'] },
      { label: 'Quản lý nhân viên', icon: '👥', path: '/owner/users', roles: ['OWNER'] },
    ];

    let items = [...commonItems];
    if (userRole === 'OWNER') items = [...items, ...ownerItems];
    else if (userRole === 'WORKER') items = [...items, ...workerItems];
    else if (userRole === 'TECHNICIAN') items = [...items, ...technicianItems];

    return items;
  };

  const isActive = (path) => location.pathname === path;

  // Xử lý tự động đóng menu trên mobile khi click vào 1 link
  const handleLinkClick = () => {
    if (isMobile) {
      setIsOpen(false);
    }
  };

  const MenuItem = ({ item }) => {
    const [submenuOpen, setSubmenuOpen] = useState(false);

    if (item.submenu) {
      return (
        <div className="menu-item-group">
          <button className="menu-item submenu-toggle" onClick={() => setSubmenuOpen(!submenuOpen)}>
            <span className="menu-icon">{item.icon}</span>
            {isOpen && <span className="menu-label">{item.label}</span>}
            {isOpen && <span className={`submenu-arrow ${submenuOpen ? 'open' : ''}`}>›</span>}
          </button>
          {submenuOpen && isOpen && (
            <div className="submenu">
              {item.submenu.map((subitem) => (
                <Link
                  key={subitem.path}
                  to={subitem.path}
                  className={`submenu-item ${isActive(subitem.path) ? 'active' : ''}`}
                  onClick={handleLinkClick} // Đóng khi click menu con
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
        onClick={handleLinkClick} // Đóng khi click menu
      >
        <span className="menu-icon">{item.icon}</span>
        {isOpen && <span className="menu-label">{item.label}</span>}
      </Link>
    );
  };

  return (
    <>
      {/* 1. Nút Menu nổi dành riêng cho Mobile (khi menu đang đóng) */}
      {isMobile && !isOpen && (
        <button 
          className="mobile-menu-toggle"
          onClick={() => setIsOpen(true)}
        >
          ☰
        </button>
      )}

      {/* 2. Lớp nền mờ chìm phía sau khi Menu mở trên Mobile */}
      {isMobile && isOpen && (
        <div className="sidebar-mobile-overlay" onClick={() => setIsOpen(false)}></div>
      )}

      {/* 3. Khung Sidebar */}
      <aside className={`sidebar ${isOpen ? 'open' : 'collapsed'} ${isMobile ? 'is-mobile' : ''}`}>
        {!isMobile && (
          <button className="sidebar-toggle" onClick={() => setIsOpen(!isOpen)} title={isOpen ? 'Thu gọn' : 'Mở rộng'}>
            {isOpen ? '◀' : '▶'}
          </button>
        )}

        {/* Thêm nút X để tắt trên mobile */}
        {isMobile && isOpen && (
           <button className="mobile-close-btn" onClick={() => setIsOpen(false)}>✖</button>
        )}

        <nav className="sidebar-menu">
          {getMenuItems().map((item) => (
            <MenuItem key={item.path || item.label} item={item} />
          ))}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;