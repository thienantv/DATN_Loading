import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { expenseService, notificationService, pondService, seasonService, taskService, environmentLogService } from '../../services/api'
import { showToast } from '../../utils/toast'
import DashboardCard, { evaluateMetric } from '../../components/DashboardCard'
import '../../styles/manager/manager-dashboard.css'
import '../../styles/manager/manager-common.css'
import '../../styles/dashboard-cards.css'

const formatCurrency = (value) => {
  const amount = Number(value || 0)
  if (!Number.isFinite(amount)) return '0 đ'
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(amount) + ' đ'
}

const formatDate = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(date)
}

const ManagerDashboard = () => {
  const [loading, setLoading] = useState(true)
  const [ponds, setPonds] = useState([])
  const [seasons, setSeasons] = useState([])
  const [tasks, setTasks] = useState([])
  const [notifications, setNotifications] = useState([])
  const [expenseTotal, setExpenseTotal] = useState(0)
  const [environmentAlerts, setEnvironmentAlerts] = useState([])

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true)

        const [pondsRes, seasonsRes, tasksRes, notificationsRes] = await Promise.all([
          pondService.getAllPonds(),
          seasonService.getAllSeasons(),
          taskService.getAllTasks(),
          notificationService.getNotifications(),
        ])

        const pondData = pondsRes?.data?.data || []
        const seasonData = seasonsRes?.data?.data || []
        const taskData = tasksRes?.data?.data || []
        const notificationData = notificationsRes?.data?.data || []

        setPonds(pondData)
        setSeasons(seasonData)
        setTasks(taskData)
        setNotifications(notificationData)

        // Fetch environment alerts
        const alerts = []
        await Promise.all(
          pondData.map(async (pond) => {
            try {
              const [thresholdRes, logsRes] = await Promise.all([
                environmentLogService.getThresholdsByPond(pond.pond_id),
                environmentLogService.getByPondId(pond.pond_id),
              ])
              const thresh = thresholdRes?.data?.data
              const logs = logsRes?.data?.data || []

              if (logs.length > 0 && thresh) {
                const sorted = [...logs].sort(
                  (a, b) =>
                    new Date(b.logged_at || b.created_at || 0).getTime() -
                    new Date(a.logged_at || a.created_at || 0).getTime()
                )
                const latest = sorted[0]

                const violations = []
                const toNumber = (v) => {
                  const n = Number(v)
                  return Number.isFinite(n) ? n : null
                }

                const ph = toNumber(latest.ph)
                if (ph !== null) {
                  if (thresh.min_ph !== null && ph < thresh.min_ph) violations.push(`pH dưới ${thresh.min_ph}`)
                  if (thresh.max_ph !== null && ph > thresh.max_ph) violations.push(`pH vượt ${thresh.max_ph}`)
                }

                const temp = toNumber(latest.temperature)
                if (temp !== null) {
                  if (thresh.min_temp !== null && temp < thresh.min_temp) violations.push(`Nhiệt độ dưới ${thresh.min_temp}°C`)
                  if (thresh.max_temp !== null && temp > thresh.max_temp) violations.push(`Nhiệt độ vượt ${thresh.max_temp}°C`)
                }

                const oxy = toNumber(latest.oxygen)
                if (oxy !== null) {
                  if (thresh.min_oxygen !== null && oxy < thresh.min_oxygen) violations.push(`DO dưới ${thresh.min_oxygen} mg/L`)
                  if (thresh.max_oxygen !== null && oxy > thresh.max_oxygen) violations.push(`DO vượt ${thresh.max_oxygen} mg/L`)
                }

                const salinity = toNumber(latest.salinity)
                if (salinity !== null) {
                  if (thresh.min_salinity !== null && salinity < thresh.min_salinity) violations.push(`Độ mặn dưới ${thresh.min_salinity} ppt`)
                  if (thresh.max_salinity !== null && salinity > thresh.max_salinity) violations.push(`Độ mặn vượt ${thresh.max_salinity} ppt`)
                }

                if (violations.length > 0) {
                  alerts.push({
                    pond_id: pond.pond_id,
                    pond_code: pond.pond_code,
                    pond_name: pond.pond_name,
                    violations,
                    logged_at: latest.logged_at || latest.created_at,
                  })
                }
              }
            } catch (err) {
              // Silent fail
            }
          })
        )
        setEnvironmentAlerts(alerts)

        const activeSeason = seasonData.find(
          (season) => String(season.status || '').toUpperCase() === 'ACTIVE'
        )

        if (activeSeason?.season_id) {
          try {
            const totalRes = await expenseService.getTotalExpenseBySeason(activeSeason.season_id)
            const totalValue = totalRes?.data?.data?.total_expense || 0
            setExpenseTotal(totalValue)
          } catch (expenseError) {
            setExpenseTotal(0)
          }
        } else {
          setExpenseTotal(0)
          }
      } catch (loadError) {
          showToast({ message: loadError?.response?.data?.message || 'Không tải được dữ liệu tổng quan', type: 'error' })
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [])

  const summary = useMemo(() => {
    const openTasks = tasks.filter((task) => String(task.status || '').toUpperCase() !== 'COMPLETED')
    const completedTasks = tasks.filter((task) => String(task.status || '').toUpperCase() === 'COMPLETED')
    const overdueTasks = openTasks.filter((task) => {
      if (!task.due_date) return false
      const due = new Date(task.due_date)
      return !Number.isNaN(due.getTime()) && due.getTime() < Date.now()
    })
    const unreadNotifications = notifications.filter((item) => !item.is_read)
    const activeSeasons = seasons.filter((season) => String(season.status || '').toUpperCase() === 'ACTIVE')

    const completionRate = tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0

    return {
      pondCount: ponds.length,
      activeSeasonCount: activeSeasons.length,
      openTaskCount: openTasks.length,
      completedTaskCount: completedTasks.length,
      completionRate,
      unreadNotificationCount: unreadNotifications.length,
      overdueTasks,
      unreadNotifications,
      activeSeason: activeSeasons[0] || null,
      environmentAlertCount: environmentAlerts.length,
    }
  }, [ponds, seasons, tasks, notifications, environmentAlerts])

  const quickLinks = [
    { to: '/manager/tasks', label: 'Quản lý công việc' },
    { to: '/manager/environment', label: 'Môi trường realtime' },
    { to: '/manager/notifications', label: 'Nhận cảnh báo' },
    { to: '/manager/expenses', label: 'Quản lý chi phí' },
  ]

  if (loading) {
    return (
      <div className="manager-dashboard manager-page">
        <div className="manager-dashboard__loading">Đang tải dashboard...</div>
      </div>
    )
  }

  return (
    <div className="manager-dashboard manager-page">
      <div className="manager-dashboard__header">
        <div>
          <h1>Tổng quan quản lý</h1>
          <p>Chỉ hiển thị các chỉ số cần theo dõi mỗi ngày</p>
        </div>
        <div className="manager-dashboard__season-chip">
          <span>Mùa vụ hiện tại:</span>
          <strong>{summary.activeSeason?.season_name || 'Chưa có mùa vụ ACTIVE'}</strong>
        </div>
      </div>

      {/* Errors are displayed via global toasts */}

      <section className="dashboard-cards-container">
        <DashboardCard
          title="Công việc chưa xong"
          value={summary.openTaskCount}
          rating={evaluateMetric('tasks', summary.openTaskCount)}
          description="Công việc đang mở"
        />
        <DashboardCard
          title="Ao nuôi"
          value={summary.pondCount}
          rating={evaluateMetric('ponds', summary.pondCount)}
          description="Tổng số ao"
        />
        <DashboardCard
          title="Cảnh báo môi trường"
          value={summary.environmentAlertCount}
          rating={evaluateMetric('alerts', summary.environmentAlertCount)}
          description="Ao vượt ngưỡng"
        />
        <DashboardCard
          title="Thông báo chưa đọc"
          value={summary.unreadNotificationCount}
          rating={evaluateMetric('notifications', summary.unreadNotificationCount)}
          description="Cảnh báo mới"
        />
        <DashboardCard
          title="Hoàn thành"
          value={summary.completionRate}
          suffix="%"
          rating={evaluateMetric('completion', summary.completionRate)}
          description="Tỷ lệ hoàn thành"
        />
        <DashboardCard
          title="Công việc quá hạn"
          value={summary.overdueTasks.length}
          rating={evaluateMetric('alerts', summary.overdueTasks.length)}
          description="Cần xử lý ngay"
        />
      </section>

      <section className="manager-dashboard__panel-grid">
        <article className="manager-dashboard__panel">
          <h2>Cảnh báo môi trường</h2>
          {environmentAlerts.length === 0 ? (
            <p className="empty">Mọi ao đều trong ngưỡng an toàn</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '300px', overflowY: 'auto' }}>
              {environmentAlerts.slice(0, 5).map((alert) => (
                <div key={`alert-${alert.pond_id}`} style={{ padding: '10px', backgroundColor: '#fee2e2', borderRadius: '8px', borderLeft: '4px solid #dc2626' }}>
                  <p style={{ margin: '0 0 6px 0', fontWeight: 600, fontSize: '0.95rem' }}>
                    {alert.pond_code} - {alert.pond_name}
                  </p>
                  <ul style={{ margin: '4px 0 0 0', paddingLeft: '20px', fontSize: '0.85rem', color: '#b91c1c' }}>
                    {alert.violations.map((v, idx) => (
                      <li key={idx}>{v}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="manager-dashboard__panel">
          <h2>Việc cần xử lý ngay</h2>
          <div className="manager-dashboard__priority-block">
            <h3>Công việc quá hạn</h3>
            {summary.overdueTasks.length === 0 ? (
              <p className="empty">Không có công việc quá hạn</p>
            ) : (
              <ul>
                {summary.overdueTasks.slice(0, 3).map((task) => (
                  <li key={task.task_id}>
                    <span>{task.task_title || 'Công việc'}</span>
                    <small>Hạn: {formatDate(task.due_date)}</small>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="manager-dashboard__priority-block">
            <h3>Thông báo chưa đọc</h3>
            {summary.unreadNotifications.length === 0 ? (
              <p className="empty">Không có thông báo mới</p>
            ) : (
              <ul>
                {summary.unreadNotifications.slice(0, 3).map((item) => (
                  <li key={item.notification_id}>
                    <span>{item.title || 'Thông báo hệ thống'}</span>
                    <small>{formatDate(item.created_at)}</small>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </article>

        <article className="manager-dashboard__panel">
          <h2>Truy cập nhanh</h2>
          <div className="manager-dashboard__quick-links">
            {quickLinks.map((link) => (
              <Link key={link.to} to={link.to} className="manager-dashboard__quick-link">
                {link.label}
              </Link>
            ))}
          </div>

          <div className="manager-dashboard__expense">
            <p>Tổng chi phí mùa vụ hiện tại</p>
            <strong>{formatCurrency(expenseTotal)}</strong>
          </div>
        </article>
      </section>
    </div>
  )
}

export default ManagerDashboard
