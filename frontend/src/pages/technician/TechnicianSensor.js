import React, { useEffect, useMemo, useState } from 'react'
import { sensorService } from '../../services/api'
import '../../styles/technician/technician-sensor.css'
import '../../styles/technician/technician-layout.css'
import { SENSOR_ORDER, getSensorProfile, getSensorStatus, getSensorStatusLabel, getSensorTypeKey } from '../../utils/sensorMetrics'
import { useAuth } from '../../context/AuthContext'
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

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

const SENSOR_COLORS = ['#2563eb', '#f97316', '#10b981', '#8b5cf6', '#ef4444', '#14b8a6', '#f59e0b', '#0f766e']

const formatVietnameseDateTime = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
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

const formatShortTime = (value) => {
  if (!value) return '--:--'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '--:--'
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(date)
}

const formatNumber = (value) => {
  if (value === null || value === undefined || value === '') return '-'
  const number = Number(value)
  if (Number.isNaN(number)) return value
  return (Math.round(number * 100) / 100).toFixed(2)
}

const getLastUpdatedLabel = (value) => {
  if (!value) return 'Chưa có dữ liệu'
  const diffMs = Date.now() - new Date(value).getTime()
  if (diffMs < 0) return 'Vừa xong'
  const sec = Math.floor(diffMs / 1000)
  if (sec < 60) return `${sec} giây trước`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min} phút trước`
  const hour = Math.floor(min / 60)
  if (hour < 24) return `${hour} giờ trước`
  const day = Math.floor(hour / 24)
  return `${day} ngày trước`
}

const TechnicianSensor = () => {
  const { realtimeSensorData, ponds: contextPonds } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedPondId, setSelectedPondId] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [sensors, setSensors] = useState([])
  const [sensorReadings, setSensorReadings] = useState({})

  const getReadingsMap = (sensorList, pondId, sourceRealtimeData) => {
    const pondData = sourceRealtimeData?.[pondId] || {}
    const readingsMap = {}

    sensorList.forEach((sensor) => {
      const direct = pondData[sensor.sensor_type]?.readings
      const byTypeKey = pondData[getSensorTypeKey(sensor.sensor_type)]?.readings
      readingsMap[sensor.sensor_id] = direct || byTypeKey || []
    })

    return readingsMap
  }

  useEffect(() => {
    if (contextPonds.length > 0 && !selectedPondId) {
      setSelectedPondId(String(contextPonds[0].pond_id))
    }
    setLoading(false)
  }, [contextPonds, selectedPondId])

  useEffect(() => {
    if (!selectedPondId) {
      setSensors([])
      setSensorReadings({})
      return
    }

    const fetchSensors = async () => {
      try {
        const sensorsRes = await sensorService.getSensorsByPondId(selectedPondId)
        const sensorList = sensorsRes?.data?.data || []
        setSensors(sensorList)
        setSensorReadings(getReadingsMap(sensorList, selectedPondId, realtimeSensorData))
        setError('')
      } catch (err) {
        setError(err?.response?.data?.message || 'Không tải được dữ liệu cảm biến')
        setSensors([])
        setSensorReadings({})
      }
    }

    fetchSensors()
  }, [selectedPondId])

  useEffect(() => {
    if (!selectedPondId || sensors.length === 0) return
    setSensorReadings(getReadingsMap(sensors, selectedPondId, realtimeSensorData))
  }, [realtimeSensorData, selectedPondId, sensors])

  const selectedPond = contextPonds.find((pond) => String(pond.pond_id) === String(selectedPondId))

  const latestRealtimeSensors = useMemo(
    () => sensors.map((sensor, index) => {
      const readings = sensorReadings[sensor.sensor_id] || []
      const latest = readings.length > 0 ? readings[readings.length - 1] : null
      const profile = getSensorProfile(sensor.sensor_type)
      const status = getSensorStatus(latest?.value, sensor.sensor_type)
      return {
        sensor,
        profile,
        readings,
        latest,
        status,
        color: SENSOR_COLORS[index % SENSOR_COLORS.length],
      }
    }),
    [sensors, sensorReadings]
  )

  const sensorStats = useMemo(() => {
    const stats = {}
    latestRealtimeSensors.forEach((item) => {
      const typeKey = getSensorTypeKey(item.sensor.sensor_type) || item.sensor.sensor_type?.toString().toLowerCase()
      if (!stats[typeKey] && item.latest && item.latest.value !== undefined && item.latest.value !== null) {
        stats[typeKey] = {
          value: item.latest.value,
          updatedAt: item.latest.recorded_at,
          status: item.status,
          profile: item.profile,
        }
      }
    })
    return stats
  }, [latestRealtimeSensors])

  const warningCount = useMemo(
    () => latestRealtimeSensors.filter((item) => item.latest && item.status !== 'normal').length,
    [latestRealtimeSensors]
  )

  const newestReadingTime = useMemo(() => {
    const times = latestRealtimeSensors
      .map((item) => item.latest?.recorded_at)
      .filter(Boolean)
      .map((time) => new Date(time).getTime())
      .filter((time) => !Number.isNaN(time))

    if (times.length === 0) return null
    return new Date(Math.max(...times)).toISOString()
  }, [latestRealtimeSensors])

  const realtimeChartData = useMemo(() => {
    const datasets = []
    const isoSet = new Set()

    latestRealtimeSensors.forEach((entry) => {
      ;(entry.readings || []).forEach((reading) => {
        if (reading?.recorded_at) {
          isoSet.add(new Date(reading.recorded_at).toISOString())
        }
      })
    })

    const isoLabels = Array.from(isoSet).sort()
    const labels = isoLabels.map((iso) => formatShortTime(iso))

    latestRealtimeSensors.forEach((entry) => {
      const map = new Map()
      ;(entry.readings || []).forEach((reading) => {
        if (reading?.recorded_at) {
          map.set(new Date(reading.recorded_at).toISOString(), Number(reading.value))
        }
      })

      datasets.push({
        label: entry.profile?.label || entry.sensor.sensor_name,
        data: isoLabels.map((iso) => (map.has(iso) ? map.get(iso) : null)),
        borderColor: entry.color,
        backgroundColor: `${entry.color}26`,
        tension: 0.35,
        fill: true,
        pointRadius: 2,
      })
    })

    return { labels, datasets }
  }, [latestRealtimeSensors])

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          usePointStyle: true,
          boxWidth: 8,
        },
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(148, 163, 184, 0.22)' },
      },
      y: {
        beginAtZero: false,
        ticks: { callback: (value) => String(Math.round(value * 100) / 100) },
        grid: { color: 'rgba(148, 163, 184, 0.22)' },
      },
    },
  }

  const filteredRows = useMemo(() => {
    return latestRealtimeSensors
      .filter((item) => {
        const text = searchTerm.trim().toLowerCase()
        const typeKey = getSensorTypeKey(item.sensor.sensor_type)
        const matchText =
          !text ||
          String(item.sensor.sensor_name || '').toLowerCase().includes(text) ||
          String(item.sensor.serial_number || '').toLowerCase().includes(text)
        const matchType = typeFilter === 'ALL' || typeFilter === typeKey
        return matchText && matchType
      })
      .sort((a, b) => {
        const aTime = a.latest?.recorded_at ? new Date(a.latest.recorded_at).getTime() : 0
        const bTime = b.latest?.recorded_at ? new Date(b.latest.recorded_at).getTime() : 0
        return bTime - aTime
      })
  }, [latestRealtimeSensors, searchTerm, typeFilter])

  const handleExportCsv = () => {
    if (filteredRows.length === 0) return
    const headers = ['Thoi gian', 'Cam bien', 'Ao nuoi', 'Gia tri', 'Don vi', 'Trang thai']
    const rows = filteredRows.map((item) => [
      formatVietnameseDateTime(item.latest?.recorded_at),
      item.sensor.sensor_name || item.sensor.serial_number || `Sensor ${item.sensor.sensor_id}`,
      `${selectedPond?.pond_code || ''} ${selectedPond?.pond_name || ''}`.trim(),
      formatNumber(item.latest?.value),
      item.profile?.unit || '-',
      getSensorStatusLabel(item.status).replace('✓ ', '').replace('⚠️ ', ''),
    ])
    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell || '').replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `sensor-realtime-${selectedPondId || 'all'}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="staff-sensor-page technician-page-shell">
      <div className="staff-sensor-header">
        <h1>Dữ liệu cảm biến real-time</h1>
        <p>Theo dõi dữ liệu cảm biến ao tôm theo thời gian thực</p>
      </div>

      {error && <div className="staff-sensor-alert error">{error}</div>}

      {loading ? (
        <div className="staff-sensor-card">
          <p>Đang tải dữ liệu cảm biến...</p>
        </div>
      ) : (
        <>
          <div className="realtime-kpi-grid">
            <div className="realtime-kpi-card">
              <div className="realtime-kpi-icon">◉</div>
              <div>
                <p>Tổng cảm biến hoạt động</p>
                <h3>{latestRealtimeSensors.filter((item) => !!item.latest).length}</h3>
              </div>
            </div>
            <div className="realtime-kpi-card">
              <div className="realtime-kpi-icon">◎</div>
              <div>
                <p>Ao nuôi giám sát</p>
                <h3>{contextPonds.length}</h3>
              </div>
            </div>
            <div className="realtime-kpi-card">
              <div className="realtime-kpi-icon">⚠</div>
              <div>
                <p>Cảnh báo hiện tại</p>
                <h3>{warningCount}</h3>
              </div>
            </div>
            <div className="realtime-kpi-card">
              <div className="realtime-kpi-icon">◷</div>
              <div>
                <p>Cập nhật gần nhất</p>
                <h3>{getLastUpdatedLabel(newestReadingTime)}</h3>
              </div>
            </div>
          </div>

          <div className="staff-sensor-controls">
            <label>Chọn ao</label>
            <select value={selectedPondId} onChange={(e) => setSelectedPondId(e.target.value)}>
              <option value="">-- Chọn ao nuôi --</option>
              {contextPonds.map((pond) => (
                <option key={pond.pond_id} value={pond.pond_id}>
                  {pond.pond_code} - {pond.pond_name}
                </option>
              ))}
            </select>
            {selectedPond && (
              <div className="staff-sensor-timestamp">
                Đang xem: {selectedPond.pond_code} - {selectedPond.pond_name}
              </div>
            )}
          </div>

          {sensors.length === 0 ? (
            <div className="staff-sensor-card">
              <p className="staff-sensor-empty">Ao nuôi này chưa có cảm biến được thiết lập.</p>
            </div>
          ) : (
            <>
              <div className="sensor-strip-grid">
                {SENSOR_ORDER.map((key) => {
                  const profile = getSensorProfile(key)
                  const stat = sensorStats[key]
                  const status = stat?.status || 'normal'

                  return (
                    <div key={key} className={`sensor-strip-card status-${status}`}>
                      <div className="sensor-strip-head">
                        <span className="sensor-strip-icon">{profile.icon}</span>
                        <span className="sensor-strip-type">{(profile.shortLabel || profile.label || key).toUpperCase()}</span>
                      </div>
                      <div className="sensor-strip-value">
                        {stat ? formatNumber(stat.value) : '-'}
                        {profile.unit && <span>{profile.unit}</span>}
                      </div>
                      <div className="sensor-strip-meta">
                        <span>{stat ? getLastUpdatedLabel(stat.updatedAt) : 'Chưa có dữ liệu'}</span>
                        <span className={`sensor-strip-status status-${status}`}>{getSensorStatusLabel(status).replace('✓ ', '').replace('⚠️ ', '')}</span>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="staff-sensor-card chart-card">
                <div className="chart-card-header">
                  <h3>Dữ liệu cảm biến gần đây</h3>
                </div>

                {realtimeChartData.datasets.length > 0 ? (
                  <div className="chart-canvas-wrap">
                    <Line data={realtimeChartData} options={chartOptions} />
                  </div>
                ) : (
                  <div className="staff-sensor-chart-empty">Chưa có dữ liệu realtime để hiển thị</div>
                )}
              </div>

              <div className="staff-sensor-card">
                <div className="sensor-table-toolbar">
                  <div className="sensor-table-search">
                    <span>⌕</span>
                    <input
                      type="text"
                      placeholder="Tìm theo tên cảm biến..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                    <option value="ALL">Tất cả loại cảm biến</option>
                    {SENSOR_ORDER.map((type) => {
                      const profile = getSensorProfile(type)
                      return (
                        <option key={type} value={type}>
                          {profile?.label || type}
                        </option>
                      )
                    })}
                  </select>
                  <button type="button" className="btn btn-secondary" onClick={handleExportCsv}>
                    ⤓ Tải CSV
                  </button>
                </div>

                <div className="staff-sensor-table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Thời gian</th>
                        <th>Tên cảm biến</th>
                        <th>Ao nuôi</th>
                        <th>Giá trị</th>
                        <th>Đơn vị</th>
                        <th>Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRows.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="staff-sensor-empty">Không có dữ liệu phù hợp với bộ lọc</td>
                        </tr>
                      ) : (
                        filteredRows.map((item) => (
                          <tr key={item.sensor.sensor_id}>
                            <td>{formatVietnameseDateTime(item.latest?.recorded_at)}</td>
                            <td>{item.sensor.sensor_name || item.sensor.serial_number || `Cảm biến ${item.sensor.sensor_id}`}</td>
                            <td>{selectedPond ? `${selectedPond.pond_code} - ${selectedPond.pond_name}` : '-'}</td>
                            <td>{formatNumber(item.latest?.value)}</td>
                            <td>{item.profile?.unit || '-'}</td>
                            <td>
                              <span className={`badge status-${item.status}`}>
                                {getSensorStatusLabel(item.status).replace('✓ ', '').replace('⚠️ ', '')}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

export default TechnicianSensor
