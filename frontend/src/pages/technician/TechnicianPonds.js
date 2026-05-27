import React, { useEffect, useMemo, useState } from 'react'
import { pondService } from '../../services/api'
import { showToast } from '../../utils/toast'
import PondChartCard from '../../components/charts/PondChartCard'
import { useAuth } from '../../context/AuthContext'
import '../../styles/technician/technician-ponds.css'

const POND_STATUS_OPTIONS = [
  { value: 'ALL', label: 'Tất cả trạng thái ao' },
  { value: 'CHUAN_BI_NUOI', label: 'Chuẩn bị nuôi' },
  { value: 'TAM_NGUNG', label: 'Tạm ngưng' },
  { value: 'DANG_NUOI', label: 'Đang nuôi' },
  { value: 'DANG_CAI_TAO', label: 'Đang cải tạo' },
]

const USAGE_STATUS_OPTIONS = [
  { value: 'ALL', label: 'Tất cả trạng thái sử dụng' },
  { value: 'HOAT_DONG', label: 'Hoạt động' },
  { value: 'NGUNG_SU_DUNG', label: 'Ngưng sử dụng' },
]

const CHART_COLORS = ['#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#a855f7', '#14b8a6']

const normalizeUpper = (value) => String(value || '').trim().toUpperCase()

const formatRoundedNumber = (value) => {
  if (value === null || value === undefined || value === '') return '-'
  const numberValue = Number(value)
  if (Number.isNaN(numberValue)) return value
  return String(Math.round(numberValue))
}

const formatDateTime = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('vi-VN')
}

const getPondStatusLabel = (status) => {
  switch (normalizeUpper(status)) {
    case 'CHUAN_BI_NUOI':
      return 'Chuẩn bị nuôi'
    case 'DANG_NUOI':
      return 'Đang nuôi'
    case 'DANG_CAI_TAO':
      return 'Đang cải tạo'
    case 'TAM_NGUNG':
      return 'Tạm ngưng'
    default:
      return status || '-'
  }
}

const getUsageStatusLabel = (status) => {
  switch (normalizeUpper(status)) {
    case 'HOAT_DONG':
      return 'Hoạt động'
    case 'NGUNG_SU_DUNG':
      return 'Ngưng sử dụng'
    default:
      return status || '-'
  }
}

const getPondStatusClass = (status) => {
  switch (normalizeUpper(status)) {
    case 'CHUAN_BI_NUOI':
      return 'technician-ponds_status technician-ponds_status--paused'
    case 'DANG_NUOI':
      return 'technician-ponds_status technician-ponds_status--farming'
    case 'DANG_CAI_TAO':
      return 'technician-ponds_status technician-ponds_status--renovating'
    case 'TAM_NGUNG':
      return 'technician-ponds_status technician-ponds_status--paused'
    default:
      return 'technician-ponds_status'
  }
}

const getUsageStatusClass = (status) => {
  if (normalizeUpper(status) === 'HOAT_DONG') {
    return 'status-badge status-active'
  }
  return 'status-badge status-inactive'
}

const sortPondsOldestFirst = (a, b) => {
  const ta = new Date(a?.created_at || 0).getTime()
  const tb = new Date(b?.created_at || 0).getTime()
  if (ta !== tb) return ta - tb
  return Number(a?.pond_id || 0) - Number(b?.pond_id || 0)
}

