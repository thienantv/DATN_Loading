import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react'
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
import { environmentLogService, userService } from '../../services/api'
import { showToast } from '../../utils/toast'
import { useAuth } from '../../context/AuthContext'
import '../../styles/technician/technician-environment.css'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler)

const emptyForm = {
  pondId: '',
  ph: '',
  temperature: '',
  oxygen: '',
  salinity: '',
  turbidity: '',
}

const defaultISODate = (d) => {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

const initialDateTo = defaultISODate(new Date())
const initialDateFrom = defaultISODate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))

const METRIC_CONFIG = [
  { key: 'ph', label: 'pH', unit: 'pH', color: '#2b7de9' },
  { key: 'temperature', label: 'Nhiệt độ', unit: '°C', color: '#2fb5ab' },
  { key: 'oxygen', label: 'DO', unit: 'mg/L', color: '#4f8edc' },
  { key: 'salinity', label: 'Độ mặn', unit: 'ppt', color: '#5b9bd5' },
  { key: 'turbidity', label: 'Độ đục', unit: 'NTU', color: '#1f87b7' },
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

const toNumber = (value) => {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isNaN(parsed) ? null : parsed
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

const isOutOfRange = (log, thresholds) => {
  const ph = toNumber(log.ph)
  const temperature = toNumber(log.temperature)
  const oxygen = toNumber(log.oxygen)
  const salinity = toNumber(log.salinity)
  const turbidity = toNumber(log.turbidity)

  const minPh = toNumber(thresholds?.min_ph)
  const maxPh = toNumber(thresholds?.max_ph)
  const minTemp = toNumber(thresholds?.min_temp)
  const maxTemp = toNumber(thresholds?.max_temp)
  const minOxygen = toNumber(thresholds?.min_oxygen)
  const maxOxygen = toNumber(thresholds?.max_oxygen)
  const minSalinity = toNumber(thresholds?.min_salinity)
  const maxSalinity = toNumber(thresholds?.max_salinity)
  const minTurbidity = toNumber(thresholds?.min_turbidity)
  const maxTurbidity = toNumber(thresholds?.max_turbidity)

  const generic = {
    ph: { min: 6.5, max: 8.5 },
    temperature: { min: 25, max: 33 },
    oxygen: { min: 4, max: 9 },
    salinity: { min: 0, max: 35 },
    turbidity: { min: 0, max: 10 },
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
    compare(turbidity, minTurbidity, maxTurbidity, generic.turbidity)
  )
}

const getMetricStatus = (metricKey, value, thresholds) => {
  if (value === null || value === undefined) return 'missing'

  const alertMode = String(thresholds?.alert_level || thresholds?.alertLevel || 'WARNING').toUpperCase()
  const metricRanges = {
    ph: { min: toNumber(thresholds?.min_ph), max: toNumber(thresholds?.max_ph), fallback: { min: 6.5, max: 8.5 } },
    temperature: { min: toNumber(thresholds?.min_temp), max: toNumber(thresholds?.max_temp), fallback: { min: 25, max: 33 } },
    oxygen: { min: toNumber(thresholds?.min_oxygen), max: toNumber(thresholds?.max_oxygen), fallback: { min: 4, max: 9 } },
    salinity: { min: toNumber(thresholds?.min_salinity), max: toNumber(thresholds?.max_salinity), fallback: { min: 0, max: 35 } },
    turbidity: { min: toNumber(thresholds?.min_turbidity), max: toNumber(thresholds?.max_turbidity), fallback: { min: 0, max: 10 } },
  }

  const range = metricRanges[metricKey]
  if (!range) return 'normal'

  const lower = range.min ?? range.fallback.min
  const upper = range.max ?? range.fallback.max
  return value < lower || value > upper ? (alertMode === 'DANGER' ? 'danger' : 'warning') : 'normal'
}

const getMetricStatusLabel = (status) => {
  if (status === 'danger') return 'Nguy hiểm'
  if (status === 'warning') return 'Cảnh báo'
  if (status === 'missing') return 'Thiếu dữ liệu'
  return 'Ổn định'
}

export default function TechnicianEnvironment({ readOnly = false, pageTitle = 'Nhập chỉ số môi trường', pageSubtitle = 'Nhập dữ liệu đo thủ công cho ao bạn phụ trách. Dữ liệu sẽ được lưu vào nhật ký môi trường.' }) {
  const { user, ponds } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [environmentLogs, setEnvironmentLogs] = useState([])
  const [thresholds, setThresholds] = useState(null)
  const [selectedPondId, setSelectedPondId] = useState('')
  const [showFormModal, setShowFormModal] = useState(false)
  const [dateFrom, setDateFrom] = useState(initialDateFrom)
  const [dateTo, setDateTo] = useState(initialDateTo)
  const [dateError, setDateError] = useState('')
  
  const [form, setForm] = useState(emptyForm)

  // table controls
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const loadPondData = useCallback(async (pondId) => {
    if (!pondId) {
      setEnvironmentLogs([])
      setThresholds(null)
      return
    }

    try {
      setLoading(true)
      const [logsRes, thresholdsRes] = await Promise.all([
        environmentLogService.getByPondId(pondId),
        environmentLogService.getThresholdsByPond(pondId),
      ])
      let logs = logsRes?.data?.data || []
      // If current user is Owner, enrich logs with creator names when backend doesn't provide them
      if (user?.role === 'OWNER' && logs.length > 0) {
        try {
          const usersRes = await userService.getAllUsers()
          const usersList = usersRes?.data?.data || []
          const userMap = new Map(usersList.map((u) => [String(u.user_id), u]))
          logs = logs.map((l) => {
            const creator = userMap.get(String(l.created_by)) || null
            return {
              ...l,
              created_by_name: l.created_by_name || creator?.full_name || null,
              created_by_username: l.created_by_username || creator?.username || null,
            }
          })
        } catch (userErr) {
          console.warn('Failed to enrich environment logs with user data:', userErr)
        }
      }

      setEnvironmentLogs(logs)
      setThresholds(thresholdsRes?.data?.data || null)
    } catch (loadError) {
      setEnvironmentLogs([])
      setThresholds(null)
      showToast({ title: loadError?.response?.data?.message || 'Không tải được dữ liệu môi trường', type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (ponds && ponds.length > 0) {
      const firstPondId = String(ponds[0].pond_id || ponds[0].id)
      setSelectedPondId(firstPondId)
    } else {
      setSelectedPondId('')
    }
  }, [ponds])

  useEffect(() => {
    if (selectedPondId) loadPondData(selectedPondId)
  }, [selectedPondId, loadPondData])

  const selectedPond = useMemo(() => {
    if (!ponds || !selectedPondId) return null
    return ponds.find((pond) => String(pond.pond_id || pond.id) === String(selectedPondId)) || null
  }, [ponds, selectedPondId])

  const pondLabel = selectedPond
    ? `${selectedPond.pond_code || 'Ao'} ${selectedPond.pond_name ? `- ${selectedPond.pond_name}` : ''}`
    : 'Chưa chọn ao'

  const pondOptions = useMemo(() => (ponds || []).map((pond) => ({ id: String(pond.pond_id || pond.id), label: `${pond.pond_code || 'Ao'} ${pond.pond_name ? `- ${pond.pond_name}` : ''}` })), [ponds])

  const orderedLogs = useMemo(() => [...environmentLogs].sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at)), [environmentLogs])

  const filteredLogs = useMemo(() => {
    // if date range invalid, return empty array so UI shows no rows
    if (dateFrom && dateTo && new Date(dateFrom) > new Date(dateTo)) return []
    // use inclusive date range from dateFrom (00:00) to dateTo (23:59:59.999)
    const from = dateFrom ? new Date(`${dateFrom}T00:00:00`) : new Date(0)
    const to = dateTo ? new Date(`${dateTo}T23:59:59.999`) : new Date()
    return orderedLogs.filter((log) => {
      const t = new Date(log.recorded_at).getTime()
      return t >= from.getTime() && t <= to.getTime()
    })
  }, [orderedLogs, dateFrom, dateTo])

  // No auto-reset here; we will show a toast on invalid ranges and leave inputs as-is.

  const activeLogs = filteredLogs

  const stats = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return {
      ponds: (ponds || []).length,
      todayEntries: orderedLogs.filter((log) => new Date(log.recorded_at) >= today).length,
      anomalies: activeLogs.filter((log) => isOutOfRange(log, thresholds)).length,
      latest: orderedLogs[orderedLogs.length - 1]?.recorded_at || null,
    }
  }, [activeLogs, orderedLogs, ponds, thresholds])

  const currentUserName = user?.full_name || 'Bạn'

  const chartCards = useMemo(() => {
    const latestReading = activeLogs[activeLogs.length - 1] || null

    return METRIC_CONFIG.map((metric) => {
    const series = activeLogs.map((log) => ({ x: formatShortTime(log.recorded_at), y: toNumber(log[metric.key]) }))
    const validSeries = series.filter((item) => item.y !== null)
    const latestValue = validSeries.length > 0 ? validSeries[validSeries.length - 1].y : null
    const status = getMetricStatus(metric.key, toNumber(latestReading?.[metric.key]), thresholds)
    return {
      ...metric,
      latestValue,
      status,
      statusLabel: getMetricStatusLabel(status),
      chartData: { labels: series.map((item) => item.x), datasets: [{ data: series.map((item) => item.y), borderColor: metric.color, backgroundColor: `${metric.color}22`, fill: true, pointBackgroundColor: metric.color, pointBorderColor: metric.color }] },
      chartOptions: createMiniChartOptions(metric.color),
    }
    })
  }, [activeLogs, thresholds])

  const openFormModal = () => {
    setForm((prev) => ({ ...emptyForm, pondId: prev.pondId || selectedPondId || (pondOptions[0]?.id ? String(pondOptions[0].id) : '') }))
    setShowFormModal(true)
  }

  const closeFormModal = () => setShowFormModal(false)
  const handleChange = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))

  const handleSubmit = async (event) => {
    event.preventDefault()
    try {
      setSaving(true)
      await environmentLogService.createLog({ pondId: Number(form.pondId), ph: Number(form.ph), temperature: Number(form.temperature), oxygen: Number(form.oxygen), salinity: Number(form.salinity), turbidity: Number(form.turbidity) })
      const nextPondId = String(form.pondId)
      showToast({ title: 'Đã lưu dữ liệu môi trường thành công', type: 'success' })
      setShowFormModal(false)
      setForm((prev) => ({ ...emptyForm, pondId: prev.pondId }))
      if (nextPondId !== selectedPondId) setSelectedPondId(nextPondId)
      else await loadPondData(nextPondId)
    } catch (submitError) {
      showToast({ title: submitError?.response?.data?.message || 'Không thể lưu dữ liệu môi trường', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const creatorName = useCallback((log) => {
    // Prefer explicit name fields when available so Owners can see who entered the data
    if (log?.created_by_name) return log.created_by_name
    if (log?.created_by_username) return log.created_by_username
    if (String(log.created_by) === String(user?.user_id)) return currentUserName
    if (!log.created_by) return '-'
    return `#${log.created_by}`
  }, [currentUserName, user?.user_id])

  // Table search + pagination logic
  const searchedLogs = useMemo(() => {
    const term = String(searchTerm || '').trim().toLowerCase()
    if (!term) return activeLogs
    return activeLogs.filter((item) => {
      return (creatorName(item) || '').toLowerCase().includes(term) || String(item.ph || '').toLowerCase().includes(term) || String(item.temperature || '').toLowerCase().includes(term)
    })
  }, [activeLogs, searchTerm, creatorName])

  const total = searchedLogs.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(currentPage, totalPages)
  const paginated = searchedLogs.slice((safePage - 1) * pageSize, safePage * pageSize)

  return (
    <div className="dashboard admin-page technician-ponds technician-environment_page">
      <div className="table-container table-panel">
      <div className="table-header">
        <div>
          <h2>{pageTitle}</h2>
          <p className="table-subtitle">{pageSubtitle}</p>
        </div>
        <div>
          {!readOnly && (
            <button type="button" className="btn btn-primary" onClick={openFormModal}>+ Nhập dữ liệu</button>
          )}
        </div>
      </div>

      <div className="stats-grid">
        <article className="stats-card stats-card--primary stats-card-row"><div className="stats-card-content"><p className="stats-card-label">Ao đang phụ trách</p><h3 className="stats-card-value">{stats.ponds}</h3></div></article>
        <article className="stats-card stats-card--teal stats-card-row"><div className="stats-card-content"><p className="stats-card-label">Số lần nhập hôm nay</p><h3 className="stats-card-value">{stats.todayEntries}</h3></div></article>
        <article className="stats-card stats-card--warning stats-card-row"><div className="stats-card-content"><p className="stats-card-label">Chỉ số bất thường</p><h3 className="stats-card-value">{stats.anomalies}</h3></div></article>
        <article className="stats-card stats-card--neutral stats-card-row"><div className="stats-card-content"><p className="stats-card-label">Lần cập nhật gần nhất</p><h3 className="stats-card-value">{formatDateTime(stats.latest)}</h3></div></article>
      </div>

      <div className="staff-environment-pond-list">
        {(pondOptions || []).map((pond) => (
          <button
            key={pond.id}
            type="button"
            className={`btn btn-sm staff-environment-pond-btn ${String(selectedPondId) === String(pond.id) ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setSelectedPondId(pond.id)}
          >
            {pond.label}
          </button>
        ))}
      </div>

      <div className="staff-environment-trend-grid">
        {chartCards.map((card) => (
          <article key={card.key} className={`staff-environment-trend-card staff-environment-trend-card--${card.status}`}>
            <div className="staff-environment-trend-top">
              <span className="staff-environment-trend-label">{card.label}</span>
              <span className={`staff-environment-trend-status staff-environment-trend-status--${card.status}`}>{card.statusLabel}</span>
            </div>
            <div className="staff-environment-trend-value">
              <span className="staff-environment-trend-number">{card.latestValue !== null ? formatNumber(card.latestValue) : '--'}</span>
              <span className="staff-environment-trend-unit">{card.unit}</span>
            </div>
            <div className="staff-environment-trend-chart">{activeLogs.length > 0 ? <Line data={card.chartData} options={card.chartOptions} /> : <div className="staff-environment-trend-empty">Chưa có dữ liệu</div>}</div>
          </article>
        ))}
      </div>

      <div className="table-toolbar staff-environment_toolbar">
        <div className="staff-environment-toolbar-shell">
          <div className="table-search staff-environment-toolbar-search"><span className="table-search-icon">⌕</span><input type="text" placeholder="Tìm theo người nhập hoặc giá trị" value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1) }} /></div>
          <div className={`staff-environment-range-group ${dateError ? 'is-invalid' : ''}`} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <label style={{ display: 'inline-flex', flexDirection: 'column', fontSize: '0.85rem' }}>
              {/* Từ ngày */}
              <input className="form-input staff-date-input" type="date" value={dateFrom} onChange={(e) => {
                const next = e.target.value
                setDateFrom(next)
                // validate
                if (dateTo && next && new Date(next) > new Date(dateTo)) {
                  const msg = 'Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc'
                  setDateError(msg)
                  showToast({ title: msg, type: 'error' })
                } else {
                  setDateError('')
                }
                setCurrentPage(1)
              }} />
            </label>
            <label style={{ display: 'inline-flex', flexDirection: 'column', fontSize: '0.85rem' }}>
              {/* Đến ngày */}
              <input className="form-input staff-date-input" type="date" value={dateTo} onChange={(e) => {
                const next = e.target.value
                setDateTo(next)
                if (dateFrom && next && new Date(dateFrom) > new Date(next)) {
                  const msg = 'Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu'
                  setDateError(msg)
                  showToast({ title: msg, type: 'error' })
                } else {
                  setDateError('')
                }
                setCurrentPage(1)
              }} />
            </label>
            {/* errors are shown via global toast; no inline tooltip */}
          </div>
          
        </div>
      </div>

      <div className="table-scroll">
        {loading ? <div className="staff-environment-empty-state">Đang tải dữ liệu...</div> : activeLogs.length === 0 ? <div className="staff-environment-empty-state">Chưa có dữ liệu môi trường cho ao này.</div> : (
          <>
            <table className="table-base staff-environment-table">
              <thead>
                <tr>
                  <th>Thời gian</th>
                  <th>Ao</th>
                  <th>pH</th>
                  <th>Nhiệt độ (°C)</th>
                  <th>Oxy (mg/L)</th>
                  <th>Độ mặn (ppt)</th>
                  <th>Độ đục (NTU)</th>
                  <th>Người nhập</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((item) => (
                  <tr key={item.env_id || item.recorded_at}>
                    <td>{formatDateTime(item.recorded_at)}</td>
                    <td>{selectedPond ? pondLabel : `Ao ${item.pond_id}`}</td>
                    <td>{formatNumber(item.ph)}</td>
                    <td>{formatNumber(item.temperature)}</td>
                    <td>{formatNumber(item.oxygen)}</td>
                    <td>{formatNumber(item.salinity)}</td>
                    <td>{formatNumber(item.turbidity)}</td>
                    <td>{creatorName(item)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="table-pagination">
              <div className="table-pagination-left">
                <span>Số mục trên trang</span>
                <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value) || 10); setCurrentPage(1) }}>
                  {[5,10,20,50].map((s) => (<option key={s} value={s}>{s}</option>))}
                </select>
                <span>{total === 0 ? 0 : ((safePage-1)*pageSize + 1)}-{Math.min(safePage*pageSize, total)} / {total}</span>
              </div>
              <div className="table-pagination-right staff-environment-pagination-right">
                <button type="button" className="btn btn-sm btn-secondary" onClick={() => setCurrentPage((p) => Math.max(1, p-1))} disabled={safePage <= 1}>‹</button>
                <span className="table-page-pill">{safePage}</span>
                <button type="button" className="btn btn-sm btn-secondary" onClick={() => setCurrentPage((p) => Math.min(totalPages, p+1))} disabled={safePage >= totalPages}>›</button>
              </div>
            </div>
          </>
        )}
      </div>

      {!readOnly && showFormModal && (
        <div className="staff-environment-modal" onClick={closeFormModal}>
          <div className="staff-environment-modal-content" onClick={(event) => event.stopPropagation()}>
            <div className="staff-environment-modal-head">
              <div>
                <h3>Nhập dữ liệu môi trường</h3>
                <p>Điền các chỉ số cho ao đang phụ trách</p>
              </div>
              <button type="button" className="staff-environment-modal-close" onClick={closeFormModal}>×</button>
            </div>

            <form className="staff-environment-form" onSubmit={handleSubmit}>
              <div className="staff-environment-form-group"><label>Ao</label><select value={form.pondId} onChange={(e) => handleChange('pondId', e.target.value)} required><option value="">-- Chọn ao --</option>{pondOptions.map((pond) => (<option key={pond.id} value={pond.id}>{pond.label}</option>))}</select></div>

              <div className="staff-environment-form-grid">
                <div className="staff-environment-form-group"><label>pH</label><input type="number" step="0.01" value={form.ph} onChange={(e) => handleChange('ph', e.target.value)} required /></div>
                <div className="staff-environment-form-group"><label>Nhiệt độ (°C)</label><input type="number" step="0.1" value={form.temperature} onChange={(e) => handleChange('temperature', e.target.value)} required /></div>
                <div className="staff-environment-form-group"><label>Oxy hòa tan (mg/L)</label><input type="number" step="0.1" value={form.oxygen} onChange={(e) => handleChange('oxygen', e.target.value)} required /></div>
                <div className="staff-environment-form-group"><label>Độ mặn (ppt)</label><input type="number" step="0.1" value={form.salinity} onChange={(e) => handleChange('salinity', e.target.value)} required /></div>
              </div>

              <div className="staff-environment-form-group" style={{ maxWidth: 420, margin: '12px auto 0' }}><label>Độ đục (NTU)</label><input type="number" step="0.1" value={form.turbidity} onChange={(e) => handleChange('turbidity', e.target.value)} required /></div>

              <div className="staff-environment-form-actions"><button type="button" className="btn btn-secondary" onClick={closeFormModal}>Hủy</button><button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu dữ liệu'}</button></div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}
