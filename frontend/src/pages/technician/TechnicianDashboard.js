import React, { useState, useEffect } from 'react'
import { pondService, environmentLogService, sensorService, notificationService } from '../../services/api'
import { showToast } from '../../utils/toast'
import '../../styles/technician/technician-dashboard.css'

export const TechnicianDashboard = () => {
  const [monitoredPonds, setMonitoredPonds] = useState([])
  const [recentEnvironmentLogs, setRecentEnvironmentLogs] = useState([])
  const [sensors, setSensors] = useState([])
  const [notifications, setNotifications] = useState([])
  const [latestLogByPond, setLatestLogByPond] = useState({})
  const [thresholdsByPond, setThresholdsByPond] = useState({})
  const [environmentAlerts, setEnvironmentAlerts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
    // Refresh environmental alerts every 30 seconds for real-time updates
    const interval = setInterval(fetchDashboardData, 30000)
    return () => clearInterval(interval)
  }, [])

  const normalizeSensorType = (type) => String(type || '').trim().toLowerCase()

  const normalizeSensorStatus = (status) => {
    const value = String(status || '').trim().toUpperCase()
    if (['ACTIVE', 'ONLINE', 'HOAT_DONG'].includes(value)) return 'ACTIVE'
    return 'INACTIVE'
  }

  const formatDateTime = (raw) => {
    if (!raw) return '--'
    const date = new Date(raw)
    if (Number.isNaN(date.getTime())) return '--'
    return date.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const fetchDashboardData = async () => {
    try {
      setLoading(true)

      const [pondsRes, sensorsRes, notificationsRes] = await Promise.all([
        pondService.getAllPonds(),
        sensorService.getAllSensors(),
        notificationService.getNotifications().catch(() => ({ data: { data: [] } })),
      ])

      const ponds = pondsRes?.data?.data || []
      const allSensors = sensorsRes?.data?.data || []
      const allNotifications = notificationsRes?.data?.data || []

      setMonitoredPonds(ponds)
      setSensors(allSensors)
      setNotifications(allNotifications)

      // Fetch thresholds for each pond
      const thresholds = {}
      await Promise.all(
        ponds.map(async (pond) => {
          try {
            const res = await environmentLogService.getThresholdsByPond(pond.pond_id)
            thresholds[pond.pond_id] = res?.data?.data || null
          } catch (err) {
            thresholds[pond.pond_id] = null
          }
        })
      )
      setThresholdsByPond(thresholds)

      const logGroups = await Promise.all(
        ponds.map(async (pond) => {
          try {
            const response = await environmentLogService.getByPondId(pond.pond_id)
            return {
              pond,
              logs: response?.data?.data || [],
            }
          } catch (logError) {
            return { pond, logs: [] }
          }
        })
      )

      const latestByPond = {}
      const flattenedLogs = []
      const alerts = []

      logGroups.forEach(({ pond, logs }) => {
        if (!logs.length) return
        const sorted = [...logs].sort(
          (a, b) =>
            new Date(b.logged_at || b.created_at || b.recorded_at || 0).getTime() -
            new Date(a.logged_at || a.created_at || a.recorded_at || 0).getTime()
        )

        const latestLog = sorted[0]
        latestByPond[pond.pond_id] = latestLog

        // Check for threshold violations
        const thresh = thresholds[pond.pond_id]
        if (thresh && latestLog) {
          const violations = []
          const toNumber = (v) => {
            const n = Number(v)
            return Number.isFinite(n) ? n : null
          }

          const ph = toNumber(latestLog.ph)
          if (ph !== null) {
            if (thresh.min_ph !== null && ph < thresh.min_ph) violations.push(`pH dưới ${thresh.min_ph}`)
            if (thresh.max_ph !== null && ph > thresh.max_ph) violations.push(`pH vượt ${thresh.max_ph}`)
          }

          const temp = toNumber(latestLog.temperature)
          if (temp !== null) {
            if (thresh.min_temp !== null && temp < thresh.min_temp) violations.push(`Nhiệt độ dưới ${thresh.min_temp}°C`)
            if (thresh.max_temp !== null && temp > thresh.max_temp) violations.push(`Nhiệt độ vượt ${thresh.max_temp}°C`)
          }

          const oxy = toNumber(latestLog.oxygen)
          if (oxy !== null) {
            if (thresh.min_oxygen !== null && oxy < thresh.min_oxygen) violations.push(`DO dưới ${thresh.min_oxygen} mg/L`)
            if (thresh.max_oxygen !== null && oxy > thresh.max_oxygen) violations.push(`DO vượt ${thresh.max_oxygen} mg/L`)
          }

          const salinity = toNumber(latestLog.salinity)
          if (salinity !== null) {
            if (thresh.min_salinity !== null && salinity < thresh.min_salinity) violations.push(`Độ mặn dưới ${thresh.min_salinity} ppt`)
            if (thresh.max_salinity !== null && salinity > thresh.max_salinity) violations.push(`Độ mặn vượt ${thresh.max_salinity} ppt`)
          }

          const turbidity = toNumber(latestLog.turbidity)
          if (turbidity !== null) {
            if (thresh.min_turbidity !== null && turbidity < thresh.min_turbidity) violations.push(`Độ đục dưới ${thresh.min_turbidity} NTU`)
            if (thresh.max_turbidity !== null && turbidity > thresh.max_turbidity) violations.push(`Độ đục vượt ${thresh.max_turbidity} NTU`)
          }

          if (violations.length > 0) {
            alerts.push({
              pond_id: pond.pond_id,
              pond_code: pond.pond_code,
              pond_name: pond.pond_name,
              violations,
              logged_at: latestLog.logged_at || latestLog.created_at || latestLog.recorded_at,
            })
          }
        }

        sorted.slice(0, 3).forEach((log) => {
          flattenedLogs.push({
            ...log,
            pond_id: pond.pond_id,
            pond_code: pond.pond_code,
            pond_name: pond.pond_name,
          })
        })
      })

      const sortedRecent = flattenedLogs
        .sort(
          (a, b) =>
            new Date(b.logged_at || b.created_at || b.recorded_at || 0).getTime() -
            new Date(a.logged_at || a.created_at || a.recorded_at || 0).getTime()
        )
        .slice(0, 6)

      setLatestLogByPond(latestByPond)
      setRecentEnvironmentLogs(sortedRecent)
      setEnvironmentAlerts(alerts)
    } catch (err) {
      showToast({ title: err?.response?.data?.message || 'Lỗi tải dữ liệu', type: 'error' })
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const activeSensors = sensors.filter((item) => normalizeSensorStatus(item.status) === 'ACTIVE')

  const latestManualInput = recentEnvironmentLogs[0] || null

  const monitoringStats = {
    totalPonds: monitoredPonds.length,
    activeSensors: activeSensors.length,
    environmentAlertCount: environmentAlerts.length,
    recentManualLogs: recentEnvironmentLogs.length,
  }

  const hasPondAlert = (pond) => {
    const code = String(pond.pond_code || '').toLowerCase()
    const name = String(pond.pond_name || '').toLowerCase()
    return notifications.some((item) => {
      const message = String(item?.message || '').toLowerCase()
      return (code && message.includes(code)) || (name && message.includes(name))
    })
  }

  if (loading) {
    return (
      <div className="dashboard technician-dashboard technician-page-shell">
        <div className="flex-center page-loading">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard technician-dashboard technician-page-shell">
      <div className="technician-dashboard_header">
        <div>
          <h1>Dashboard</h1>
          <p>Tổng quan hoạt động ao nuôi và cảm biến theo thời gian thực</p>
        </div>
      </div>

      {/* Errors displayed via global toasts */}

      <section className="technician-dashboard_stat-grid">
        <article className="technician-dashboard_stat-card">
          <p className="technician-dashboard_stat-label">Tổng ao đang phụ trách</p>
          <p className="technician-dashboard_stat-value">{monitoringStats.totalPonds}</p>
          <span className="technician-dashboard_stat-note">Ao nuôi</span>
        </article>
        <article className="technician-dashboard_stat-card">
          <p className="technician-dashboard_stat-label">Tổng cảm biến hoạt động</p>
          <p className="technician-dashboard_stat-value">{monitoringStats.activeSensors}</p>
          <span className="technician-dashboard_stat-note">Trạng thái ổn định</span>
        </article>
        <article className="technician-dashboard_stat-card technician-dashboard_stat-card--warning">
          <p className="technician-dashboard_stat-label">Cảnh báo môi trường</p>
          <p className="technician-dashboard_stat-value">{monitoringStats.environmentAlertCount}</p>
          <span className="technician-dashboard_stat-note">Ao vượt ngưỡng</span>
        </article>
        <article className="technician-dashboard_stat-card">
          <p className="technician-dashboard_stat-label">Tổng số dữ liệu nhập tay gần đây</p>
          <p className="technician-dashboard_stat-value">{monitoringStats.recentManualLogs}</p>
          <span className="technician-dashboard_stat-note">{latestManualInput ? `Lần nhập gần nhất: ${formatDateTime(latestManualInput.logged_at || latestManualInput.created_at || latestManualInput.recorded_at)}` : 'Chưa có dữ liệu nhập tay'}</span>
        </article>
      </section>

      <section className="technician-dashboard_content-grid">
        <div className="technician-dashboard_main-column">
          <article className="technician-dashboard_panel">
            <div className="technician-dashboard_panel-head">
              <h2>Tổng quan ao giám sát</h2>
              <span>{monitoredPonds.length} ao</span>
            </div>

            {monitoredPonds.length > 0 ? (
              <div className="technician-dashboard_pond-grid">
                {monitoredPonds.slice(0, 6).map((pond) => {
                  const latestLog = latestLogByPond[pond.pond_id] || {}
                  const isAlert = hasPondAlert(pond)
                  const pondSensors = sensors.filter((item) => String(item.pond_id) === String(pond.pond_id))

                  return (
                    <article key={pond.pond_id} className="technician-dashboard_pond-card">
                      <div className="technician-dashboard_pond-head">
                        <h3>{pond.pond_code || `Ao ${pond.pond_id}`}</h3>
                        <span className={isAlert ? 'badge badge-warning' : 'badge badge-ok'}>
                          {isAlert ? 'Cảnh báo' : 'Bình thường'}
                        </span>
                      </div>
                      <p className="technician-dashboard_pond-name">{pond.pond_name || 'Ao nuôi'}</p>
                      <p className="technician-dashboard_pond-sensors">Số cảm biến: {pondSensors.length}</p>

                      <div className="technician-dashboard_pond-metrics">
                        <span>DO {Number.isFinite(Number(latestLog.oxygen)) ? Number(latestLog.oxygen).toFixed(1) : '--'} mg/L</span>
                        <span>pH {Number.isFinite(Number(latestLog.ph)) ? Number(latestLog.ph).toFixed(1) : '--'}</span>
                        <span>Nhiệt {Number.isFinite(Number(latestLog.temperature)) ? Number(latestLog.temperature).toFixed(1) : '--'}°C</span>
                        <span>Độ mặn {Number.isFinite(Number(latestLog.salinity)) ? Number(latestLog.salinity).toFixed(1) : '--'} ppt</span>
                        <span>Độ đục {Number.isFinite(Number(latestLog.turbidity)) ? Number(latestLog.turbidity).toFixed(1) : '--'} NTU</span>
                      </div>
                    </article>
                  )
                })}
              </div>
            ) : (
              <p className="technician-dashboard_empty">Bạn chưa được phân công ao nào.</p>
            )}
          </article>
        </div>

        <div className="technician-dashboard_side-column">
          <article className="technician-dashboard_panel">
            <div className="technician-dashboard_panel-head">
              <h2>Dữ liệu nhập tay gần đây</h2>
              <a href="/technician/environment">Mở trang môi trường</a>
            </div>

            {recentEnvironmentLogs.length > 0 ? (
              <div className="technician-dashboard_table-wrap">
                <table className="table-base technician-dashboard_table">
                  <thead>
                    <tr>
                      <th>Thời gian nhập</th>
                      <th>Ao</th>
                      <th>pH</th>
                      <th>Nhiệt độ</th>
                      <th>DO</th>
                      <th>Độ mặn</th>
                      <th>Độ đục</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentEnvironmentLogs.map((log, index) => (
                      <tr key={`${log.environment_log_id || log.log_id || 'log'}-${index}`}>
                        <td>{formatDateTime(log.logged_at || log.created_at || log.recorded_at)}</td>
                        <td>{log.pond_code || log.pond_name || '--'}</td>
                        <td>{Number.isFinite(Number(log.ph)) ? Number(log.ph).toFixed(1) : '--'}</td>
                        <td>{Number.isFinite(Number(log.temperature)) ? Number(log.temperature).toFixed(1) : '--'}°C</td>
                        <td>{Number.isFinite(Number(log.oxygen)) ? Number(log.oxygen).toFixed(1) : '--'} mg/L</td>
                        <td>{Number.isFinite(Number(log.salinity)) ? Number(log.salinity).toFixed(1) : '--'} ppt</td>
                        <td>{Number.isFinite(Number(log.turbidity)) ? Number(log.turbidity).toFixed(1) : '--'} NTU</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="technician-dashboard_empty">Chưa có dữ liệu nhập tay gần đây.</p>
            )}
          </article>

          <article className="technician-dashboard_panel">
            <div className="technician-dashboard_panel-head">
              <h2>Cảnh báo môi trường</h2>
              <span>{environmentAlerts.length} ao</span>
            </div>

            {environmentAlerts.length > 0 ? (
              <ul className="technician-dashboard_alert-list">
                {environmentAlerts.slice(0, 6).map((alert) => (
                  <li key={`env-alert-${alert.pond_id}`} className="alert-item alert-item--canh-bao">
                    <div>
                      <p>
                        <strong>{alert.pond_code} - {alert.pond_name}</strong>
                      </p>
                      <ul style={{ margin: '4px 0 0 16px', fontSize: '0.85rem', color: '#b91c1c' }}>
                        {alert.violations.map((v, idx) => (
                          <li key={idx}>{v}</li>
                        ))}
                      </ul>
                      <span style={{ fontSize: '0.75rem', color: '#888' }}>
                        {formatDateTime(alert.logged_at)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="technician-dashboard_empty">Mọi ao đều trong ngưỡng an toàn.</p>
            )}
          </article>
        </div>
      </section>
    </div>
  )
}

export default TechnicianDashboard