const TechnicianPonds = () => {
  const { user } = useAuth()
  const [ponds, setPonds] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [usageFilter, setUsageFilter] = useState('ALL')
  const [pageSize, setPageSize] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedPond, setSelectedPond] = useState(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const response = await pondService.getAllPonds()
      setPonds(response?.data?.data || [])
    } catch (err) {
      showToast({ title: err?.response?.data?.message || 'Không tải được dữ liệu ao', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const sortedPonds = useMemo(() => [...ponds].sort(sortPondsOldestFirst), [ponds])

  const filteredPonds = useMemo(() => {
    const normalizedSearch = String(searchTerm || '').trim().toLowerCase()
    return sortedPonds.filter((pond) => {
      const matchSearch = !normalizedSearch || String(pond.pond_name || '').toLowerCase().includes(normalizedSearch)
      const matchStatus = statusFilter === 'ALL' || normalizeUpper(pond.status) === statusFilter
      const matchUsage = usageFilter === 'ALL' || normalizeUpper(pond.usage_status) === usageFilter
      return matchSearch && matchStatus && matchUsage
    })
  }, [sortedPonds, searchTerm, statusFilter, usageFilter])

  const summary = useMemo(() => {
    const initial = {
      total: 0,
      chuanBiNuoi: 0,
      tamNgung: 0,
      dangNuoi: 0,
      dangCaiTao: 0,
      hoatDong: 0,
      ngungSuDung: 0,
    }

    for (const pond of ponds) {
      initial.total += 1
      const status = normalizeUpper(pond.status)
      const usageStatus = normalizeUpper(pond.usage_status)
      if (status === 'TAM_NGUNG') initial.tamNgung += 1
      if (status === 'CHUAN_BI_NUOI') initial.chuanBiNuoi += 1
      if (status === 'DANG_NUOI') initial.dangNuoi += 1
      if (status === 'DANG_CAI_TAO') initial.dangCaiTao += 1
      if (usageStatus === 'HOAT_DONG') initial.hoatDong += 1
      if (usageStatus === 'NGUNG_SU_DUNG') initial.ngungSuDung += 1
    }

    return initial
  }, [ponds])

  const usageStatusChartData = useMemo(
    () => [
      { label: 'Hoạt động', value: summary.hoatDong, color: '#14b8a6' },
      { label: 'Ngưng sử dụng', value: summary.ngungSuDung, color: '#ef4444' },
    ],
    [summary]
  )
  const usageStatusTotal = useMemo(() => usageStatusChartData.reduce((acc, item) => acc + item.value, 0), [usageStatusChartData])

  const statusCounts = useMemo(
    () => [
      { label: 'Đang nuôi', key: 'DANG_NUOI', count: summary.dangNuoi },
      { label: 'Chuẩn bị nuôi', key: 'CHUAN_BI_NUOI', count: summary.chuanBiNuoi },
      { label: 'Đang cải tạo', key: 'DANG_CAI_TAO', count: summary.dangCaiTao },
      { label: 'Tạm ngưng', key: 'TAM_NGUNG', count: summary.tamNgung },
    ],
    [summary]
  )

  const totalPages = Math.max(1, Math.ceil(filteredPonds.length / pageSize))
  const safePage = Math.min(currentPage, totalPages)
  const startIndex = (safePage - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, filteredPonds.length)
  const paginatedPonds = filteredPonds.slice(startIndex, endIndex)

  const canConfirmRenovation = (pond) => {
    if (!pond) return false
    if (normalizeUpper(pond.status) !== 'DANG_CAI_TAO') return false
    if (normalizeUpper(pond.usage_status) === 'NGUNG_SU_DUNG') return false
    if (Number(pond.assigned_staff) !== Number(user?.user_id)) return false
    if (pond.renovation_completed_at) return false
    return true
  }

  const handleConfirmRenovation = async (pond) => {
    if (!window.confirm(`Xác nhận hoàn tất cải tạo cho ao ${pond.pond_name}?`)) return

    try {
      await pondService.completeRenovation(pond.pond_id)
      showToast({ title: 'Xác nhận hoàn tất cải tạo thành công', type: 'success' })
      await fetchData()
    } catch (err) {
      showToast({ title: err?.response?.data?.message || 'Không thể xác nhận hoàn tất cải tạo', type: 'error' })
    }
  }

  if (loading) {
    return (
      <div className="dashboard admin-page">
        <div className="flex-center admin-users_loading-container">
          <div className="spinner" />
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard admin-page technician-ponds">
      <div className="table-container admin-users_panel">
        <div className="table-header admin-users_table-header">
          <div>
            <h2>Quản lý ao nuôi</h2>
            <p className="admin-users_subtitle">Danh sách ao bạn được phân công quản lý</p>
          </div>
        </div>

        <div className="technician-ponds_stats-grid">
          <div className="technician-ponds_stat-card technician-ponds_stat-card--total">
            <span>Tổng ao phụ trách</span>
            <strong>{summary.total}</strong>
          </div>
          <div className="technician-ponds_stat-card technician-ponds_stat-card--farming">
            <span>Ao đang nuôi</span>
            <strong>{summary.dangNuoi}</strong>
          </div>
          <div className="technician-ponds_stat-card technician-ponds_stat-card--paused">
            <span>Ao chuẩn bị nuôi</span>
            <strong>{summary.chuanBiNuoi}</strong>
          </div>
          <div className="technician-ponds_stat-card technician-ponds_stat-card--renovating">
            <span>Ao đang cải tạo</span>
            <strong>{summary.dangCaiTao}</strong>
          </div>
        </div>

        <div className="technician-ponds_charts-grid">
          <PondChartCard
            prefix="technician-ponds"
            title="Phân bố trạng thái sử dụng"
            type="doughnut"
            data={usageStatusChartData}
            total={usageStatusTotal}
          />
          <PondChartCard
            prefix="technician-ponds"
            title="Số ao theo trạng thái"
            type="bar"
            data={statusCounts.map((item, index) => ({
              label: item.label,
              value: item.count,
              color: CHART_COLORS[index % CHART_COLORS.length],
            }))}
          />
        </div>

        <div className="admin-users_toolbar technician-ponds_toolbar">
          <div className="admin-users_search-wrap">
            <span className="admin-users_search-icon">⌕</span>
            <input
              type="text"
              value={searchTerm}
              placeholder="Tìm theo tên ao..."
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setCurrentPage(1)
              }}
            />
          </div>

          <select
            className="admin-users_filter-select"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              setCurrentPage(1)
            }}
          >
            {POND_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            className="admin-users_filter-select"
            value={usageFilter}
            onChange={(e) => {
              setUsageFilter(e.target.value)
              setCurrentPage(1)
            }}
          >
            {USAGE_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="table-wrapper">
          <table className="admin-users_table">
            <thead>
              <tr>
                <th>Tên ao</th>
                <th>Diện tích (m²)</th>
                <th>Độ sâu (m)</th>
                <th>Trạng thái ao</th>
                <th>Trạng thái sử dụng</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {paginatedPonds.length === 0 ? (
                <tr>
                  <td className="admin-users_empty-row" colSpan="6">
                    Không có dữ liệu ao phù hợp bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                paginatedPonds.map((pond) => (
                  <tr key={pond.pond_id}>
                    <td>
                      <div className="technician-ponds_name-block">
                        <strong>{pond.pond_name}</strong>
                        <span>{pond.pond_code}</span>
                      </div>
                    </td>
                    <td>{formatRoundedNumber(pond.area_m2)}</td>
                    <td>{formatRoundedNumber(pond.depth_m)}</td>
                    <td><span className={getPondStatusClass(pond.status)}>{getPondStatusLabel(pond.status)}</span></td>
                    <td><span className={getUsageStatusClass(pond.usage_status)}>{getUsageStatusLabel(pond.usage_status)}</span></td>
                    <td>
                      <div className="admin-users_table-actions">
                        <button type="button" className="admin-users_action-btn admin-users_action-btn--view" title="Xem chi tiết" onClick={() => setSelectedPond(pond)}>ⓘ</button>
                        {canConfirmRenovation(pond) && (
                          <button type="button" className="admin-users_action-btn admin-users_action-btn--role" title="Xác nhận hoàn tất cải tạo" onClick={() => handleConfirmRenovation(pond)}>✓</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="admin-users_pagination">
          <div className="admin-users_pagination-left">
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
            <span>{filteredPonds.length === 0 ? 0 : startIndex + 1}-{endIndex} / {filteredPonds.length}</span>
          </div>
          <div className="admin-users_pagination-right">
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={safePage <= 1}
            >
              ‹
            </button>
            <span className="admin-users_page-pill">{safePage}</span>
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

      {selectedPond && (
        <div className="modal" onClick={() => setSelectedPond(null)}>
          <div className="modal-content admin-users_modal admin-users_modal--detail" onClick={(e) => e.stopPropagation()}>
            <h3>Chi tiết ao nuôi</h3>
            <div className="admin-users_detail-grid">
              <div className="admin-users_detail-card">
                <span className="admin-users_detail-label">Mã ao</span>
                <strong>{selectedPond.pond_code || '-'}</strong>
              </div>
              <div className="admin-users_detail-card">
                <span className="admin-users_detail-label">Tên ao</span>
                <strong>{selectedPond.pond_name || '-'}</strong>
              </div>
              <div className="admin-users_detail-card">
                <span className="admin-users_detail-label">Diện tích</span>
                <strong>{formatRoundedNumber(selectedPond.area_m2)} m²</strong>
              </div>
              <div className="admin-users_detail-card">
                <span className="admin-users_detail-label">Độ sâu</span>
                <strong>{formatRoundedNumber(selectedPond.depth_m)} m</strong>
              </div>
              <div className="admin-users_detail-card">
                <span className="admin-users_detail-label">Trạng thái ao</span>
                <strong>{getPondStatusLabel(selectedPond.status)}</strong>
              </div>
              <div className="admin-users_detail-card">
                <span className="admin-users_detail-label">Trạng thái sử dụng</span>
                <strong>{getUsageStatusLabel(selectedPond.usage_status)}</strong>
              </div>
              <div className="admin-users_detail-card">
                <span className="admin-users_detail-label">Kỹ sư phụ trách</span>
                <strong>{selectedPond.technician_name || '-'}</strong>
              </div>
              <div className="admin-users_detail-card">
                <span className="admin-users_detail-label">Ngày tạo ao</span>
                <strong>{formatDateTime(selectedPond.created_at)}</strong>
              </div>
              <div className="admin-users_detail-card">
                <span className="admin-users_detail-label">Bắt đầu cải tạo gần nhất</span>
                <strong>{formatDateTime(selectedPond.renovation_started_at)}</strong>
              </div>
              <div className="admin-users_detail-card">
                <span className="admin-users_detail-label">Hoàn tất cải tạo gần nhất</span>
                <strong>{formatDateTime(selectedPond.renovation_completed_at)}</strong>
              </div>
            </div>

            <div className="admin-users_modal-buttons admin-users_form-buttons">
              <button type="button" className="btn btn-secondary" onClick={() => setSelectedPond(null)}>Đóng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TechnicianPonds
