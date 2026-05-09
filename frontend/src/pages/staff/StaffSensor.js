import React, { useEffect, useMemo, useState } from 'react'
import { pondService, sensorService } from '../../services/api'
import '../../styles/staff-sensor.css'
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

const SENSOR_TYPES = {
  ph: { label: 'pH', unit: '', icon: '🔬', range: [6, 8] },
  temperature: { label: 'Nhiệt độ', unit: '°C', icon: '🌡️', range: [25, 30] },
  oxygen: { label: 'Oxy hòa tan', unit: 'mg/l', icon: '💨', range: [5, 8] },
  salinity: { label: 'Độ mặn', unit: 'ppt', icon: '🧂', range: [15, 25] },
  water_level: { label: 'Mực nước', unit: 'cm', icon: '📏', range: [20, 200] },
}

const SENSOR_ORDER = ['ph', 'temperature', 'oxygen', 'salinity', 'water_level']

const mapSensorTypeKey = (sensorType) => {
  if (!sensorType) return null
  const s = sensorType.toString().toLowerCase()
  if (s.includes('ph')) return 'ph'
  if (s.includes('temp') || s.includes('nhiệt')) return 'temperature'
  if (s.includes('oxy') || s === 'do' || s.includes('dissolved') || s.includes('o2')) return 'oxygen'
  if (s.includes('salin') || s.includes('mặn')) return 'salinity'
  if (s.includes('mực') || s.includes('water') || s.includes('level')) return 'water_level'
  return null
}

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

const formatNumber = (value) => {
  if (value === null || value === undefined || value === '') return '-'
  const number = Number(value)
  if (Number.isNaN(number)) return value
  return (Math.round(number * 100) / 100).toFixed(2)
}

const getAlertStatus = (value, type) => {
  if (!value || !SENSOR_TYPES[type]) return 'normal'
  const numValue = Number(value)
  const [min, max] = SENSOR_TYPES[type].range
  if (numValue < min) return 'low'
  if (numValue > max) return 'high'
  return 'normal'
}

