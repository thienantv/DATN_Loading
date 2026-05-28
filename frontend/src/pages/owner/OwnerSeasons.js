import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { seasonService, pondService } from '../../services/api'
import { showToast } from '../../utils/toast'
import PondChartCard from '../../components/charts/PondChartCard'
import '../../styles/owner/owner-seasons.css'

const formatRoundedNumber = (value) => {
  if (value === null || value === undefined || value === '') return '-'
  const numberValue = Number(value)
  if (Number.isNaN(numberValue)) return value
  return String(Math.round(numberValue))
}

const seasonDays = (season) => {
  if (!season?.start_date) return '-'
  const start = new Date(season.start_date)
  const now = new Date()
  const diff = Math.floor((now - start) / 86400000)
  return diff >= 0 ? diff : 0
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

const normalizeText = (s) => String(s || '').toLowerCase()
const normalizeUpper = (s) => String(s || '').toUpperCase()

const OwnerSeasons = () => {
  const [seasons, setSeasons] = useState([])
  const [ponds, setPonds] = useState([])
  const [loading, setLoading] = useState(true)

  // Filters / pagination
  const [searchTerm, setSearchTerm] = useState('')
  const [stateFilter, setStateFilter] = useState('ALL')
  const [shrimpFilter, setShrimpFilter] = useState('ALL')
  const [technicianFilter, setTechnicianFilter] = useState('ALL')
  const [dateFrom, setDateFrom] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  useEffect(() => {
    fetchData()
  }, [])

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

  const technicianOptions = useMemo(() => {
    const unique = Array.from(new Set(seasons.map((s) => (s.technician_name || s.technician || '').trim()).filter(Boolean)))
    return [{ value: 'ALL', label: 'Tất cả kỹ sư' }, ...unique.map((t) => ({ value: t, label: t }))]
  }, [seasons])

  const normalizeSeasonStatus = (status) => {
    const s = normalizeUpper(status)
    if (['CHUAN_BI_NUOI', 'PLANNED', 'READY'].includes(s)) return 'CHUAN_BI_NUOI'
    if (['DANG_NUOI', 'RUNNING', 'IN_PROGRESS'].includes(s)) return 'DANG_NUOI'
    if (['COMPLETED', 'DA_THU_HOACH', 'FINISHED'].includes(s)) return 'COMPLETED'
    return s
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
    if (s === 'DANG_NUOI' || s === 'RUNNING' || s === 'IN_PROGRESS') return 'owner-seasons_status owner-seasons_status--farming'
    if (s === 'CHUAN_BI_NUOI' || s === 'PLANNED' || s === 'READY') return 'owner-seasons_status owner-seasons_status--paused'
    if (s === 'COMPLETED' || s === 'DA_THU_HOACH' || s === 'FINISHED') return 'owner-seasons_status owner-seasons_status--renovating'
    return 'owner-seasons_status'
  }

  const toDateOnly = (v) => {
    if (!v) return null
    const d = new Date(v)
    if (Number.isNaN(d.getTime())) return null
    return new Date(d.getFullYear(), d.getMonth(), d.getDate())
  }

  // derived filtered seasons (exact date match by start_date, similar to Technician)
  const filteredSeasons = seasons.filter((s) => {
    const matchSearch = !searchTerm || normalizeText(s.season_name).includes(normalizeText(searchTerm)) || normalizeText(getPondName(s.pond_id)).includes(normalizeText(searchTerm))
    const matchState = stateFilter === 'ALL' || normalizeSeasonStatus(s.status) === stateFilter
    const matchShrimp = shrimpFilter === 'ALL' || normalizeText(s.shrimp_type) === normalizeText(shrimpFilter)
    const matchTech = technicianFilter === 'ALL' || normalizeText(s.technician_name || s.technician || '').includes(normalizeText(technicianFilter))
    const from = dateFrom ? toDateOnly(new Date(dateFrom)) : null
    const startD = s.start_date ? toDateOnly(new Date(s.start_date)) : null
    const matchDateExact = !from || (startD && startD.getTime() === from.getTime())
    return matchSearch && matchState && matchShrimp && matchTech && matchDateExact
  })

  const totalPages = Math.max(1, Math.ceil(filteredSeasons.length / pageSize))
  const safePage = Math.min(currentPage, totalPages)
  const paginated = filteredSeasons.slice((safePage - 1) * pageSize, safePage * pageSize)

  // stats and charts
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

  const runningSeasons = seasons.filter((s) => ['DANG_NUOI','RUNNING','IN_PROGRESS'].includes(normalizeUpper(s.status)))
  const pondsProgress = runningSeasons.map((s, idx) => {
    const start = s.start_date ? new Date(s.start_date) : new Date()
    const days = Math.max(0, Math.floor((new Date() - start) / 86400000))
    const colorPalette = ['#3b82f6', '#06b6d4', '#7c3aed', '#ef4444', '#f59e0b', '#10b981']
    return { label: getPondName(s.pond_id), value: days, color: colorPalette[idx % colorPalette.length] }
  })

  const [selectedSeason, setSelectedSeason] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showHarvestSummaryModal, setShowHarvestSummaryModal] = useState(false)

  const fetchAndSelectSeason = async (season) => {
    setSelectedSeason(season)
    try {
      const res = await seasonService.getSeasonById(season.season_id)
      const detail = res?.data?.data
      if (detail) setSelectedSeason(detail)
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

  return (
    <div className="dashboard admin-page owner-seasons_page">
      <div className="table-container table-panel">
        <div className="table-header table-header">
          <div>
            <h2>Quản lý mùa vụ nuôi</h2>
            <p className="table-subtitle">Xem và lọc mùa vụ; chỉ có quyền xem</p>
          </div>
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
          <div className="stats-card stats-card--neutral">
            <span className="stats-card-label">Số ngày nuôi trung bình</span>
            <strong className="stats-card-value">{filteredSeasons.length > 0 ? String(Math.round(filteredSeasons.reduce((sum, item) => sum + (item.start_date ? Math.max(0, Math.floor((new Date() - new Date(item.start_date)) / 86400000)) : 0), 0) / filteredSeasons.length)) : '-'}</strong>
          </div>
        </div>

        <div className="owner-seasons_charts-grid">
          <PondChartCard prefix="owner-seasons" title="Tiến độ nuôi theo ao" type="bar" data={pondsProgress} />
          <PondChartCard prefix="owner-seasons" title="Số mùa theo trạng thái" type="bar" data={seasonChartData} />
        </div>
        <div className="table-toolbar owner-seasons_toolbar">
          <div className="table-search">
            <span className="table-search-icon">⌕</span>
            <input
              type="text"
              placeholder="Tìm theo tên mùa vụ hoặc tên ao"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setCurrentPage(1)
              }}
            />
          </div>

          <select className="table-filter" value={shrimpFilter} onChange={(e) => { setShrimpFilter(e.target.value); setCurrentPage(1) }}>
            {shrimpTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>

          <select className="table-filter" value={stateFilter} onChange={(e) => { setStateFilter(e.target.value); setCurrentPage(1) }}>
            {seasonStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>

          <input
            className="table-filter"
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1) }}
          />
        </div>

        <div className="table-scroll">
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
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="9">Đang tải...</td></tr>
              ) : filteredSeasons.length === 0 ? (
                <tr><td colSpan="9">Không có dữ liệu phù hợp</td></tr>
              ) : (
                paginated.map((season) => (
                  <tr key={season.season_id}>
                    <td>{getPondName(season.pond_id)}</td>
                    <td>{season.season_name}</td>
                    <td>{season.shrimp_type || '-'}</td>
                    <td>{formatVietnameseDate(season.start_date)}</td>
                    <td>{seasonDays(season)}</td>
                    <td>{formatRoundedNumber(season.density)}</td>
                    <td>{formatVietnameseDate(season.expected_harvest)}</td>
                    <td><span className={seasonStatusClass(season.status)}>{statusLabel(season.status)}</span></td>
                    <td>
                      <div className="table-actions">
                        <button type="button" className="table-action-btn table-action-btn--view" title="Xem chi tiết" onClick={() => openDetailModal(season)}>ⓘ</button>
                        {season.actual_harvest && (
                          <button type="button" className="table-action-btn table-action-btn--role" title="Tổng kết thu hoạch" onClick={() => openHarvestSummaryModal(season)}>🧾</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
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
            <span>{filteredSeasons.length === 0 ? 0 : ( (currentPage-1)*pageSize + 1)}-{Math.min(currentPage*pageSize, filteredSeasons.length)} / {filteredSeasons.length}</span>
          </div>
          <div className="table-pagination-right">
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage <= 1}
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

      {showDetailModal && selectedSeason && (
        <div className="modal" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content owner-seasons_modal" onClick={(e) => e.stopPropagation()}>
            <h3>Chi tiết mùa vụ</h3>
              <div className="owner-seasons_detail-grid">
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
          <div className="modal-content owner-seasons_modal" onClick={(e) => e.stopPropagation()}>
            <h3>Tổng kết thu hoạch</h3>
            <div className="owner-seasons_detail-grid">
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

export default OwnerSeasons

