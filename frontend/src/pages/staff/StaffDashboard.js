import React, { useState, useEffect } from 'react';
import { seasonService, pondService } from '../../services/api';
import '../../styles/dashboard.css';

export const StaffDashboard = () => {
  const [assignedPonds, setAssignedPonds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [pondsRes] = await Promise.all([
        pondService.getAllPonds(),
        seasonService.getAllSeasons(),
      ]);
      // In a real app, we would filter ponds by assigned_staff = current user
      setAssignedPonds(pondsRes.data.data || []);
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

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>👷 Nhân viên vận hành</h1>
        <p>Nhập liệu & thực thi công việc ngoài ao</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#dbeafe' }}>
            🏞️
          </div>
          <div className="stat-content">
            <p className="stat-label">Ao phụ trách</p>
            <p className="stat-value">{assignedPonds.length}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#dcfce7' }}>
            📝
          </div>
          <div className="stat-content">
            <p className="stat-label">Nhật ký hôm nay</p>
            <p className="stat-value">0</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#fef3c7' }}>
            ✓
          </div>
          <div className="stat-content">
            <p className="stat-label">Công việc chờ làm</p>
            <p className="stat-value">0</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#fee2e2' }}>
            🏥
          </div>
          <div className="stat-content">
            <p className="stat-label">Báo cáo bệnh</p>
            <p className="stat-value">0</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h2>🚀 Hành động nhanh</h2>
        <div className="actions-grid">
          <a href="/staff/ponds" className="action-btn">
            <span className="action-icon">🏞️</span>
            <span className="action-label">Ao phụ trách</span>
          </a>
          <a href="/staff/feed-logs" className="action-btn">
            <span className="action-icon">🍖</span>
            <span className="action-label">Nhật ký cho ăn</span>
          </a>
          <a href="/staff/cultivation-logs" className="action-btn">
            <span className="action-icon">📝</span>
            <span className="action-label">Nhật ký canh tác</span>
          </a>
          <a href="/staff/environment" className="action-btn">
            <span className="action-icon">🌡️</span>
            <span className="action-label">Nhập môi trường</span>
          </a>
          <a href="/staff/sensor" className="action-btn">
            <span className="action-icon">📡</span>
            <span className="action-label">Cảm biến realtime</span>
          </a>
        </div>
      </div>

      {/* Assigned Ponds */}
      <div className="recent-section">
        <h2>🏞️ Ao phụ trách</h2>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Mã ao</th>
                <th>Tên ao</th>
                <th>Diện tích</th>
                <th>Trạng thái</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {assignedPonds.length > 0 ? (
                assignedPonds.map((pond) => (
                  <tr key={pond.pond_id}>
                    <td><strong>{pond.pond_code}</strong></td>
                    <td>{pond.pond_name}</td>
                    <td>{pond.area_m2} m²</td>
                    <td>
                      <span className="status-badge status-active">
                        {pond.status}
                      </span>
                    </td>
                    <td>
                      <a href={`/staff/ponds/${pond.pond_id}`} className="btn btn-sm btn-primary">
                        👁️ Xem
                      </a>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>
                    Bạn chưa được phân công ao nào
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
              <li>✅ Xem ao được phân công</li>
              <li>✅ Nhập nhật ký cho ăn</li>
              <li>✅ Nhập chỉ số môi trường</li>
            </ul>
          </div>

          <div className="info-box">
            <h3>🔒 Giới hạn</h3>
            <ul>
              <li>❌ Không thấy ao khác</li>
              <li>❌ Không tạo/xóa ao</li>
              <li>❌ Không ghi feed log cho ao không được phân công</li>
              <li>❌ Không chỉnh sửa dữ liệu realtime</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffDashboard;
