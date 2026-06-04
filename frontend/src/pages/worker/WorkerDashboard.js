import React, { useState, useEffect } from 'react'
import { pondService, taskService } from '../../services/api'
import { showToast } from '../../utils/toast'
import DashboardCard, { evaluateMetric } from '../../components/DashboardCard'
import '../../styles/worker/worker-dashboard.css'

export const WorkerDashboard = () => {
  const [assignedPonds, setAssignedPonds] = useState([])
  const [assignedTasks, setAssignedTasks] = useState([])
  const [loading, setLoading] = useState(true)

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
      showToast({ title: 'Lỗi tải dữ liệu', type: 'error' })
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Tính toán thống kê công việc
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
        <div className="flex-center page-loading">
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
          description="Số ao đang chăm sóc"
        />
      </section>

      {/* Quick Actions (Đã xóa các link chết) */}
      <div className="quick-actions">
        <h2>🚀 Hành động nhanh</h2>
        <div className="actions-grid" style={{ gridTemplateColumns: '1fr' }}>
          <a href="/worker/tasks" className="action-btn" style={{ padding: '20px', background: '#eff6ff', border: '1px solid #bfdbfe' }}>
            <span className="action-icon" style={{ fontSize: '2rem' }}>📋</span>
            <span className="action-label" style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>Mở danh sách công việc hôm nay</span>
          </a>
        </div>
      </div>

      {/* Assigned Ponds (Đã bỏ cột Hành động để tránh click lỗi) */}
      <div className="recent-section">
        <h2>🏞️ Ao được phân công theo dõi</h2>
        <div className="table-wrapper">
          <table className="table-base">
            <thead>
              <tr>
                <th>Mã ao</th>
                <th>Tên ao</th>
                <th>Diện tích</th>
                <th>Trạng thái</th>
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
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="table-empty-cell">
                    Kỹ sư chưa phân công bạn vào ao nào
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Features (Đã cập nhật đúng nghiệp vụ hiện tại) */}
      <div className="recent-section section-stack">
        <h2>📌 Quyền hạn và Trách nhiệm</h2>
        <div className="info-boxes">
          <div className="info-box">
            <h3>✨ Nghiệp vụ cho phép</h3>
            <ul>
              <li>✅ Tiếp nhận công việc do Kỹ sư giao.</li>
              <li>✅ Ghi chú, báo cáo kết quả thực địa.</li>
              <li>✅ Bấm xác nhận hoàn thành công việc.</li>
              <li>✅ Xem thông tin cơ bản các ao đang phụ trách.</li>
            </ul>
          </div>

          <div className="info-box">
            <h3>🔒 Giới hạn (Dành cho Cấp quản lý)</h3>
            <ul>
              <li>❌ Không được tự ý tạo hay hủy bỏ công việc.</li>
              <li>❌ Không truy cập được thông tin các ao khác.</li>
              <li>❌ Không xem được ma trận phân công nhân sự.</li>
              <li>❌ Không xem được chi phí, môi trường hay cảm biến.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkerDashboard;