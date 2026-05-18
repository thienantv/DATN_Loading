import React, { useEffect, useMemo, useState } from 'react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { environmentLogService, seasonService } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import '../../styles/technician/technician-layout.css'
import '../../styles/technician/technician-environment.css'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler)

const emptyForm = {
  seasonId: '',
  ph: '',
  temperature: '',
  oxygen: '',
  salinity: '',
  waterLevel: '',
}

const RANGE_OPTIONS = [
  { value: 1, label: '1 ngày' },
  { value: 7, label: '7 ngày' },
  { value: 30, label: '30 ngày' },
]

const METRIC_CONFIG = [
  { key: 'ph', label: 'pH', unit: 'pH', color: '#2b7de9' },
  { key: 'temperature', label: 'Nhiệt độ', unit: '°C', color: '#2fb5ab' },
  { key: 'oxygen', label: 'DO', unit: 'mg/L', color: '#4f8edc' },
  { key: 'salinity', label: 'Độ mặn', unit: 'ppt', color: '#5b9bd5' },
  { key: 'water_level', label: 'Mực nước', unit: 'cm', color: '#1f87b7' },
]

const formatDateTime = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
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
  if (Number.isNaN(number)) return '-'
  return (Math.round(number * 100) / 100).toFixed(2)
}

const formatRelativeTime = (value) => {
  if (!value) return 'Chưa có dữ liệu'
  const diffMs = Date.now() - new Date(value).getTime()
  if (diffMs < 0) return 'Vừa xong'
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return 'Vừa xong'
  if (minutes < 60) return `${minutes} phút trước`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} giờ trước`
  const days = Math.floor(hours / 24)
  return `${days} ngày trước`
}

const toNumber = (value) => {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isNaN(parsed) ? null : parsed
}

const isOutOfRange = (log, thresholds) => {
  const ph = toNumber(log.ph)
  const temperature = toNumber(log.temperature)
  const oxygen = toNumber(log.oxygen)
  const salinity = toNumber(log.salinity)
  const waterLevel = toNumber(log.water_level)

  const minPh = toNumber(thresholds?.min_ph)
  const maxPh = toNumber(thresholds?.max_ph)
  const minTemp = toNumber(thresholds?.min_temp)
  const maxTemp = toNumber(thresholds?.max_temp)
  const minOxygen = toNumber(thresholds?.min_oxygen)
  const maxOxygen = toNumber(thresholds?.max_oxygen)
  const minSalinity = toNumber(thresholds?.min_salinity)
  const maxSalinity = toNumber(thresholds?.max_salinity)
  const minWaterLevel = toNumber(thresholds?.min_water_level)
  const maxWaterLevel = toNumber(thresholds?.max_water_level)

  const generic = {
    ph: { min: 6.5, max: 8.5 },
    temperature: { min: 25, max: 33 },
    oxygen: { min: 4, max: 9 },
    salinity: { min: 0, max: 35 },
    waterLevel: { min: 20, max: 120 },
  }

  const compare = (value, min, max, fallback) => {
    if (value === null) return false
    const lower = min ?? fallback.min
    const upper = max ?? fallback.max
    return value < lower || value > upper
  }

  return (
    compare(ph, minPh, maxPh, generic.ph) ||
    compare(temperature, minTemp, maxTemp, generic.temperature) ||
    compare(oxygen, minOxygen, maxOxygen, generic.oxygen) ||
    compare(salinity, minSalinity, maxSalinity, generic.salinity) ||
    compare(waterLevel, minWaterLevel, maxWaterLevel, generic.waterLevel)
  )
}

const createMiniChartOptions = () => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (context) => `${context.parsed.y}`,
      },
    },
  },
  elements: {
    point: { radius: 0, hoverRadius: 3 },
    line: { tension: 0.36, borderWidth: 2 },
  },
  scales: {
    x: { display: false },
    y: { display: false },
  },
  interaction: { mode: 'index', intersect: false },
})

const TechnicianEnvironment = () => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [seasons, setSeasons] = useState([])
  const [environmentLogs, setEnvironmentLogs] = useState([])
  const [thresholds, setThresholds] = useState(null)
  const [selectedSeasonId, setSelectedSeasonId] = useState('')
  const [showFormModal, setShowFormModal] = useState(false)
  const [rangeDays, setRangeDays] = useState(7)
  const [form, setForm] = useState(emptyForm)

  const loadSeasonData = async (seasonId) => {
    if (!seasonId) {
      setEnvironmentLogs([])
      setThresholds(null)
      return
    }

    try {
      setLoading(true)
      const [logsRes, thresholdsRes] = await Promise.all([
        environmentLogService.getBySeasonId(seasonId),
        environmentLogService.getThresholds(seasonId),
      ])
      setEnvironmentLogs(logsRes?.data?.data || [])
      setThresholds(thresholdsRes?.data?.data || null)
      setError('')
    } catch (loadError) {
      setEnvironmentLogs([])
      setThresholds(null)
      setError(loadError?.response?.data?.message || 'Không tải được dữ liệu môi trường')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const loadSeasons = async () => {
      try {
        setLoading(true)
        const seasonsRes = await seasonService.getAllSeasons()
        const seasonData = seasonsRes?.data?.data || []
        setSeasons(seasonData)

        if (seasonData.length > 0) {
          setSelectedSeasonId((prev) => prev || String(seasonData[0].season_id))
        }
        setError('')
      } catch (loadError) {
        setError(loadError?.response?.data?.message || 'Không tải được dữ liệu mùa vụ')
      } finally {
        setLoading(false)
      }
    }

    loadSeasons()
  }, [])

  useEffect(() => {
    if (selectedSeasonId) {
      loadSeasonData(selectedSeasonId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSeasonId])

  const selectedSeason = useMemo(
    () => seasons.find((season) => String(season.season_id) === String(selectedSeasonId)) || null,
    [seasons, selectedSeasonId]
  )

  const pondLabel = selectedSeason
    ? `${selectedSeason.pond_code || 'Ao'}${selectedSeason.pond_name ? ` - ${selectedSeason.pond_name}` : ''}`
    : 'Chưa chọn ao'

  const seasonOptions = useMemo(
    () =>
      seasons.map((season) => ({
        id: season.season_id,
        label: `${season.season_name || `Mùa vụ ${season.season_id}`} - ${season.pond_code || 'Ao'}`,
      })),
    [seasons]
  )

  const orderedLogs = useMemo(
    () => [...environmentLogs].sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at)),
    [environmentLogs]
  )

  const filteredLogs = useMemo(() => {
    const cutoff = Date.now() - rangeDays * 24 * 60 * 60 * 1000
    return orderedLogs.filter((log) => new Date(log.recorded_at).getTime() >= cutoff)
  }, [orderedLogs, rangeDays])

  const activeLogs = filteredLogs.length > 0 ? filteredLogs : orderedLogs

  const stats = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return {
      ponds: seasons.length,
      todayEntries: orderedLogs.filter((log) => new Date(log.recorded_at) >= today).length,
      anomalies: activeLogs.filter((log) => isOutOfRange(log, thresholds)).length,
      latest: orderedLogs[orderedLogs.length - 1]?.recorded_at || null,
    }
  }, [activeLogs, orderedLogs, seasons.length, thresholds])

  const currentUserName = user?.full_name || 'Bạn'

  const chartCards = useMemo(() => {
    return METRIC_CONFIG.map((metric) => {
      const series = activeLogs.map((log) => ({
        x: formatShortTime(log.recorded_at),
        y: toNumber(log[metric.key]),
      }))

      const validSeries = series.filter((item) => item.y !== null)
      const latestValue = validSeries.length > 0 ? validSeries[validSeries.length - 1].y : null

      return {
        ...metric,
        latestValue,
        chartData: {
          labels: series.map((item) => item.x),
          datasets: [
            {
              data: series.map((item) => item.y),
              borderColor: metric.color,
              backgroundColor: `${metric.color}22`,
              fill: true,
              pointBackgroundColor: metric.color,
              pointBorderColor: metric.color,
            },
          ],
        },
        chartOptions: createMiniChartOptions(metric.color),
      }
    })
  }, [activeLogs])

  const openFormModal = () => {
    setSuccess('')
    setError('')
    setForm((prev) => ({
      ...emptyForm,
      seasonId: prev.seasonId || selectedSeasonId || (seasonOptions[0]?.id ? String(seasonOptions[0].id) : ''),
    }))
    setShowFormModal(true)
  }

  const closeFormModal = () => {
    setShowFormModal(false)
  }

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    try {
      setSaving(true)
      setError('')
      setSuccess('')

      await environmentLogService.createLog({
        seasonId: Number(form.seasonId),
        ph: Number(form.ph),
        temperature: Number(form.temperature),
        oxygen: Number(form.oxygen),
        salinity: Number(form.salinity),
        waterLevel: Number(form.waterLevel),
      })

      const nextSeasonId = String(form.seasonId)
      setSuccess('Đã lưu dữ liệu môi trường thành công')
      setShowFormModal(false)
      setForm((prev) => ({ ...emptyForm, seasonId: prev.seasonId }))

      if (nextSeasonId !== selectedSeasonId) {
        setSelectedSeasonId(nextSeasonId)
      } else {
        await loadSeasonData(nextSeasonId)
      }
    } catch (submitError) {
      setError(submitError?.response?.data?.message || 'Không thể lưu dữ liệu môi trường')
    } finally {
      setSaving(false)
    }
  }

  const creatorName = (log) => {
    if (String(log.created_by) === String(user?.user_id)) return currentUserName
    if (!log.created_by) return '-'
    return `#${log.created_by}`
  }

  return (
    <div className="staff-environment-page technician-page-shell">
      <div className="staff-environment-hero">
        <div>
          <p className="staff-environment-eyebrow">Technician / Môi trường</p>
          <h1>Nhập chỉ số môi trường</h1>
          <p>Nhập dữ liệu đo thủ công cho mùa vụ bạn phụ trách. Dữ liệu sẽ được lưu vào nhật ký môi trường.</p>
        </div>

        <button type="button" className="btn btn-primary staff-environment-cta" onClick={openFormModal}>
          + Nhập dữ liệu
        </button>
      </div>

      <div className="staff-environment-toolbar-card">
        <div className="staff-environment-toolbar-left">
          <label htmlFor="seasonSelect">Mùa vụ đang xem</label>
          <select
            id="seasonSelect"
            value={selectedSeasonId}
            onChange={(e) => setSelectedSeasonId(e.target.value)}
          >
            <option value="">-- Chọn mùa vụ --</option>
            {seasonOptions.map((season) => (
              <option key={season.id} value={season.id}>
                {season.label}
              </option>
            ))}
          </select>
          <span className="staff-environment-toolbar-meta">{pondLabel}</span>
        </div>

        <div className="staff-environment-range-group">
          {RANGE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`staff-environment-range-btn ${rangeDays === option.value ? 'active' : ''}`}
              onClick={() => setRangeDays(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="staff-environment-alert error">{error}</div>}
      {success && <div className="staff-environment-alert success">{success}</div>}

      <section className="staff-environment-summary-grid">
        <article className="staff-environment-summary-card">
          <div className="staff-environment-summary-icon staff-environment-summary-icon--blue">◉</div>
          <div>
            <p>Ao đang phụ trách</p>
            <h3>{stats.ponds}</h3>
          </div>
        </article>
        <article className="staff-environment-summary-card">
          <div className="staff-environment-summary-icon staff-environment-summary-icon--teal">✎</div>
          <div>
            <p>Số lần nhập hôm nay</p>
            <h3>{stats.todayEntries}</h3>
          </div>
        </article>
        <article className="staff-environment-summary-card">
          <div className="staff-environment-summary-icon staff-environment-summary-icon--amber">!</div>
          <div>
            <p>Chỉ số bất thường</p>
            <h3>{stats.anomalies}</h3>
          </div>
        </article>
        <article className="staff-environment-summary-card">
          <div className="staff-environment-summary-icon staff-environment-summary-icon--indigo">◔</div>
          <div>
            <p>Lần cập nhật gần nhất</p>
            <h3>{formatRelativeTime(stats.latest)}</h3>
          </div>
        </article>
      </section>

      <section className="staff-environment-card staff-environment-trends-card">
        <div className="staff-environment-section-head">
          <div>
            <h2>Biểu đồ xu hướng môi trường</h2>
            <p>{selectedSeason ? `${selectedSeason.season_name || `Mùa vụ ${selectedSeasonId}`} · ${pondLabel}` : 'Chọn mùa vụ để xem xu hướng'}</p>
          </div>
        </div>

        <div className="staff-environment-trend-grid">
          {chartCards.map((card) => (
            <article key={card.key} className="staff-environment-trend-card">
              <div className="staff-environment-trend-top">
                <span className="staff-environment-trend-label">{card.label}</span>
                <span className="staff-environment-trend-unit">{card.unit}</span>
              </div>
              <div className="staff-environment-trend-value">
                {card.latestValue !== null ? formatNumber(card.latestValue) : '-'}
              </div>
              <div className="staff-environment-trend-chart">
                {activeLogs.length > 0 ? (
                  <Line data={card.chartData} options={card.chartOptions} />
                ) : (
                  <div className="staff-environment-trend-empty">Chưa có dữ liệu</div>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="staff-environment-card">
        <div className="staff-environment-section-head staff-environment-table-head">
          <div>
            <h2>Lịch sử nhập dữ liệu</h2>
            <p>Ghi nhận thủ công của {currentUserName} cho mùa vụ đang chọn</p>
          </div>
        </div>

        {loading ? (
          <div className="staff-environment-empty-state">Đang tải dữ liệu...</div>
        ) : orderedLogs.length === 0 ? (
          <div className="staff-environment-empty-state">Chưa có dữ liệu môi trường cho mùa vụ này.</div>
        ) : (
          <div className="staff-environment-table-wrap">
            <table className="staff-environment-table">
              <thead>
                <tr>
                  <th>Thời gian</th>
                  <th>Mùa vụ</th>
                  <th>pH</th>
                  <th>Nhiệt độ (°C)</th>
                  <th>Oxy (mg/L)</th>
                  <th>Độ mặn (ppt)</th>
                  <th>Mực nước (cm)</th>
                  <th>Người nhập</th>
                </tr>
              </thead>
              <tbody>
                {orderedLogs.map((item) => (
                  <tr key={item.env_id || item.recorded_at}>
                    <td>{formatDateTime(item.recorded_at)}</td>
                    <td>{selectedSeason?.season_name || `Mùa vụ ${item.season_id}`}</td>
                    <td>{formatNumber(item.ph)}</td>
                    <td>{formatNumber(item.temperature)}</td>
                    <td>{formatNumber(item.oxygen)}</td>
                    <td>{formatNumber(item.salinity)}</td>
                    <td>{formatNumber(item.water_level)}</td>
                    <td>{creatorName(item)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showFormModal && (
        <div className="staff-environment-modal" onClick={closeFormModal}>
          <div className="staff-environment-modal-content" onClick={(event) => event.stopPropagation()}>
            <div className="staff-environment-modal-head">
              <div>
                <h3>Nhập dữ liệu môi trường</h3>
                <p>Điền các chỉ số cho mùa vụ đang phụ trách</p>
              </div>
              <button type="button" className="staff-environment-modal-close" onClick={closeFormModal}>
                ×
              </button>
            </div>

            <form className="staff-environment-form" onSubmit={handleSubmit}>
              <div className="staff-environment-grid two-col">
                <div>
                  <label>Mùa vụ</label>
                  <select value={form.seasonId} onChange={(e) => handleChange('seasonId', e.target.value)} required>
                    <option value="">-- Chọn mùa vụ --</option>
                    {seasonOptions.map((season) => (
                      <option key={season.id} value={season.id}>
                        {season.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label>Người nhập</label>
                  <input type="text" value={currentUserName} disabled />
                </div>
              </div>

              <div className="staff-environment-grid three-col">
                <div>
                  <label>pH</label>
                  <input type="number" step="0.01" value={form.ph} onChange={(e) => handleChange('ph', e.target.value)} required />
                </div>
                <div>
                  <label>Nhiệt độ (°C)</label>
                  <input type="number" step="0.1" value={form.temperature} onChange={(e) => handleChange('temperature', e.target.value)} required />
                </div>
                <div>
                  <label>Oxy hòa tan (mg/L)</label>
                  <input type="number" step="0.1" value={form.oxygen} onChange={(e) => handleChange('oxygen', e.target.value)} required />
                </div>
              </div>

              <div className="staff-environment-grid two-col">
                <div>
                  <label>Độ mặn (ppt)</label>
                  <input type="number" step="0.1" value={form.salinity} onChange={(e) => handleChange('salinity', e.target.value)} required />
                </div>
                <div>
                  <label>Mực nước (cm)</label>
                  <input type="number" step="1" value={form.waterLevel} onChange={(e) => handleChange('waterLevel', e.target.value)} required />
                </div>
              </div>

              <div className="staff-environment-actions">
                <button type="button" className="btn btn-secondary" onClick={closeFormModal}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Đang lưu...' : 'Lưu dữ liệu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default TechnicianEnvironment
