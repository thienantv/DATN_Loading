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
import { environmentLogService, pondService, sensorService } from '../../services/api'
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
  const [ponds, setPonds] = useState([])
  const [selectedPondId, setSelectedPondId] = useState('')
  const [manualLogs, setManualLogs] = useState([])
  const [sensors, setSensors] = useState([])
  const [sensorReadings, setSensorReadings] = useState({})
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState(null)

  useEffect(() => {
    fetchPonds()
  }, [])

  useEffect(() => {
    if (!selectedPondId) return undefined

    let active = true

    const syncRealtimeData = async (silent = false) => {
      try {
        await sensorService.generateFakeRealtimeData({
          pond_id: Number(selectedPondId),
        })
        if (active) {
          await fetchEnvironmentData(selectedPondId, silent)
        }
      } catch (err) {
        if (active) {
          setError(err?.response?.data?.message || 'Không tạo được dữ liệu realtime')
        }
      }
    }

    syncRealtimeData(false)
    const timer = setInterval(() => {
      syncRealtimeData(true)
    }, 30000)

    return () => {
      active = false
      clearInterval(timer)
    }
  }, [selectedPondId])

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
      setError(err?.response?.data?.message || 'Không tải được danh sách ao nuôi')
    } finally {
      setLoading(false)
    }
  }

  const fetchEnvironmentData = async (pondId, silent = false) => {
    try {
      if (!silent) setRefreshing(true)

      const [manualRes, sensorRes] = await Promise.all([
        environmentLogService.getByPondId(pondId),
        sensorService.getSensorsByPondId(pondId),
      ])

      const sensorList = sensorRes?.data?.data || []

      const readingsMap = {}

      await Promise.all(sensorList.map(async (sensor) => {
        try {
          const readingRes = await sensorService.getSensorReadings(sensor.sensor_id)
          const readings = [...(readingRes?.data?.data || [])].reverse()
          readingsMap[sensor.sensor_id] = readings
        } catch (readingError) {
          readingsMap[sensor.sensor_id] = []
        }
      }))

      setManualLogs(manualRes?.data?.data || [])
      setSensors(sensorList)
      setSensorReadings(readingsMap)
      setLastUpdated(new Date())
      setError('')
    } catch (err) {
      setError(err?.response?.data?.message || 'Không tải được dữ liệu môi trường')
      setManualLogs([])
      setSensors([])
      setSensorReadings({})
    } finally {
      if (!silent) setRefreshing(false)
    }
  }

  const selectedPond = ponds.find((pond) => String(pond.pond_id) === String(selectedPondId))

  const latestManual = manualLogs[0] || null

  const latestRealtimeSensors = useMemo(
    () => sensors.map((sensor, index) => {
      const readings = sensorReadings[sensor.sensor_id] || []
      const latest = readings.length > 0 ? readings[readings.length - 1] : null
      return {
        sensor,
        readings,
        latest,
        color: SENSOR_COLORS[index % SENSOR_COLORS.length],
      }
    }),
    [sensorReadings, sensors]
  )

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
            {ponds.map((pond) => (
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 20 }}>
        {latestRealtimeSensors.length === 0 ? (
          <div className="card" style={{ gridColumn: '1 / -1' }}>
            <h3>Chưa có sensor</h3>
            <p style={{ margin: '8px 0 0', color: '#666' }}>Manager hãy thêm sensor vào bảng trước, dữ liệu realtime sẽ tự chạy theo chu kỳ.</p>
          </div>
        ) : (
          latestRealtimeSensors.map((entry) => (
            <div className="card" key={entry.sensor.sensor_id}>
              <h3>{entry.sensor.sensor_name}</h3>
              <p style={{ margin: '8px 0 0', color: '#666' }}>{entry.sensor.serial_number || entry.sensor.sensor_type}</p>
              <p style={{ fontSize: 28, margin: '8px 0 0', fontWeight: 700 }}>
                {entry.latest ? formatRounded(entry.latest.value) : '-'}
              </p>
              <p style={{ margin: '4px 0 0', color: '#666' }}>
                {entry.latest ? formatVietnameseDateTime(entry.latest.recorded_at) : 'Chưa có dữ liệu'}
              </p>
              <p style={{ margin: '4px 0 0', color: '#666' }}>{entry.sensor.status || '-'}</p>
            </div>
          ))
        )}
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3>Biểu đồ nhập tay</h3>
        {refreshing ? (
          <div style={{ padding: '24px 0' }}>Đang tải dữ liệu...</div>
        ) : manualLogs.length > 0 ? (
          <Line data={manualChartData} options={chartOptions} />
        ) : (
          <div style={{ padding: '24px 0', color: '#666' }}>Chưa có dữ liệu nhập tay</div>
        )}
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3>Biểu đồ realtime từ sensor_readings</h3>
        {refreshing ? (
          <div style={{ padding: '24px 0' }}>Đang tải dữ liệu...</div>
        ) : realtimeChartData.datasets.some((dataset) => dataset.data.length > 0) ? (
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
