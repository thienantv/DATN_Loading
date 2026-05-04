import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/api';
import '../../styles/dashboard.css';

export const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await adminService.getSystemStats();
      setStats(response.data);
    } catch (err) {
      setError('Lỗi tải dữ liệu thống kê');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard">
        <div className="flex-center" style={{ minHeight: '400px' }}>
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>🔐 Quản lý Hệ thống</h1>
        <p>Tổng quan hệ thống quản lý ao tôm thông minh</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#dbeafe' }}>
            👥
          </div>
          <div className="stat-content">
            <p className="stat-label">Tổng người dùng</p>
            <p className="stat-value">{stats?.total_users || 0}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#dcfce7' }}>
            🏞️
          </div>
          <div className="stat-content">
            <p className="stat-label">Tổng ao nuôi</p>
            <p className="stat-value">{stats?.total_ponds || 0}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#fef3c7' }}>
            🌾
          </div>
          <div className="stat-content">
            <p className="stat-label">Tổng mùa vụ</p>
            <p className="stat-value">{stats?.total_seasons || 0}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#fee2e2' }}>
            📊
          </div>
          <div className="stat-content">
            <p className="stat-label">Mùa vụ hoạt động</p>
            <p className="stat-value">{stats?.active_seasons || 0}</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h2>🚀 Hành động nhanh</h2>
        <div className="actions-grid">
          <a href="/admin/users" className="action-btn">
            <span className="action-icon">👥</span>
            <span className="action-label">Quản lý tài khoản</span>
          </a>
          <a href="/admin/ponds" className="action-btn">
            <span className="action-icon">🏞️</span>
            <span className="action-label">Quản lý ao nuôi</span>
          </a>
          <a href="/admin/products" className="action-btn">
            <span className="action-icon">📋</span>
            <span className="action-label">Quản lý danh mục</span>
          </a>
          <a href="/admin/system" className="action-btn">
            <span className="action-icon">⚙️</span>
            <span className="action-label">Cài đặt hệ thống</span>
          </a>
        </div>
      </div>

      {/* Recent Activities */}
      <div className="recent-section">
        <h2>📝 Thông tin bổ sung</h2>
        <div className="info-boxes">
          <div className="info-box">
            <h3>📌 Chính sách</h3>
            <ul>
              <li>✅ Quản trị toàn bộ hệ thống</li>
              <li>✅ Không tham gia vận hành ao</li>
              <li>✅ Không nhập nhật ký canh tác</li>
              <li>✅ Không chỉnh dữ liệu sản xuất</li>
            </ul>
          </div>

          <div className="info-box">
            <h3>⚡ Tính năng chính</h3>
            <ul>
              <li>✅ Quản lý tài khoản người dùng</li>
              <li>✅ Quản lý danh mục (Ao, Thức ăn, Thuốc, Bệnh, Cảm biến)</li>
              <li>✅ Sao lưu & khôi phục dữ liệu</li>
              <li>✅ Quản lý model AI</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
