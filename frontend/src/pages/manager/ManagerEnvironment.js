import React, { useEffect, useMemo, useState } from 'react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { environmentLogService, sensorService } from '../../services/api'
import { getSensorProfile, getSensorStatus, getSensorStatusConfig, getSensorStatusLabel } from '../../utils/sensorMetrics'
import { useAuth } from '../../context/AuthContext'
import '../../styles/dashboard.css'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

const SENSOR_COLORS = ['#2563eb', '#f97316', '#10b981', '#8b5cf6', '#ef4444', '#14b8a6', '#f59e0b', '#0f766e']

const formatVietnameseDateTime = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(date)
}

const formatRounded = (value) => {
  if (value === null || value === undefined || value === '') return '-'
  const numberValue = Number(value)
  if (Number.isNaN(numberValue)) return String(value)
  return String(Math.round(numberValue * 100) / 100)
}

const ManagerEnvironment = () => {
  const { realtimeSensorData, ponds: contextPonds } = useAuth()
  const [selectedPondId, setSelectedPondId] = useState('')
  const [manualLogs, setManualLogs] = useState([])
  const [sensors, setSensors] = useState([])
  const [sensorReadings, setSensorReadings] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Set initial pond from context
  useEffect(() => {
    if (contextPonds.length > 0 && !selectedPondId) {
      setSelectedPondId(String(contextPonds[0].pond_id))
    }
    if (contextPonds.length > 0) {
      setLoading(false)
    }
  }, [contextPonds, selectedPondId])

  // Fetch manual logs and sensor data for selected pond
  useEffect(() => {
    if (!selectedPondId) return

    const fetchData = async () => {
      try {
        // Fetch manual logs
        const manualRes = await environmentLogService.getByPondId(selectedPondId)
        setManualLogs(manualRes?.data?.data || [])

        // Get sensors for this pond from API (to get sensor metadata)
        const sensorsRes = await sensorService.getSensorsByPondId(selectedPondId)
        const sensorList = sensorsRes?.data?.data || []
        setSensors(sensorList)

        // Get readings from context
        const pondData = realtimeSensorData[selectedPondId] || {}
        const readingsMap = {}
        sensorList.forEach((sensor) => {
          const typeData = pondData[sensor.sensor_type]
          if (typeData && typeData.readings) {
            readingsMap[sensor.sensor_id] = typeData.readings
          }
        })
        setSensorReadings(readingsMap)
        setError('')
      } catch (err) {
        setError(err?.response?.data?.message || 'Không tải được dữ liệu môi trường')
        setSensors([])
        setSensorReadings({})
      }
    }

    fetchData()
  }, [selectedPondId, realtimeSensorData])

  const latestManual = manualLogs[0] || null

  const latestRealtimeSensors = useMemo(
    () => sensors.map((sensor, index) => {
      const readings = sensorReadings[sensor.sensor_id] || []
      const latest = readings.length > 0 ? readings[readings.length - 1] : null
      const profile = getSensorProfile(sensor.sensor_type)
      const status = latest ? getSensorStatus(latest.value, sensor.sensor_type) : 'normal'
      const statusConfig = getSensorStatusConfig(status)
      return {
        sensor,
        readings,
        latest,
        color: SENSOR_COLORS[index % SENSOR_COLORS.length],
        profile,
        status,
        statusConfig,
      }
    }),
    [sensorReadings, sensors]
  )

  // Calculate last updated time from realtime data
  const lastUpdated = useMemo(() => {
    if (latestRealtimeSensors.length === 0) return null
    const latestTimestamps = latestRealtimeSensors
      .filter((e) => e.latest)
      .map((e) => new Date(e.latest.recorded_at).getTime())
    return latestTimestamps.length > 0 ? new Date(Math.max(...latestTimestamps)) : null
  }, [latestRealtimeSensors])

  const selectedPond = contextPonds.find((pond) => String(pond.pond_id) === String(selectedPondId))

  const manualChartData = useMemo(() => {
    const sortedLogs = [...manualLogs].reverse()
    return {
      labels: sortedLogs.map((log) => formatVietnameseDateTime(log.recorded_at)),
      datasets: [
        {
          label: 'pH',
          data: sortedLogs.map((log) => Number(log.ph) || 0),
          borderColor: '#2563eb',
          backgroundColor: 'rgba(37, 99, 235, 0.12)',
          tension: 0.35,
          fill: true,
        },
        {
          label: 'Nhiệt độ',
          data: sortedLogs.map((log) => Number(log.temperature) || 0),
          borderColor: '#f97316',
          backgroundColor: 'rgba(249, 115, 22, 0.12)',
          tension: 0.35,
          fill: true,
        },
        {
          label: 'Oxy hoà tan',
          data: sortedLogs.map((log) => Number(log.oxygen) || 0),
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.12)',
          tension: 0.35,
          fill: true,
        },
        {
          label: 'Độ mặn',
          data: sortedLogs.map((log) => Number(log.salinity) || 0),
          borderColor: '#8b5cf6',
          backgroundColor: 'rgba(139, 92, 246, 0.08)',
          tension: 0.35,
          fill: true,
        },
        {
          label: 'Mực nước',
          data: sortedLogs.map((log) => Number(log.water_level) || 0),
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239, 68, 68, 0.08)',
          tension: 0.35,
          fill: true,
        },
      ],
    }
  }, [manualLogs])

  const realtimeChartData = useMemo(() => {
    // Build a sorted union of all timestamps (ISO) across sensors, then align each sensor's data to that timeline
    const datasets = []
    const isoSet = new Set()
    const isoToLabel = new Map()

    latestRealtimeSensors.forEach((entry) => {
      const readings = entry.readings || []
      const ordered = [...readings].reverse() // ascending
      ordered.forEach((reading) => {
        const iso = new Date(reading.recorded_at).toISOString()
        if (!isoToLabel.has(iso)) isoToLabel.set(iso, formatVietnameseDateTime(reading.recorded_at))
        isoSet.add(iso)
      })
    })

    // sort ISO timestamps ascending
    const isoLabels = Array.from(isoSet).sort()
    const labels = isoLabels.map((iso) => isoToLabel.get(iso) || iso)

    latestRealtimeSensors.forEach((entry) => {
      const readings = entry.readings || []
      const map = new Map()
      readings.forEach((r) => {
        const iso = new Date(r.recorded_at).toISOString()
        map.set(iso, r.value)
      })

      const data = isoLabels.map((iso) => (map.has(iso) ? Number(map.get(iso)) : null))

      datasets.push({
        label: entry.sensor.sensor_name || entry.sensor.serial_number || `Sensor ${entry.sensor.sensor_id}`,
        data,
        borderColor: entry.color,
        backgroundColor: `${entry.color}22`,
        tension: 0.35,
        fill: true,
        pointRadius: 3,
      })
    })

    return { labels, datasets }
  }, [latestRealtimeSensors])

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
      },
    },
    scales: {
      y: {
        beginAtZero: false,
        ticks: {
          callback: (value) => formatRounded(value),
        },
      },
    },
  }

  return (
    <div className="dashboard-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        <div>
          <h2>Môi trường realtime</h2>
          <p style={{ margin: 0, color: '#666' }}>
            Manager xem dữ liệu nhập tay từ nhân viên và dữ liệu realtime sinh tự động theo cảm biến.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            className="input"
            value={selectedPondId}
            onChange={(e) => setSelectedPondId(e.target.value)}
            style={{ minWidth: 220 }}
          >
            <option value="">-- Chọn ao --</option>
            {contextPonds.map((pond) => (
              <option key={pond.pond_id} value={pond.pond_id}>
                {pond.pond_code} - {pond.pond_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {loading && <div className="alert alert-info">Đang tải danh sách ao nuôi...</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16, marginBottom: 20 }}>
        <div className="card">
          <h3>Ao đang xem</h3>
          <p style={{ margin: '8px 0 0', fontWeight: 700 }}>{selectedPond ? `${selectedPond.pond_code} - ${selectedPond.pond_name}` : 'Chưa chọn ao'}</p>
          <p style={{ margin: '4px 0 0', color: '#666' }}>{lastUpdated ? `Cập nhật: ${formatVietnameseDateTime(lastUpdated)}` : '-'}</p>
        </div>
        <div className="card">
          <h3>Ghi tay mới nhất</h3>
          <p style={{ margin: '8px 0 0', fontWeight: 700 }}>{latestManual ? formatVietnameseDateTime(latestManual.recorded_at) : '-'}</p>
          <p style={{ margin: '4px 0 0', color: '#666' }}>{latestManual ? `pH ${formatRounded(latestManual.ph)} | Nhiệt độ ${formatRounded(latestManual.temperature)} | Oxy ${formatRounded(latestManual.oxygen)} | Độ mặn ${formatRounded(latestManual.salinity)} | Mực nước ${formatRounded(latestManual.water_level)}` : 'Chưa có dữ liệu'}</p>
        </div>
        <div className="card">
          <h3>Cảm biến realtime</h3>
          <p style={{ margin: '8px 0 0', fontWeight: 700 }}>{sensors.length} cảm biến</p>
          <p style={{ margin: '4px 0 0', color: '#666' }}>Tự sinh và làm mới mỗi 30 giây</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 16, marginBottom: 20 }}>
        {sensors.length === 0 ? (
          <div className="card" style={{ gridColumn: '1 / -1' }}>
            <h3>Chưa có sensor</h3>
            <p style={{ margin: '8px 0 0', color: '#666' }}>Manager hãy thêm sensor vào bảng trước, dữ liệu realtime sẽ tự chạy theo chu kỳ.</p>
          </div>
        ) : (
          latestRealtimeSensors.map((entry) => {
            const status = entry.status
            const statusBgMap = {
              normal: '#f0fdf4',
              low: '#eff6ff',
              high: '#fef2f2',
            }
            const statusBorderMap = {
              normal: '#10b981',
              low: '#3b82f6',
              high: '#ef4444',
            }
            return (
              <div
                className="card"
                key={entry.sensor.sensor_id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  borderLeft: `4px solid ${statusBorderMap[status] || '#e0e0e0'}`,
                  backgroundColor: statusBgMap[status] || 'white',
                  padding: 16,
                }}
              >
                <div style={{ fontSize: 32, lineHeight: 1, flexShrink: 0 }}>
                  {entry.profile?.icon || '📊'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ fontSize: 13, fontWeight: 600, color: '#666', margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {entry.profile?.label || entry.sensor.sensor_type}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
                    <span style={{ fontSize: 24, fontWeight: 700, color: '#1a1a1a' }}>
                      {entry.latest ? formatRounded(entry.latest.value) : '-'}
                    </span>
                    {entry.profile?.unit && <span style={{ fontSize: 12, fontWeight: 500, color: '#666' }}>{entry.profile.unit}</span>}
                  </div>
                  <div style={{ fontSize: 11, color: '#999', marginBottom: 8 }}>
                    {entry.latest ? formatVietnameseDateTime(entry.latest.recorded_at) : 'Chưa có dữ liệu'}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 500,
                      padding: '4px 8px',
                      borderRadius: 4,
                      display: 'inline-block',
                      backgroundColor: entry.statusConfig.bgColor,
                      color: entry.statusConfig.color,
                    }}
                  >
                    {getSensorStatusLabel(status)}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3>Biểu đồ nhập tay</h3>
        {manualLogs.length > 0 ? (
          <Line data={manualChartData} options={chartOptions} />
        ) : (
          <div style={{ padding: '24px 0', color: '#666' }}>Chưa có dữ liệu nhập tay</div>
        )}
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3>Biểu đồ realtime từ sensor_readings</h3>
        {realtimeChartData.datasets.some((dataset) => dataset.data.length > 0) ? (
          <Line data={realtimeChartData} options={chartOptions} />
        ) : (
          <div style={{ padding: '24px 0', color: '#666' }}>Chưa có dữ liệu realtime</div>
        )}
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3>Nhật ký nhập tay gần đây</h3>
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Thời gian</th>
                <th>pH</th>
                <th>Nhiệt độ (°C)</th>
                <th>Oxy (mg/l)</th>
                <th>Độ mặn (ppt)</th>
                <th>Mực nước (cm)</th>
              </tr>
            </thead>
            <tbody>
              {manualLogs.length === 0 ? (
                <tr><td colSpan="6">Chưa có dữ liệu nhập tay</td></tr>
              ) : (
                [...manualLogs].slice(0, 10).map((log) => (
                  <tr key={log.recorded_at}>
                    <td>{formatVietnameseDateTime(log.recorded_at)}</td>
                    <td>{formatRounded(log.ph)}</td>
                    <td>{formatRounded(log.temperature)}</td>
                    <td>{formatRounded(log.oxygen)}</td>
                    <td>{formatRounded(log.salinity)}</td>
                    <td>{formatRounded(log.water_level)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h3>Danh sách cảm biến trong ao</h3>
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Cảm biến</th>
                <th>Loại</th>
                <th>Serial</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {sensors.length === 0 ? (
                <tr><td colSpan="4">Chưa có cảm biến</td></tr>
              ) : (
                sensors.map((sensor) => (
                  <tr key={sensor.sensor_id}>
                    <td>{sensor.sensor_name}</td>
                    <td>{sensor.sensor_type}</td>
                    <td>{sensor.serial_number || '-'}</td>
                    <td>{sensor.status || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default ManagerEnvironment
