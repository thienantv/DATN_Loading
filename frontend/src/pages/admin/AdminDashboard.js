import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/api';
import '../../styles/dashboard.css';
import '../../styles/admin-dashboard.css';

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
      // response.data = { success: true, data: {...} }
      // So we need response.data.data to get the actual stats
      setStats(response.data.data);
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
        <div className="flex-center admin-dashboard__loading-container">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>🔐 Bảng điều khiển quản lý</h1>
        <p>Tổng quan hệ thống quản lý ao tôm thông minh</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon admin-dashboard__stat-icon--users">
            👥
          </div>
          <div className="stat-content">
            <p className="stat-label">Tổng người dùng</p>
            <p className="stat-value">{stats?.total_users || 0}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon admin-dashboard__stat-icon--ponds">
            🏞️
          </div>
          <div className="stat-content">
            <p className="stat-label">Tổng ao nuôi</p>
            <p className="stat-value">{stats?.total_ponds || 0}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon admin-dashboard__stat-icon--seasons">
            🌾
          </div>
          <div className="stat-content">
            <p className="stat-label">Tổng mùa vụ</p>
            <p className="stat-value">{stats?.total_seasons || 0}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon admin-dashboard__stat-icon--active-seasons">
            📊
          </div>
          <div className="stat-content">
            <p className="stat-label">Mùa vụ hoạt động</p>
            <p className="stat-value">{stats?.active_seasons || 0}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