const StaffSensor = () => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [ponds, setPonds] = useState([])
  const [selectedPondId, setSelectedPondId] = useState('')
  const [sensors, setSensors] = useState([])
  const [sensorReadings, setSensorReadings] = useState({})
  const [lastUpdated, setLastUpdated] = useState(null)

  // Fetch ponds assigned to staff
  useEffect(() => {
    const fetchPonds = async () => {
      try {
        setLoading(true)
        const response = await pondService.getAllPonds()
        const pondList = response?.data?.data || []
        setPonds(pondList)
        if (pondList.length > 0) {
          setSelectedPondId(String(pondList[0].pond_id))
        }
        setError('')
      } catch (err) {
        setError(err?.response?.data?.message || 'Không tải được danh sách ao')
        setPonds([])
      } finally {
        setLoading(false)
      }
    }

    fetchPonds()
  }, [])

  // Fetch sensors and readings for selected pond
  useEffect(() => {
    const fetchSensorData = async () => {
      if (!selectedPondId) {
        setSensors([])
        setSensorReadings({})
        return
      }

      try {
        // Get sensors for this pond
        const sensorsRes = await sensorService.getSensorsByPondId(selectedPondId)
        const sensorList = sensorsRes?.data?.data || []
        setSensors(sensorList)

        // Get time-series readings for each sensor (recent 50 points)
        const readingsMap = {}
        await Promise.all(
          sensorList.map(async (sensor) => {
            try {
              const readingsRes = await sensorService.getSensorReadings(sensor.sensor_id, 50)
              const readings = [...(readingsRes?.data?.data || [])].reverse() // ascending
              readingsMap[sensor.sensor_id] = readings
            } catch (readingError) {
              readingsMap[sensor.sensor_id] = []
            }
          })
        )

        setSensorReadings(readingsMap)
        setLastUpdated(new Date())
        setError('')
      } catch (err) {
        setError(err?.response?.data?.message || 'Không tải được dữ liệu cảm biến')
        setSensors([])
        setSensorReadings({})
      }
    }

    fetchSensorData()

    // Refresh data every 30 seconds
    const interval = setInterval(fetchSensorData, 30000)
    return () => clearInterval(interval)
  }, [selectedPondId])

  const selectedPond = ponds.find((pond) => String(pond.pond_id) === String(selectedPondId))

  const sensorStats = useMemo(() => {
    const stats = {}
    sensors.forEach((sensor) => {
      const readings = sensorReadings[sensor.sensor_id] || []
      const latest = readings.length > 0 ? readings[readings.length - 1] : null
      if (latest && latest.value !== null && latest.value !== undefined) {
        const typeKey = mapSensorTypeKey(sensor.sensor_type) || sensor.sensor_type?.toString().toLowerCase()
        if (!stats[typeKey]) {
          stats[typeKey] = {
            type: typeKey,
            value: latest.value,
            updatedAt: latest.recorded_at,
            status: getAlertStatus(latest.value, typeKey),
          }
        }
      }
    })
    return stats
  }, [sensors, sensorReadings])

  const latestRealtimeSensors = useMemo(
    () => sensors.map((sensor, index) => {
      const readings = sensorReadings[sensor.sensor_id] || []
      const latest = readings.length > 0 ? readings[readings.length - 1] : null
      return { sensor, readings, latest, color: SENSOR_COLORS[index % SENSOR_COLORS.length] }
    }),
    [sensors, sensorReadings]
  )

  const realtimeChartData = useMemo(() => {
    const datasets = []
    const isoSet = new Set()
    const isoToLabel = new Map()

    latestRealtimeSensors.forEach((entry) => {
      const readings = entry.readings || []
      const ordered = [...readings]
      ordered.forEach((reading) => {
        const iso = new Date(reading.recorded_at).toISOString()
        if (!isoToLabel.has(iso)) isoToLabel.set(iso, formatVietnameseDateTime(reading.recorded_at))
        isoSet.add(iso)
      })
    })

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
        pointRadius: 2,
      })
    })

    return { labels, datasets }
  }, [latestRealtimeSensors])

  const chartOptions = {
    responsive: true,
    plugins: { legend: { display: true, position: 'bottom' } },
    scales: { y: { beginAtZero: false, ticks: { callback: (v) => String(Math.round(v * 100) / 100) } } },
  }

  return (
    <div className="staff-sensor-page">
      <div className="staff-sensor-header">
        <h1>Dữ liệu cảm biến realtime</h1>
        <p>Theo dõi dữ liệu môi trường realtime từ các cảm biến trong ao của bạn.</p>
      </div>

      {error && <div className="staff-sensor-alert error">{error}</div>}

      {loading ? (
        <div className="staff-sensor-card">
          <p>Đang tải dữ liệu...</p>
        </div>
      ) : (
        <>
          <div className="staff-sensor-controls">
            <label>Chọn ao:</label>
            <select value={selectedPondId} onChange={(e) => setSelectedPondId(e.target.value)}>
              <option value="">-- Chọn ao --</option>
              {ponds.map((pond) => (
                <option key={pond.pond_id} value={pond.pond_id}>
                  {pond.pond_code} - {pond.pond_name}
                </option>
              ))}
            </select>
            {lastUpdated && (
              <div className="staff-sensor-timestamp">
                Cập nhật: {formatVietnameseDateTime(lastUpdated)}
              </div>
            )}
          </div>

          {selectedPond && (
            <div className="staff-sensor-card">
              <h2>{selectedPond.pond_code} - {selectedPond.pond_name}</h2>
              <p className="staff-sensor-pond-info">
                Diện tích: {selectedPond.area_m2} m² | Độ sâu: {selectedPond.depth_m} m | Trạng thái: {selectedPond.status}
              </p>
            </div>
          )}

          {sensors.length === 0 ? (
            <div className="staff-sensor-card">
              <p style={{ color: '#999', textAlign: 'center', padding: '24px' }}>Ao này chưa có cảm biến.</p>
            </div>
          ) : (
            <>
              <div className="staff-sensor-grid">
                {SENSOR_ORDER.map((key) => {
                  const sensorInfo = SENSOR_TYPES[key]
                  const stat = sensorStats[key]
                  const status = stat?.status || 'normal'
                  return (
                    <div key={key} className={`staff-sensor-card sensor-card status-${status}`}>
                      <div className="sensor-icon">{sensorInfo.icon}</div>
                      <div className="sensor-info">
                        <h3>{sensorInfo.label}</h3>
                        <div className="sensor-value">
                          {stat ? formatNumber(stat.value) : '-'}
                          {sensorInfo.unit && <span className="sensor-unit">{sensorInfo.unit}</span>}
                        </div>
                        <div className="sensor-time">
                          {stat ? formatVietnameseDateTime(stat.updatedAt) : 'Chưa có dữ liệu'}
                        </div>
                        <div className={`sensor-status status-${status}`}>
                          {status === 'low' && '⚠️ Thấp hơn bình thường'}
                          {status === 'high' && '⚠️ Cao hơn bình thường'}
                          {status === 'normal' && '✓ Bình thường'}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="staff-sensor-card">
                <h3>Biểu đồ realtime cảm biến</h3>
                {realtimeChartData.datasets.length > 0 ? (
                  <Line data={realtimeChartData} options={chartOptions} />
                ) : (
                  <div style={{ padding: '12px 0', color: '#666' }}>Chưa có dữ liệu realtime</div>
                )}
              </div>

              <div className="staff-sensor-card">
                <h3>Chi tiết cảm biến</h3>
                <div className="staff-sensor-table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Cảm biến</th>
                        <th>Loại</th>
                        <th>Serial</th>
                        <th>Giá trị hiện tại</th>
                        <th>Thời gian cập nhật</th>
                        <th>Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sensors.map((sensor) => {
                        const readings = sensorReadings[sensor.sensor_id] || []
                        const latest = readings.length > 0 ? readings[readings.length - 1] : null
                        const value = latest?.value
                        const status = getAlertStatus(value, sensor.sensor_type?.toLowerCase())
                        return (
                          <tr key={sensor.sensor_id}>
                            <td>{sensor.sensor_name || `Cảm biến ${sensor.sensor_id}`}</td>
                            <td>{sensor.sensor_type}</td>
                            <td>{sensor.serial_number || '-'}</td>
                            <td>
                              {value !== null && value !== undefined ? formatNumber(value) : '-'}
                            </td>
                            <td>{latest ? formatVietnameseDateTime(latest.recorded_at) : '-'}</td>
                            <td>
                              <span className={`badge status-${status}`}>
                                {status === 'low' && 'Thấp'}
                                {status === 'high' && 'Cao'}
                                {status === 'normal' && 'Bình thường'}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
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

export default StaffSensor
