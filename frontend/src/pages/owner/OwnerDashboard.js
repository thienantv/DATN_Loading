import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { adminService, pondService, seasonService, taskService, notificationService, environmentLogService } from '../../services/api'
import DashboardCard, { evaluateMetric } from '../../components/DashboardCard'
import '../../styles/dashboard.css'
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

const OwnerDashboard = () => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [ponds, setPonds] = useState([])
  const [seasons, setSeasons] = useState([])
  const [staffCount, setStaffCount] = useState(0)
  const [notifications, setNotifications] = useState([])
  const [environmentAlerts, setEnvironmentAlerts] = useState([])

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true)

        const [pondsRes, seasonsRes, staffRes, notificationsRes] = await Promise.all([
          pondService.getAllPonds(),
          seasonService.getAllSeasons(),
          adminService.getAllUsers(),
          notificationService.getNotifications(),
        ])

        const pondData = pondsRes?.data?.data || []
        const seasonData = seasonsRes?.data?.data || []
        const staffData = staffRes?.data?.data || []
        const notificationData = notificationsRes?.data?.data || []

        setPonds(pondData)
        setSeasons(seasonData)
        setStaffCount(staffData.length)
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
    const activeSeasons = seasons.filter((season) => String(season.status || '').toUpperCase() === 'ACTIVE')
    const unreadNotifications = notifications.filter((item) => !item.is_read)

    return {
      pondCount: ponds.length,
      activeSeasonCount: activeSeasons.length,
      staffCount: staffCount,
      unreadNotificationCount: unreadNotifications.length,
      activeSeason: activeSeasons[0] || null,
      unreadNotifications,
      environmentAlertCount: environmentAlerts.length,
    }
  }, [ponds, seasons, staffCount, notifications, environmentAlerts])

  if (loading) {
    return (
      <div className="owner-dashboard owner-page">
        <div className="flex-center" style={{ height: '100vh' }}>
          <div className="spinner"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="owner-dashboard owner-page">
      <div style={{ marginBottom: '32px' }}>
        <h1>Tổng quan quản lý trại</h1>
        <p>Chào mừng {user?.full_name} quay lại</p>
        {user?.farm_id && <p style={{ fontSize: '0.95rem', color: '#666', marginTop: '8px' }}>Farm ID: {user.farm_id}</p>}
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: '24px' }}>{error}</div>}

      <section className="dashboard-cards-container">
        <DashboardCard
          title="Ao nuôi"
          value={summary.pondCount}
          rating={evaluateMetric('ponds', summary.pondCount)}
          description="Tổng số ao trong trại"
        />
        <DashboardCard
          title="Mùa vụ đang hoạt động"
          value={summary.activeSeasonCount}
          rating={evaluateMetric('seasons', summary.activeSeasonCount)}
          description="Số mùa vụ hiện tại"
        />
        <DashboardCard
          title="Nhân viên"
          value={summary.staffCount}
          rating={evaluateMetric('staff', summary.staffCount)}
          description="Tổng nhân viên trong trại"
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
          rating="cao"
          description="Thông báo cần xem"
        />
      </section>

      {environmentAlerts.length > 0 && (
        <div className="card" style={{ marginTop: '32px' }}>
          <h3 style={{ marginBottom: '16px' }}>Cảnh báo môi trường</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '300px', overflowY: 'auto' }}>
            {environmentAlerts.map((alert) => (
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
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '32px' }}>
        <div className="card">
          <h3 style={{ marginBottom: '16px' }}>Mùa vụ hiện tại</h3>
          {summary.activeSeason ? (
            <div>
              <p style={{ marginBottom: '12px' }}>
                <strong>{summary.activeSeason.season_name}</strong>
              </p>
              <p style={{ fontSize: '0.95rem', color: '#666', marginBottom: '8px' }}>
                Bắt đầu: {formatDate(summary.activeSeason.start_date)}
              </p>
              <p style={{ fontSize: '0.95rem', color: '#666', marginBottom: '16px' }}>
                Dự kiến thu hoạch: {formatDate(summary.activeSeason.expected_harvest)}
              </p>
              <Link to="/owner/ponds" className="btn btn-primary" style={{ width: '100%', textAlign: 'center' }}>
                Quản lý ao
              </Link>
            </div>
          ) : (
            <div>
              <p style={{ color: '#999', marginBottom: '16px' }}>Chưa có mùa vụ nào đang hoạt động</p>
              <Link to="/owner/ponds" className="btn btn-primary" style={{ width: '100%', textAlign: 'center' }}>
                Tạo mùa vụ
              </Link>
            </div>
          )}
        </div>

        <div className="card">
          <h3 style={{ marginBottom: '16px' }}>Hành động nhanh</h3>
          <div className="btn-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <Link to="/owner/ponds" className="btn btn-secondary">
              📍 Quản lý ao
            </Link>
            <Link to="/owner/users" className="btn btn-secondary">
              👥 Quản lý nhân viên
            </Link>
            <Link to="/profile" className="btn btn-secondary">
              ⚙️ Tài khoản của tôi
            </Link>
          </div>
        </div>
      </div>

      {summary.unreadNotifications.length > 0 && (
        <div className="card" style={{ marginTop: '32px' }}>
          <h3 style={{ marginBottom: '16px' }}>Thông báo gần đây</h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {summary.unreadNotifications.slice(0, 5).map((notification) => (
              <li key={`notif-${notification.notification_id}`} style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid #eee' }}>
                <p style={{ margin: '0 0 4px 0', fontWeight: 500 }}>{notification.message}</p>
                <p style={{ margin: '0', fontSize: '0.85rem', color: '#999' }}>
                  {new Date(notification.created_at).toLocaleString('vi-VN')}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default OwnerDashboard
