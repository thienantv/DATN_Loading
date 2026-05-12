import React, { useState, useEffect } from 'react'
import { pondService, taskService } from '../../services/api'
import DashboardCard, { evaluateMetric } from '../../components/DashboardCard'
import '../../styles/dashboard.css'
import '../../styles/dashboard-cards.css'

export const WorkerDashboard = () => {
  const [assignedPonds, setAssignedPonds] = useState([])
  const [assignedTasks, setAssignedTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [pondsRes, tasksRes] = await Promise.all([
        pondService.getAllPonds(),
        taskService.getAllTasks(),
      ])
      setAssignedPonds(pondsRes.data.data || [])
      setAssignedTasks(tasksRes.data.data || [])
    } catch (err) {
      setError('Lỗi tải dữ liệu')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Calculate task statistics
  const taskStats = {
    total: assignedTasks.length,
    pending: assignedTasks.filter((t) => String(t.status || '').toUpperCase() === 'PENDING').length,
    inProgress: assignedTasks.filter((t) => String(t.status || '').toUpperCase() === 'IN_PROGRESS').length,
    completed: assignedTasks.filter((t) => String(t.status || '').toUpperCase() === 'COMPLETED').length,
    completionRate: assignedTasks.length > 0 ? Math.round((assignedTasks.filter((t) => String(t.status || '').toUpperCase() === 'COMPLETED').length / assignedTasks.length) * 100) : 0,
  }

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

      <section className="dashboard-cards-container">
        <DashboardCard
          title="Công việc được giao"
          value={taskStats.total}
          rating={evaluateMetric('tasks', taskStats.total)}
          description="Tổng cộng"
        />
        <DashboardCard
          title="Chờ làm"
          value={taskStats.pending}
          rating={evaluateMetric('tasks', taskStats.pending)}
          description="Trạng thái PENDING"
        />
        <DashboardCard
          title="Đang làm"
          value={taskStats.inProgress}
          rating={evaluateMetric('tasks', taskStats.inProgress)}
          description="Trạng thái IN_PROGRESS"
        />
        <DashboardCard
          title="Hoàn thành"
          value={taskStats.completed}
          rating={evaluateMetric('alerts', taskStats.completed)}
          description="Trạng thái COMPLETED"
        />
        <DashboardCard
          title="Ao phụ trách"
          value={assignedPonds.length}
          rating={evaluateMetric('ponds', assignedPonds.length)}
          description="Số ao được giao"
        />
      </section>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h2>🚀 Hành động nhanh</h2>
        <div className="actions-grid">
          <a href="/worker/ponds" className="action-btn">
            <span className="action-icon">🏞️</span>
            <span className="action-label">Ao phụ trách</span>
          </a>
          <a href="/worker/feed-logs" className="action-btn">
            <span className="action-icon">🍖</span>
            <span className="action-label">Nhật ký cho ăn</span>
          </a>
          <a href="/worker/cultivation-logs" className="action-btn">
            <span className="action-icon">📝</span>
            <span className="action-label">Nhật ký canh tác</span>
          </a>
          <a href="/worker/tasks" className="action-btn">
            <span className="action-icon">📋</span>
            <span className="action-label">Công việc được giao</span>
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
                      <a href="/worker/ponds" className="btn btn-sm btn-primary">
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
                <li>✅ Nhập nhật ký canh tác</li>
                <li>✅ Cập nhật trạng thái công việc</li>
            </ul>
          </div>

          <div className="info-box">
            <h3>🔒 Giới hạn</h3>
            <ul>
              <li>❌ Không thấy ao khác</li>
              <li>❌ Không tạo/xóa ao</li>
              <li>❌ Không ghi feed log cho ao không được phân công</li>
                <li>❌ Không quản lý cảm biến</li>
                <li>❌ Không nhập chỉ số môi trường (dành cho Kỹ thuật viên)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkerDashboard;
