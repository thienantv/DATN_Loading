import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { expenseService, notificationService, pondService, seasonService, taskService } from '../../services/api'
import '../../styles/manager-dashboard.css'

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
  const [error, setError] = useState('')
  const [ponds, setPonds] = useState([])
  const [seasons, setSeasons] = useState([])
  const [tasks, setTasks] = useState([])
  const [notifications, setNotifications] = useState([])
  const [expenseTotal, setExpenseTotal] = useState(0)

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

        setError('')
      } catch (loadError) {
        setError(loadError?.response?.data?.message || 'Không tải được dữ liệu tổng quan')
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [])

  const summary = useMemo(() => {
    const openTasks = tasks.filter((task) => String(task.status || '').toUpperCase() !== 'COMPLETED')
    const overdueTasks = openTasks.filter((task) => {
      if (!task.due_date) return false
      const due = new Date(task.due_date)
      return !Number.isNaN(due.getTime()) && due.getTime() < Date.now()
    })
    const unreadNotifications = notifications.filter((item) => !item.is_read)
    const activeSeasons = seasons.filter((season) => String(season.status || '').toUpperCase() === 'ACTIVE')

    return {
      pondCount: ponds.length,
      activeSeasonCount: activeSeasons.length,
      openTaskCount: openTasks.length,
      unreadNotificationCount: unreadNotifications.length,
      overdueTasks,
      unreadNotifications,
      activeSeason: activeSeasons[0] || null,
    }
  }, [ponds, seasons, tasks, notifications])

  const quickLinks = [
    { to: '/manager/tasks', label: 'Quản lý công việc' },
    { to: '/manager/environment', label: 'Môi trường realtime' },
    { to: '/manager/notifications', label: 'Nhận cảnh báo' },
    { to: '/manager/expenses', label: 'Quản lý chi phí' },
  ]

  if (loading) {
    return (
      <div className="manager-dashboard">
        <div className="manager-dashboard__loading">Đang tải dashboard...</div>
      </div>
    )
  }

  return (
    <div className="manager-dashboard">
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

      {error && <div className="manager-dashboard__error">{error}</div>}

      <section className="manager-dashboard__kpi-grid">
        <article className="manager-dashboard__kpi-card">
          <p className="label">Ao nuôi</p>
          <p className="value">{summary.pondCount}</p>
        </article>
        <article className="manager-dashboard__kpi-card">
          <p className="label">Mùa vụ ACTIVE</p>
          <p className="value">{summary.activeSeasonCount}</p>
        </article>
        <article className="manager-dashboard__kpi-card">
          <p className="label">Công việc chưa xong</p>
          <p className="value">{summary.openTaskCount}</p>
        </article>
        <article className="manager-dashboard__kpi-card">
          <p className="label">Cảnh báo chưa đọc</p>
          <p className="value">{summary.unreadNotificationCount}</p>
        </article>
      </section>

      <section className="manager-dashboard__panel-grid">
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
