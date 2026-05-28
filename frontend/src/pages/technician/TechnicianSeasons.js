import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { seasonService, pondService } from '../../services/api'
import { showToast } from '../../utils/toast'
import PondChartCard from '../../components/charts/PondChartCard'
import '../../styles/technician/technician-seasons.css'

const emptyCreateForm = {
  pondId: '',
  seasonName: '',
  startDate: '',
  expectedHarvestDate: '',
  shrimpType: '',
  density: '',
  seedQuantity: '',
  note: '',
}

const emptyHarvestForm = {
  actualHarvestDate: '',
  harvestWeightKg: '',
  note: '',
}

const formatVietnameseDate = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(date)
}

const formatRoundedNumber = (value) => {
  if (value === null || value === undefined || value === '') return '-'
  const numberValue = Number(value)
  if (Number.isNaN(numberValue)) return value
  return String(Math.round(numberValue))
}

const toDateOnly = (v) => {
  if (!v) return null
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return null
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

const TechnicianSeasons = () => {
  const [seasons, setSeasons] = useState([])
  const [ponds, setPonds] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showHarvestModal, setShowHarvestModal] = useState(false)
  const [selectedSeason, setSelectedSeason] = useState(null)
  const [showHarvestSummaryModal, setShowHarvestSummaryModal] = useState(false)
  const [createForm, setCreateForm] = useState(emptyCreateForm)
  const [harvestForm, setHarvestForm] = useState(emptyHarvestForm)

  useEffect(() => {
    fetchData()
  }, [])

  // Filters / pagination
  const [searchTerm, setSearchTerm] = useState('')
  const [stateFilter, setStateFilter] = useState('ALL')
  const [shrimpFilter, setShrimpFilter] = useState('ALL')
  const [dateFrom, setDateFrom] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const fetchData = async () => {
    try {
      setLoading(true)
      const [seasonsRes, pondsRes] = await Promise.all([
        seasonService.getAllSeasons(),
        pondService.getAllPonds(),
      ])
      setSeasons(seasonsRes?.data?.data || [])
      setPonds(pondsRes?.data?.data || [])
    } catch (err) {
      showToast({ title: err?.response?.data?.message || 'Không tải được dữ liệu mùa vụ', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const getPondName = useCallback((pondId) => {
    if (!pondId) return '-'
    const found = ponds.find((p) => p.pond_id === pondId)
    return found ? (found.pond_name || found.pond_code) : '-'
  }, [ponds])

  const normalizeText = (s) => String(s || '').toLowerCase()
  const normalizeUpper = (s) => String(s || '').toUpperCase()

  const seasonStatusOptions = [
    { value: 'ALL', label: 'Tất cả trạng thái' },
    { value: 'CHUAN_BI_NUOI', label: 'Chuẩn bị nuôi' },
    { value: 'DANG_NUOI', label: 'Đang nuôi' },
    { value: 'COMPLETED', label: 'Đã thu hoạch' },
  ]

  const shrimpTypeOptions = useMemo(() => {
    const uniqueTypes = Array.from(
      new Set(
        seasons
          .map((season) => String(season.shrimp_type || '').trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b, 'vi'))

    return [
      { value: 'ALL', label: 'Tất cả loại tôm' },
      ...uniqueTypes.map((type) => ({ value: type, label: type })),
    ]
  }, [seasons])

  const normalizeSeasonStatus = (status) => {
    const s = normalizeUpper(status)
    if (['CHUAN_BI_NUOI', 'PLANNED', 'READY'].includes(s)) return 'CHUAN_BI_NUOI'
    if (['DANG_NUOI', 'RUNNING', 'IN_PROGRESS'].includes(s)) return 'DANG_NUOI'
    if (['COMPLETED', 'DA_THU_HOACH', 'FINISHED'].includes(s)) return 'COMPLETED'
    return s
  }

  const seasonDays = (season) => {
    if (!season?.start_date) return '-'
    const start = new Date(season.start_date)
    const now = new Date()
    const diff = Math.floor((now - start) / 86400000)
    return diff >= 0 ? diff : 0
  }

  const statusLabel = (code) => {
    const s = String(code || '').toUpperCase()
    if (s === 'CHUAN_BI_NUOI' || s === 'PLANNED' || s === 'READY') return 'Chuẩn bị nuôi'
    if (s === 'DANG_NUOI' || s === 'RUNNING' || s === 'IN_PROGRESS') return 'Đang nuôi'
    if (s === 'COMPLETED' || s === 'DA_THU_HOACH' || s === 'FINISHED') return 'Đã thu hoạch'
    return code || '-'
  }

  const seasonStatusClass = (code) => {
    const s = String(code || '').toUpperCase()
    if (s === 'DANG_NUOI' || s === 'RUNNING' || s === 'IN_PROGRESS') return 'technician-ponds_status technician-ponds_status--farming'
    if (s === 'CHUAN_BI_NUOI' || s === 'PLANNED' || s === 'READY') return 'technician-ponds_status technician-ponds_status--paused'
    if (s === 'COMPLETED' || s === 'DA_THU_HOACH' || s === 'FINISHED') return 'technician-ponds_status technician-ponds_status--renovating'
    return 'technician-ponds_status'
  }

  const openCreateModal = () => {
    setSelectedSeason(null)
    setCreateForm(emptyCreateForm)
    setShowCreateModal(true)
  }

  const openEditModal = async (season) => {
    setSelectedSeason(season)

    try {
      const res = await seasonService.getSeasonById(season.season_id)
      const detail = res?.data?.data || season
      setSelectedSeason(detail)
      setCreateForm({
        pondId: detail.pond_id || season.pond_id || '',
        seasonName: detail.season_name || season.season_name || '',
        startDate: detail.start_date ? String(detail.start_date).split('T')[0] : (season.start_date ? String(season.start_date).split('T')[0] : ''),
        expectedHarvestDate: detail.expected_harvest ? String(detail.expected_harvest).split('T')[0] : (season.expected_harvest ? String(season.expected_harvest).split('T')[0] : ''),
        shrimpType: detail.shrimp_type || season.shrimp_type || '',
        density: detail.density ?? season.density ?? '',
        seedQuantity: detail.seed_quantity ?? detail.quantity_seed ?? season.seed_quantity ?? season.quantity_seed ?? '',
        note: detail.note || season.note || '',
      })
    } catch (err) {
      setCreateForm({
        pondId: season.pond_id || '',
        seasonName: season.season_name || '',
        startDate: season.start_date ? String(season.start_date).split('T')[0] : '',
        expectedHarvestDate: season.expected_harvest ? String(season.expected_harvest).split('T')[0] : '',
        shrimpType: season.shrimp_type || '',
        density: season.density || '',
        seedQuantity: season.seed_quantity ?? season.quantity_seed ?? '',
        note: season.note || '',
      })
      showToast({ title: err?.response?.data?.message || 'Không tải được chi tiết mùa vụ để chỉnh sửa', type: 'error' })
    }

    setShowCreateModal(true)
  }

  const openHarvestModal = (season) => {
    setSelectedSeason(season)
    setHarvestForm(emptyHarvestForm)
    setShowHarvestModal(true)
  }

  const handleCreateChange = (field, value) => {
    setCreateForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleHarvestChange = (field, value) => {
    setHarvestForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleCreateSubmit = async (event) => {
    event.preventDefault()
    const isEditing = Boolean(selectedSeason?.season_id)
    const payload = {
      pondId: Number(createForm.pondId),
      seasonName: createForm.seasonName.trim(),
      startDate: createForm.startDate,
      expectedHarvestDate: createForm.expectedHarvestDate || null,
      shrimpType: createForm.shrimpType.trim(),
      density: Number(createForm.density),
      quantitySeed: Number(createForm.seedQuantity || 0),
      note: createForm.note?.trim() || null,
    }

    // Client-side validation
    const toDateOnly = (v) => {
      if (!v) return null
      const d = new Date(v)
      if (Number.isNaN(d.getTime())) return null
      return new Date(d.getFullYear(), d.getMonth(), d.getDate())
    }
    const today = toDateOnly(new Date())
    const startD = toDateOnly(payload.startDate)
    const expectedD = toDateOnly(payload.expectedHarvestDate)

    if (!payload.pondId) return showToast({ title: 'Vui lòng chọn ao', type: 'error' })
    if (!payload.seasonName) return showToast({ title: 'Tên mùa vụ là bắt buộc', type: 'error' })
    if (!startD) return showToast({ title: 'Ngày thả không hợp lệ', type: 'error' })
    if (startD < today) return showToast({ title: 'Ngày thả không được nhỏ hơn ngày hiện tại', type: 'error' })
    if (!expectedD) return showToast({ title: 'Ngày dự kiến thu hoạch không hợp lệ', type: 'error' })
    if (expectedD < today) return showToast({ title: 'Ngày dự kiến thu hoạch không được nhỏ hơn ngày hiện tại', type: 'error' })
    if (expectedD < startD) return showToast({ title: 'Ngày dự kiến thu hoạch không được nhỏ hơn ngày thả', type: 'error' })
    if (Number.isNaN(payload.density) || payload.density < 0) return showToast({ title: 'Mật độ không được âm', type: 'error' })
    if (Number.isNaN(payload.quantitySeed) || payload.quantitySeed < 0) return showToast({ title: 'Số lượng giống không hợp lệ', type: 'error' })
    if (!payload.shrimpType) return showToast({ title: 'Loại tôm là bắt buộc', type: 'error' })

    try {
      if (!payload.pondId) return showToast({ title: 'Vui lòng chọn ao', type: 'error' })
      if (!window.confirm(isEditing ? 'Xác nhận cập nhật mùa vụ này?' : 'Xác nhận tạo mùa vụ mới?')) return
      setSaving(true)
      if (isEditing) {
        await seasonService.updateSeason(selectedSeason.season_id, payload)
        showToast({ title: 'Cập nhật mùa vụ thành công', type: 'success' })
      } else {
        await seasonService.createSeason(payload)
        showToast({ title: 'Tạo mùa vụ thành công', type: 'success' })
      }
      setShowCreateModal(false)
      setSelectedSeason(null)
      setCreateForm(emptyCreateForm)
      await fetchData()
    } catch (err) {
      showToast({ title: err?.response?.data?.message || 'Không lưu được mùa vụ', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleHarvestSubmit = async (event) => {
    event.preventDefault()
    // Client-side validation
    const toDateOnly = (v) => {
      if (!v) return null
      const d = new Date(v)
      if (Number.isNaN(d.getTime())) return null
      return new Date(d.getFullYear(), d.getMonth(), d.getDate())
    }
    const today = toDateOnly(new Date())
    const actualD = toDateOnly(harvestForm.actualHarvestDate)
    if (!actualD) return showToast({ title: 'Ngày thu hoạch là bắt buộc', type: 'error' })
    if (actualD > today) return showToast({ title: 'Ngày thu hoạch không được lớn hơn ngày hiện tại', type: 'error' })
    const startD = selectedSeason?.start_date ? toDateOnly(selectedSeason.start_date) : null
    if (startD && actualD < startD) return showToast({ title: 'Ngày thu hoạch không được nhỏ hơn ngày thả', type: 'error' })
    const weight = Number(harvestForm.harvestWeightKg)
    if (harvestForm.harvestWeightKg === '' || harvestForm.harvestWeightKg === null || harvestForm.harvestWeightKg === undefined) return showToast({ title: 'Sản lượng thu hoạch là bắt buộc', type: 'error' })
    if (Number.isNaN(weight) || weight < 0) return showToast({ title: 'Sản lượng thu hoạch không hợp lệ', type: 'error' })

    try {
      if (!window.confirm('Xác nhận thu hoạch mùa vụ này?')) return
      setSaving(true)
      await seasonService.harvestSeason(selectedSeason.season_id, {
        actualHarvestDate: harvestForm.actualHarvestDate,
        harvestWeightKg: weight,
        harvestNote: harvestForm.note.trim() || null,
      })
      showToast({ title: 'Thu hoạch thành công', type: 'success' })
      setShowHarvestModal(false)
      setSelectedSeason(null)
      setHarvestForm(emptyHarvestForm)
      await fetchData()
    } catch (err) {
      showToast({ title: err?.response?.data?.message || 'Không kết thúc mùa vụ', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (season) => {
    if (!season) return
    if (!window.confirm(`Xác nhận xóa mùa vụ "${season.season_name}"?`)) return
    try {
      await seasonService.deleteSeason(season.season_id)
      showToast({ title: 'Xóa mùa vụ thành công', type: 'success' })
      await fetchData()
    } catch (err) {
      showToast({ title: err?.response?.data?.message || 'Không xóa được mùa vụ', type: 'error' })
    }
  }

  const fetchAndSelectSeason = async (season) => {
    setSelectedSeason(season)

    try {
      const res = await seasonService.getSeasonById(season.season_id)
      const detail = res?.data?.data
      if (detail) {
        setSelectedSeason(detail)
      }
    } catch (err) {
      showToast({ title: err?.response?.data?.message || 'Không tải được chi tiết mùa vụ', type: 'error' })
    }
  }

  const openDetailModal = async (season) => {
    await fetchAndSelectSeason(season)
    setShowDetailModal(true)
  }

  const openHarvestSummaryModal = async (season) => {
    await fetchAndSelectSeason(season)
    setShowHarvestSummaryModal(true)
  }

  const [showDetailModal, setShowDetailModal] = useState(false)

  // derived filtered seasons
  const filteredSeasons = seasons.filter((s) => {
    const matchSearch = !searchTerm || normalizeText(s.season_name).includes(normalizeText(searchTerm)) || normalizeText(getPondName(s.pond_id)).includes(normalizeText(searchTerm))
    const matchState = stateFilter === 'ALL' || normalizeSeasonStatus(s.status) === stateFilter
    const matchShrimp = shrimpFilter === 'ALL' || normalizeText(s.shrimp_type) === normalizeText(shrimpFilter)
    // Exact date match by day/month/year
    const from = dateFrom ? toDateOnly(new Date(dateFrom)) : null
    const startD = s.start_date ? toDateOnly(new Date(s.start_date)) : null
    const matchDateExact = !from || (startD && startD.getTime() === from.getTime())
    return matchSearch && matchState && matchShrimp && matchDateExact
  })

  // ponds eligible for creating a new season: assigned to technician (returned by backend), status TAM_NGUNG, not NGUNG_SU_DUNG, and no running season
  const eligiblePonds = ponds.filter((p) => {
    const status = normalizeUpper(p.status)
    const usage = normalizeUpper(p.usage_status)
    if (status !== 'TAM_NGUNG') return false
    if (usage === 'NGUNG_SU_DUNG') return false
    // ensure no running season exists for this pond
    const hasRunning = seasons.some((s) => Number(s.pond_id) === Number(p.pond_id) && ['DANG_NUOI','RUNNING','IN_PROGRESS'].includes(normalizeUpper(s.status)))
    if (hasRunning) return false
    return true
  })

  const editPondOptions = useMemo(() => {
    if (!selectedSeason?.season_id) return eligiblePonds

    const currentPondId = Number(selectedSeason.pond_id)
    const currentPond = ponds.find((pond) => Number(pond.pond_id) === currentPondId) || {
      pond_id: selectedSeason.pond_id,
      pond_code: selectedSeason.pond_code,
      pond_name: selectedSeason.pond_name || getPondName(selectedSeason.pond_id),
    }

    const merged = [currentPond, ...eligiblePonds]
    const seen = new Set()
    return merged.filter((pond) => {
      const key = String(pond.pond_id)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [eligiblePonds, ponds, selectedSeason, getPondName])

  const totalPages = Math.max(1, Math.ceil(filteredSeasons.length / pageSize))
  const safePage = Math.min(currentPage, totalPages)
  const startIndex = (safePage - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, filteredSeasons.length)
  const paginated = filteredSeasons.slice((safePage - 1) * pageSize, safePage * pageSize)

  // summary and chart data
  const stats = {
    total: seasons.length,
    preparing: seasons.filter((s) => normalizeSeasonStatus(s.status) === 'CHUAN_BI_NUOI').length,
    running: seasons.filter((s) => normalizeSeasonStatus(s.status) === 'DANG_NUOI').length,
    completed: seasons.filter((s) => normalizeSeasonStatus(s.status) === 'COMPLETED').length,
  }

  const seasonChartData = [
    { label: 'Chuẩn bị nuôi', value: stats.preparing, color: '#f59e0b' },
    { label: 'Đang nuôi', value: stats.running, color: '#22c55e' },
    { label: 'Đã thu hoạch', value: stats.completed, color: '#0ea5e9' },
  ]

  // compute per-pond progress (days since start) for currently running seasons
  const runningSeasons = seasons.filter((s) => ['DANG_NUOI','RUNNING','IN_PROGRESS'].includes(normalizeUpper(s.status)))
  const colorPalette = ['#3b82f6', '#06b6d4', '#7c3aed', '#ef4444', '#f59e0b', '#10b981']
  const pondsProgress = runningSeasons.map((s, idx) => {
    const days = seasonDays(s)
    const value = typeof days === 'number' ? days : 0
    return { label: getPondName(s.pond_id), value, color: colorPalette[idx % colorPalette.length] }
  })

  return (
    <div className="dashboard admin-page technician-ponds technician-seasons_page">
      <div className="table-container table-panel">
        <div className="table-header table-header">
          <div>
            <h2>Quản lý mùa vụ nuôi</h2>
            <p className="table-subtitle">Quản lý và theo dõi mùa vụ nuôi tôm tại các ao được phân công</p>
          </div>
          <button className="btn btn-primary" onClick={openCreateModal}>
            + Tạo mùa vụ
          </button>
        </div>

        <div className="stats-grid">
          <div className="stats-card stats-card--primary">
            <span className="stats-card-label">Tổng mùa vụ</span>
            <strong className="stats-card-value">{stats.total}</strong>
          </div>
          <div className="stats-card stats-card--warning">
            <span className="stats-card-label">Chuẩn bị nuôi</span>
            <strong className="stats-card-value">{stats.preparing}</strong>
          </div>
          <div className="stats-card stats-card--success">
            <span className="stats-card-label">Đang nuôi</span>
            <strong className="stats-card-value">{stats.running}</strong>
          </div>
          <div className="stats-card stats-card--info">
            <span className="stats-card-label">Đã thu hoạch</span>
            <strong className="stats-card-value">{stats.completed}</strong>
          </div>
          {/* removed Ao đang cải tạo card as requested */}
          <div className="stats-card stats-card--neutral">
            <span className="stats-card-label">Số ngày nuôi trung bình</span>
            <strong className="stats-card-value">{filteredSeasons.length > 0 ? formatRoundedNumber(filteredSeasons.reduce((sum, item) => sum + (seasonDays(item) === '-' ? 0 : Number(seasonDays(item))), 0) / filteredSeasons.length) : '-'}</strong>
          </div>
        </div>

        <div className="technician-ponds_charts-grid">
          <PondChartCard
            prefix="technician-ponds"
            title="Tiến độ nuôi theo ao"
            type="bar"
            data={pondsProgress}
          />
          <PondChartCard
            prefix="technician-ponds"
            title="Số mùa theo trạng thái"
            type="bar"
            data={seasonChartData}
          />
        </div>

        <div className="table-toolbar technician-ponds_toolbar">
          <div className="table-search">
            <span className="table-search-icon">⌕</span>
            <input
              type="text"
              placeholder="Tìm theo tên mùa vụ hoặc tên ao"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1) }}
            />
          </div>

          <select
            className="table-filter"
            value={shrimpFilter}
            onChange={(e) => { setShrimpFilter(e.target.value); setCurrentPage(1) }}
          >
            {shrimpTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            className="table-filter"
            value={stateFilter}
            onChange={(e) => { setStateFilter(e.target.value); setCurrentPage(1) }}
          >
            {seasonStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <input
            className="table-filter"
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1) }}
          />
        </div>
        <div className="table-wrapper">
          <table className="table-base">
            <thead>
              <tr>
                <th>Ao</th>
                <th>Tên mùa vụ</th>
                <th>Loại tôm</th>
                <th>Ngày thả</th>
                <th>Số ngày nuôi</th>
                <th>Mật độ</th>
                <th>Dự kiến Thu hoạch</th>
                <th>Trạng thái</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="9">Đang tải...</td></tr>
              ) : filteredSeasons.length === 0 ? (
                <tr><td colSpan="9">Không có dữ liệu phù hợp</td></tr>
              ) : (
                paginated.map((season) => {
                  const statusNorm = String(season.status || '').toUpperCase()
                  const canEdit = ['CHUAN_BI_NUOI','PLANNED','READY'].includes(statusNorm) && new Date(season.start_date) > new Date()
                  const canHarvest = ['DANG_NUOI','RUNNING','IN_PROGRESS'].includes(statusNorm)
                  const canViewHarvestSummary = ['COMPLETED','DA_THU_HOACH','FINISHED'].includes(statusNorm)
                  const canDelete = ['CHUAN_BI_NUOI','PLANNED','READY'].includes(statusNorm)

                  return (
                    <tr key={season.season_id}>
                      <td>{getPondName(season.pond_id)}</td>
                      <td>{season.season_name}</td>
                      <td>{season.shrimp_type}</td>
                      <td>{formatVietnameseDate(season.start_date)}</td>
                      <td>{seasonDays(season)}</td>
                      <td>{formatRoundedNumber(season.density)}</td>
                      <td>{formatVietnameseDate(season.expected_harvest)}</td>
                      <td>
                        <span className={seasonStatusClass(season.status)}>{statusLabel(season.status)}</span>
                      </td>
                      <td>
                        <div className="table-actions">
                          <button type="button" className="table-action-btn table-action-btn--view" title="Xem chi tiết" onClick={() => openDetailModal(season)}>ⓘ</button>
                          {canViewHarvestSummary && (
                            <button type="button" className="table-action-btn table-action-btn--role" title="Xem chi tiết tổng kết thu hoạch" onClick={() => openHarvestSummaryModal(season)}>🧾</button>
                          )}
                          {canHarvest && (
                            <button type="button" className="table-action-btn table-action-btn--role" title="Thu hoạch mùa vụ" onClick={() => openHarvestModal(season)}>✓</button>
                          )}
                          {canEdit && (
                            <button type="button" className="table-action-btn table-action-btn--unlock" title="Chỉnh sửa mùa vụ" onClick={() => openEditModal(season)}>✎</button>
                          )}
                          {canDelete && (
                            <button type="button" className="table-action-btn table-action-btn--lock" title="Xóa mùa vụ" onClick={() => handleDelete(season)}>🗑</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="table-pagination">
          <div className="table-pagination-left">
            <span>Số mục trên trang</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value) || 10)
                setCurrentPage(1)
              }}
            >
              {[5, 10, 20, 50].map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
            <span>{filteredSeasons.length === 0 ? 0 : startIndex + 1}-{endIndex} / {filteredSeasons.length}</span>
          </div>
          <div className="table-pagination-right">
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={safePage <= 1}
            >
              ‹
            </button>
            <span className="table-page-pill">{safePage}</span>
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={safePage >= totalPages}
            >
              ›
            </button>
          </div>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="modal" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content technician-seasons_modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="technician-seasons_modal-title">{selectedSeason?.season_id ? 'Chỉnh sửa mùa vụ' : 'Tạo mùa vụ mới'}</h3>
            <form onSubmit={handleCreateSubmit}>
              <div className="form-group">
                <label>Ao nuôi</label>
                <select className="input" value={createForm.pondId} onChange={(e) => handleCreateChange('pondId', e.target.value)} required>
                  <option value="">{selectedSeason?.season_id ? '-- Chọn ao nuôi --' : '-- Chọn ao (chỉ ao phân công và đủ điều kiện) --'}</option>
                  {(selectedSeason?.season_id ? editPondOptions : eligiblePonds).map((pond) => (
                    <option key={pond.pond_id} value={pond.pond_id}>
                      {pond.pond_code} - {pond.pond_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Tên mùa vụ</label>
                <input className="input" value={createForm.seasonName} onChange={(e) => handleCreateChange('seasonName', e.target.value)} placeholder="VD: Mùa 1/2024" required />
              </div>

              <div className="form-group">
                <label>Ngày thả (Start Date)</label>
                <input className="input" type="date" value={createForm.startDate} onChange={(e) => handleCreateChange('startDate', e.target.value)} required />
              </div>

              <div className="form-group">
                <label>Ngày dự kiến thu hoạch</label>
                <input className="input" type="date" value={createForm.expectedHarvestDate} onChange={(e) => handleCreateChange('expectedHarvestDate', e.target.value)} />
              </div>

              <div className="form-group">
                <label>Loại tôm</label>
                <input className="input" value={createForm.shrimpType} onChange={(e) => handleCreateChange('shrimpType', e.target.value)} placeholder="VD: Tôm sú, Tôm thẻ" required />
              </div>

              <div className="form-group">
                <label>Mật độ</label>
                <input className="input" type="number" step="0.01" value={createForm.density} onChange={(e) => handleCreateChange('density', e.target.value)} placeholder="Mật độ nuôi (con/m²)" required />
              </div>

              <div className="form-group">
                <label>Số lượng giống thả</label>
                <input className="input" type="number" step="1" value={createForm.seedQuantity} onChange={(e) => handleCreateChange('seedQuantity', e.target.value)} placeholder="Số lượng con giống" required />
              </div>

              <div className="form-group">
                <label>Ghi chú</label>
                <textarea className="input" value={createForm.note} onChange={(e) => handleCreateChange('note', e.target.value)} placeholder="Ghi chú (tùy chọn)" rows="3" />
              </div>

              <div className="technician-seasons_actions">
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  💾 {saving ? 'Đang lưu' : (selectedSeason?.season_id ? 'Lưu thay đổi' : 'Tạo mùa vụ')}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowCreateModal(false)
                    setSelectedSeason(null)
                    setCreateForm(emptyCreateForm)
                  }}
                >
                  ❌ Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Harvest Modal */}
      {showHarvestModal && selectedSeason && (
        <div className="modal" onClick={() => setShowHarvestModal(false)}>
          <div className="modal-content technician-seasons_modal technician-seasons_modal--harvest" onClick={(e) => e.stopPropagation()}>
            <h3 className="technician-seasons_modal-title">Thu hoạch mùa vụ</h3>
            <form onSubmit={handleHarvestSubmit}>
              <div className="technician-seasons_harvest-box">
                <p><strong>Ao:</strong> {getPondName(selectedSeason.pond_id)}</p>
                <p><strong>Mùa vụ:</strong> {selectedSeason.season_name}</p>
                <p><strong>Loại tôm:</strong> {selectedSeason.shrimp_type}</p>
                <p><strong>Ngày thả:</strong> {formatVietnameseDate(selectedSeason.start_date)}</p>
              </div>

              <div className="form-group">
                <label>Ngày Thu hoạch (Actual Harvest)</label>
                <input className="input" type="date" value={harvestForm.actualHarvestDate} onChange={(e) => handleHarvestChange('actualHarvestDate', e.target.value)} required />
              </div>

              <div className="form-group">
                <label>Sản lượng thu hoạch (kg)</label>
                <input className="input" type="number" step="0.01" value={harvestForm.harvestWeightKg} onChange={(e) => handleHarvestChange('harvestWeightKg', e.target.value)} placeholder="Số kg thu hoạch" required />
              </div>

              <div className="form-group">
                <label>Ghi chú</label>
                <textarea className="input" value={harvestForm.note} onChange={(e) => handleHarvestChange('note', e.target.value)} placeholder="Ghi chú về mùa vụ (tùy chọn)" rows="3"></textarea>
              </div>

              <div className="technician-seasons_actions">
                <button type="submit" className="btn btn-success" disabled={saving}>
                  🎯 {saving ? 'Đang lưu' : 'Thu hoạch'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowHarvestModal(false)}>
                  ❌ Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Detail Modal */}
      {showDetailModal && selectedSeason && (
        <div className="modal" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content technician-seasons_modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="technician-seasons_modal-title">Chi tiết mùa vụ</h3>
              <div className="technician-seasons_detail-grid">
              <div><strong>Mã mùa vụ:</strong> {selectedSeason.season_id}</div>
              <div><strong>Tên mùa vụ:</strong> {selectedSeason.season_name}</div>
              <div><strong>Ao nuôi:</strong> {selectedSeason.pond_name || getPondName(selectedSeason.pond_id)}</div>
              <div><strong>Loại tôm:</strong> {selectedSeason.shrimp_type}</div>
              <div><strong>Mật độ:</strong> {formatRoundedNumber(selectedSeason.density)}</div>
              <div><strong>Số lượng giống:</strong> {selectedSeason.quantity_seed ?? selectedSeason.seed_quantity ?? '-'}</div>
              <div><strong>Ngày bắt đầu:</strong> {formatVietnameseDate(selectedSeason.start_date)}</div>
              <div><strong>Ngày dự kiến thu hoạch:</strong> {formatVietnameseDate(selectedSeason.expected_harvest)}</div>
              <div><strong>Ngày thu hoạch thực tế:</strong> {formatVietnameseDate(selectedSeason.actual_harvest || selectedSeason.actual_harvest_date || selectedSeason.harvest_date)}</div>
              <div><strong>Số ngày nuôi hiện tại:</strong> {seasonDays(selectedSeason)}</div>
              <div><strong>Trạng thái:</strong> {statusLabel(selectedSeason.status)}</div>
              <div><strong>Kỹ sư phụ trách:</strong> {selectedSeason.technician_name || '-'}</div>
              <div style={{ gridColumn: '1 / -1' }}><strong>Ghi chú:</strong><p>{selectedSeason.note || '-'}</p></div>

            </div>
            <div style={{ marginTop: '1rem', textAlign: 'right' }}>
              <button className="btn btn-secondary" onClick={() => setShowDetailModal(false)}>Đóng</button>
            </div>
          </div>
        </div>
      )}

      {showHarvestSummaryModal && selectedSeason && (
        <div className="modal" onClick={() => setShowHarvestSummaryModal(false)}>
          <div className="modal-content technician-seasons_modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="technician-seasons_modal-title">Tổng kết thu hoạch</h3>
            <div className="technician-seasons_detail-grid">
              <div><strong>Mã mùa vụ:</strong> {selectedSeason.season_id}</div>
              <div><strong>Tên mùa vụ:</strong> {selectedSeason.season_name}</div>
              <div><strong>Ao nuôi:</strong> {selectedSeason.pond_name || getPondName(selectedSeason.pond_id)}</div>
              <div><strong>Loại tôm:</strong> {selectedSeason.shrimp_type}</div>
              <div><strong>Ngày bắt đầu:</strong> {formatVietnameseDate(selectedSeason.start_date)}</div>
              <div><strong>Ngày thu hoạch:</strong> {formatVietnameseDate(selectedSeason.actual_harvest || selectedSeason.actual_harvest_date || selectedSeason.harvest_date)}</div>
              <div><strong>Sản lượng thực tế (kg):</strong> {selectedSeason.harvest_weight_kg ?? selectedSeason.harvest_weight ?? '-'}</div>
              <div><strong>Tổng thời gian nuôi:</strong> {selectedSeason.total_days || seasonDays(selectedSeason)} ngày</div>
              <div style={{ gridColumn: '1 / -1' }}><strong>Ghi chú thu hoạch:</strong><p>{selectedSeason.harvest_note ?? selectedSeason.note ?? '-'}</p></div>
            </div>
            <div style={{ marginTop: '1rem', textAlign: 'right' }}>
              <button className="btn btn-secondary" onClick={() => setShowHarvestSummaryModal(false)}>Đóng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TechnicianSeasons


