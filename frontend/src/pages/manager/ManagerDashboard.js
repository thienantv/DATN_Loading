import React, { useState, useEffect } from 'react';
import { pondService, seasonService } from '../../services/api';
import '../../styles/dashboard.css';

export const ManagerDashboard = () => {
  const [ponds, setPonds] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [pondsRes, seasonsRes] = await Promise.all([
        pondService.getAllPonds(),
        seasonService.getAllSeasons(),
      ]);
      setPonds(pondsRes.data.data || []);
      setSeasons(seasonsRes.data.data || []);
    } catch (err) {
      setError('Lỗi tải dữ liệu');
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

  const activeSeasons = seasons.filter((s) => s.status === 'RUNNING');
  const pendingCultivationLogs = 0; // Placeholder

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>🧠 Quản lý trại nuôi</h1>
        <p>Điều hành toàn bộ hoạt động nuôi tôm</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#dbeafe' }}>
            🏞️
          </div>
          <div className="stat-content">
            <p className="stat-label">Tổng ao nuôi</p>
            <p className="stat-value">{ponds.length || 0}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#dcfce7' }}>
            🌾
          </div>
          <div className="stat-content">
            <p className="stat-label">Mùa vụ hoạt động</p>
            <p className="stat-value">{activeSeasons.length}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#fef3c7' }}>
            📝
          </div>
          <div className="stat-content">
            <p className="stat-label">Nhật ký chờ duyệt</p>
            <p className="stat-value">{pendingCultivationLogs}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#fee2e2' }}>
            ✓
          </div>
          <div className="stat-content">
            <p className="stat-label">Công việc đang làm</p>
            <p className="stat-value">0</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h2>🚀 Hành động nhanh</h2>
        <div className="actions-grid">
          <a href="/manager/ponds" className="action-btn">
            <span className="action-icon">🏞️</span>
            <span className="action-label">Quản lý ao nuôi</span>
          </a>
          <a href="/manager/seasons" className="action-btn">
            <span className="action-icon">🌾</span>
            <span className="action-label">Quản lý mùa vụ</span>
          </a>
          <a href="/manager/cultivation-logs" className="action-btn">
            <span className="action-icon">📝</span>
            <span className="action-label">Nhật ký canh tác</span>
          </a>
          <a href="/manager/tasks" className="action-btn">
            <span className="action-icon">✓</span>
            <span className="action-label">Quản lý công việc</span>
          </a>
          <a href="/manager/environment" className="action-btn">
            <span className="action-icon">🌡️</span>
            <span className="action-label">Môi trường</span>
          </a>
          <a href="/manager/expenses" className="action-btn">
            <span className="action-icon">💰</span>
            <span className="action-label">Quản lý chi phí</span>
          </a>
          <a href="/manager/diseases" className="action-btn">
            <span className="action-icon">🔬</span>
            <span className="action-label">Bệnh & AI</span>
          </a>
          <a href="/manager/reports" className="action-btn">
            <span className="action-icon">📊</span>
            <span className="action-label">Báo cáo & Thống kê</span>
          </a>
        </div>
      </div>

      {/* Active Seasons */}
      <div className="recent-section">
        <h2>🌾 Mùa vụ đang hoạt động</h2>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Tên mùa vụ</th>
                <th>Ao</th>
                <th>Ngày bắt đầu</th>
                <th>Dự kiến thu hoạch</th>
                <th>Trạng thái</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {activeSeasons.length > 0 ? (
                activeSeasons.slice(0, 5).map((season) => (
                  <tr key={season.season_id}>
                    <td>{season.season_name}</td>
                    <td>Ao {season.pond_id}</td>
                    <td>{new Date(season.start_date).toLocaleDateString('vi-VN')}</td>
                    <td>{new Date(season.expected_harvest).toLocaleDateString('vi-VN')}</td>
                    <td>
                      <span className="status-badge status-running">🟢 Hoạt động</span>
                    </td>
                    <td>
                      <a href={`/manager/seasons/${season.season_id}`} className="btn btn-sm btn-primary">
                        👁️ Xem chi tiết
                      </a>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>
                    Không có mùa vụ đang hoạt động
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Features */}
      <div className="recent-section" style={{ marginTop: '30px' }}>
        <h2>📌 Tính năng chính</h2>
        <div className="info-boxes">
          <div className="info-box">
            <h3>✨ Quyền hạn</h3>
            <ul>
              <li>✅ Quản lý ao nuôi & mùa vụ</li>
              <li>✅ Duyệt & khóa nhật ký canh tác</li>
              <li>✅ Duyệt chi phí vận hành</li>
              <li>✅ Xem & xác nhận kết quả bệnh AI</li>
            </ul>
          </div>

          <div className="info-box">
            <h3>🔒 Giới hạn</h3>
            <ul>
              <li>❌ Không quản lý tài khoản hệ thống</li>
              <li>❌ Không chỉnh sửa AI model</li>
              <li>❌ Chỉ có thể duyệt, không sửa nhật ký sau khi duyệt</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManagerDashboard;
