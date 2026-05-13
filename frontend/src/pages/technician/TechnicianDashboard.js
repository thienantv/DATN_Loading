import React, { useState, useEffect } from 'react'
import { pondService, environmentLogService, sensorService } from '../../services/api'
import DashboardCard, { evaluateMetric } from '../../components/DashboardCard'
import '../../styles/dashboard.css'
import '../../styles/dashboard-cards.css'

export const TechnicianDashboard = () => {
  const [monitoredPonds, setMonitoredPonds] = useState([])
  const [recentEnvironmentLogs, setRecentEnvironmentLogs] = useState([])
  const [activeSensors, setActiveSensors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [pondsRes] = await Promise.all([
        pondService.getAllPonds(),
      ])
      setMonitoredPonds(pondsRes.data.data || [])
    } catch (err) {
      setError('Lỗi tải dữ liệu')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Calculate monitoring statistics
  const monitoringStats = {
    totalPonds: monitoredPonds.length,
    activeSensors: monitoredPonds.reduce((acc, pond) => acc + (pond.sensors?.length || 0), 0),
    recentLogs: recentEnvironmentLogs.length,
  }

  if (loading) {
    return (
      <div className="dashboard">
        <div className="flex-center page-loading">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>🔬 Kỹ thuật viên giám sát</h1>
        <p>Theo dõi môi trường & cảm biến trong ao</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <section className="dashboard-cards-container">
        <DashboardCard
          title="Tổng số ao"
          value={monitoringStats.totalPonds}
          rating={evaluateMetric('ponds', monitoringStats.totalPonds)}
          description="Ao đang giám sát"
        />
        <DashboardCard
          title="Cảm biến hoạt động"
          value={monitoringStats.activeSensors}
          rating={evaluateMetric('sensors', monitoringStats.activeSensors)}
          description="Tổng số cảm biến"
        />
      </section>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h2>🚀 Hành động nhanh</h2>
        <div className="actions-grid">
          <a href="/technician/environment" className="action-btn">
            <span className="action-icon">🌡️</span>
            <span className="action-label">Nhập môi trường</span>
          </a>
          <a href="/technician/sensor" className="action-btn">
            <span className="action-icon">📡</span>
            <span className="action-label">Cảm biến realtime</span>
          </a>
        </div>
      </div>

      {/* Monitored Ponds */}
      <div className="recent-section">
        <h2>🏞️ Ao đang giám sát</h2>
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
              {monitoredPonds.length > 0 ? (
                monitoredPonds.map((pond) => (
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
                      <a href={`/technician/environment`} className="btn btn-sm btn-primary">
                        🌡️ Giám sát
                      </a>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="table-empty-cell">
                    Bạn chưa được phân công ao nào
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Features */}
      <div className="recent-section section-stack">
        <h2>📌 Tính năng chính</h2>
        <div className="info-boxes">
          <div className="info-box">
            <h3>✨ Quyền hạn</h3>
            <ul>
              <li>✅ Xem danh sách tất cả ao trong hệ thống</li>
              <li>✅ Nhập chỉ số môi trường thủ công</li>
              <li>✅ Xem dữ liệu cảm biến realtime</li>
              <li>✅ Tạo dữ liệu cảm biến giả để test</li>
            </ul>
          </div>

          <div className="info-box">
            <h3>🔒 Giới hạn</h3>
            <ul>
              <li>❌ Không nhập nhật ký cho ăn</li>
              <li>❌ Không nhập nhật ký canh tác</li>
              <li>❌ Không quản lý công việc</li>
              <li>❌ Không tạo hoặc xóa ao</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TechnicianDashboard;
