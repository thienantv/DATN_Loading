import React, { useEffect, useMemo, useState } from 'react'
import { pondService } from '../../services/api'
import { showToast } from '../../utils/toast'
import PondChartCard from '../../components/charts/PondChartCard'
import '../../styles/dashboard.css'
import '../../styles/owner/owner-manage-staff.css'
import '../../styles/owner/owner-ponds.css'
import '../../styles/admin-layout.css'

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

const DEFAULT_PAGE_SIZE = 10

const emptyCreateForm = {
  pondName: '',
  area_m2: '',
  depth_m: '',
  assigned_staff: '',
}

const emptyEditForm = {
  pondName: '',
  area_m2: '',
  depth_m: '',
  assigned_staff: '',
  usage_status: 'HOAT_DONG',
}

const normalizeUpper = (value) => String(value || '').trim().toUpperCase()
const normalizeText = (value) => String(value || '').trim().toLowerCase()
const CHART_COLORS = ['#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#a855f7', '#14b8a6']

const sortPondsOldestFirst = (a, b) => {
  const ta = new Date(a?.created_at || 0).getTime()
  const tb = new Date(b?.created_at || 0).getTime()
  if (ta !== tb) return ta - tb
  return Number(a?.pond_id || 0) - Number(b?.pond_id || 0)
}

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
      return 'owner-ponds_status owner-ponds_status--paused'
    case 'DANG_NUOI':
      return 'owner-ponds_status owner-ponds_status--farming'
    case 'DANG_CAI_TAO':
      return 'owner-ponds_status owner-ponds_status--renovating'
    case 'TAM_NGUNG':
      return 'owner-ponds_status owner-ponds_status--paused'
    default:
      return 'owner-ponds_status'
  }
}

const getUsageStatusClass = (status) => {
  if (normalizeUpper(status) === 'HOAT_DONG') {
    return 'status-badge status-active'
  }
  return 'status-badge status-inactive'
}

const OwnerPonds = () => {
  const [ponds, setPonds] = useState([])
  const [technicians, setTechnicians] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [usageFilter, setUsageFilter] = useState('ALL')
  const [technicianFilter, setTechnicianFilter] = useState('ALL')
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [currentPage, setCurrentPage] = useState(1)

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showAssignmentModal, setShowAssignmentModal] = useState(false)

  const [selectedPond, setSelectedPond] = useState(null)
  const [createForm, setCreateForm] = useState(emptyCreateForm)
  const [editForm, setEditForm] = useState(emptyEditForm)
  const [busyAssignmentKey, setBusyAssignmentKey] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [pondRes, matrixRes] = await Promise.all([
        pondService.getAllPonds(),
        pondService.getAssignmentMatrix(),
      ])

      setPonds(pondRes?.data?.data || [])
      const matrix = matrixRes?.data?.data || {}
      setTechnicians(matrix.technicians || [])
    } catch (err) {
      showToast({ title: err?.response?.data?.message || 'Không tải được dữ liệu ao nuôi', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const technicianOptions = useMemo(
    () =>
      technicians.map((tech) => ({
        id: tech.user_id,
        name: tech.full_name || tech.username,
        isActive: Boolean(tech.status),
      })),
    [technicians]
  )

  const getTechnicianName = (id) => {
    if (!id) return '-'
    const found = technicianOptions.find((s) => String(s.id) === String(id))
    return found ? found.name : '-'
  }

  const summary = useMemo(() => {
    const initial = {
      total: ponds.length,
      chuanBiNuoi: 0,
      tamNgung: 0,
      dangNuoi: 0,
      dangCaiTao: 0,
      hoatDong: 0,
      ngungSuDung: 0,
    }

    for (const pond of ponds) {
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

  const sortedPonds = useMemo(() => {
    return [...ponds].sort(sortPondsOldestFirst)
  }, [ponds])

  const filteredPonds = useMemo(() => {
    const normalizedSearch = normalizeText(searchTerm)
    return sortedPonds.filter((pond) => {
      const matchSearch = !normalizedSearch || normalizeText(pond.pond_name).includes(normalizedSearch)
      const matchStatus = statusFilter === 'ALL' || normalizeUpper(pond.status) === statusFilter
      const matchUsage = usageFilter === 'ALL' || normalizeUpper(pond.usage_status) === usageFilter
      const matchTechnician = technicianFilter === 'ALL' || String(pond.assigned_staff || '') === String(technicianFilter)
      return matchSearch && matchStatus && matchUsage && matchTechnician
    })
  }, [sortedPonds, searchTerm, statusFilter, usageFilter, technicianFilter])

  const pondStatusChartData = useMemo(
    () => [
      { label: 'Đang nuôi', value: summary.dangNuoi, color: '#22c55e' },
      { label: 'Chuẩn bị nuôi', value: summary.chuanBiNuoi, color: '#a855f7' },
      { label: 'Đang cải tạo', value: summary.dangCaiTao, color: '#f59e0b' },
      { label: 'Tạm ngưng', value: summary.tamNgung, color: '#0ea5e9' },
    ],
    [summary]
  )

  const pondStatusTotal = useMemo(
    () => pondStatusChartData.reduce((acc, item) => acc + item.value, 0),
    [pondStatusChartData]
  )

  const usageStatusChartData = useMemo(
    () => [
      { label: 'Hoạt động', value: summary.hoatDong, color: '#14b8a6' },
      { label: 'Ngưng sử dụng', value: summary.ngungSuDung, color: '#ef4444' },
    ],
    [summary]
  )

  const usageStatusTotal = useMemo(
    () => usageStatusChartData.reduce((acc, item) => acc + item.value, 0),
    [usageStatusChartData]
  )

  const technicianWorkload = useMemo(() => {
    const loadMap = new Map()
    for (const tech of technicianOptions) {
      loadMap.set(String(tech.id), { id: tech.id, name: tech.name, count: 0 })
    }

    for (const pond of ponds) {
      const key = String(pond.assigned_staff || '')
      if (!key || !loadMap.has(key)) continue
      loadMap.get(key).count += 1
    }

    return Array.from(loadMap.values())
      .sort((a, b) => b.count - a.count || String(a.name).localeCompare(String(b.name)))
      .slice(0, 6)
  }, [ponds, technicianOptions])

  const totalPages = Math.max(1, Math.ceil(filteredPonds.length / pageSize))
  const safePage = Math.min(currentPage, totalPages)
  const startIndex = (safePage - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, filteredPonds.length)
  const paginatedPonds = filteredPonds.slice(startIndex, endIndex)

  const resetToFirstPage = () => setCurrentPage(1)

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const openCreateModal = () => {
    setCreateForm(emptyCreateForm)
    setShowCreateModal(true)
  }

  const openEditModal = (pond) => {
    setSelectedPond(pond)
    setEditForm({
      pondName: pond.pond_name || '',
      area_m2: pond.area_m2 ?? '',
      depth_m: pond.depth_m ?? '',
      assigned_staff: pond.assigned_staff || '',
      usage_status: normalizeUpper(pond.usage_status || 'HOAT_DONG'),
    })
    setShowEditModal(true)
  }

  const openDetailModal = async (pond) => {
    setSelectedPond(pond)
    setShowDetailModal(true)
    try {
      const response = await pondService.getPondById(pond.pond_id)
      const latest = response?.data?.data
      if (latest) {
        setSelectedPond(latest)
      }
    } catch (err) {
      showToast({ title: err?.response?.data?.message || 'Không tải được chi tiết ao', type: 'error' })
    }
  }

  const handleCreateChange = (field, value) => {
    setCreateForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleEditChange = (field, value) => {
    setEditForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleCreateSubmit = async (event) => {
    event.preventDefault()
    if (!String(createForm.pondName || '').trim()) {
      showToast({ title: 'Tên ao không được để trống', type: 'error' })
      return
    }
    if (!(Number(createForm.area_m2) > 0) || !(Number(createForm.depth_m) > 0)) {
      showToast({ title: 'Diện tích và độ sâu phải lớn hơn 0', type: 'error' })
      return
    }

    try {
      setSaving(true)
      const payload = {
        pondName: String(createForm.pondName || '').trim(),
        areaMeter: Number(createForm.area_m2),
        depthMeter: Number(createForm.depth_m),
        assignedStaff: createForm.assigned_staff ? Number(createForm.assigned_staff) : null,
      }
      await pondService.createPond(payload)
      showToast({ title: 'Tạo ao nuôi thành công', type: 'success' })
      setShowCreateModal(false)
      setCreateForm(emptyCreateForm)
      await fetchData()
    } catch (err) {
      showToast({ title: err?.response?.data?.message || 'Lỗi khi tạo ao nuôi', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleEditSubmit = async (event) => {
    event.preventDefault()
    if (!selectedPond) return

    if (!String(editForm.pondName || '').trim()) {
      showToast({ title: 'Tên ao không được để trống', type: 'error' })
      return
    }
    if (!(Number(editForm.area_m2) > 0) || !(Number(editForm.depth_m) > 0)) {
      showToast({ title: 'Diện tích và độ sâu phải lớn hơn 0', type: 'error' })
      return
    }

    try {
      setSaving(true)
      await pondService.updatePond(selectedPond.pond_id, {
        pondName: String(editForm.pondName || '').trim(),
        areaMeter: Number(editForm.area_m2),
        depthMeter: Number(editForm.depth_m),
        assignedStaff: editForm.assigned_staff ? Number(editForm.assigned_staff) : null,
      })

      if (normalizeUpper(selectedPond.usage_status) !== normalizeUpper(editForm.usage_status)) {
        await pondService.updateUsageStatus(selectedPond.pond_id, editForm.usage_status)
      }

      showToast({ title: 'Cập nhật ao nuôi thành công', type: 'success' })
      setShowEditModal(false)
      setSelectedPond(null)
      await fetchData()
    } catch (err) {
      showToast({ title: err?.response?.data?.message || 'Lỗi khi cập nhật ao nuôi', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (pondId) => {
    if (!window.confirm('Bạn chắc chắn muốn xóa ao nuôi này?')) return
    try {
      await pondService.deletePond(pondId)
      showToast({ title: 'Xóa ao nuôi thành công', type: 'success' })
      await fetchData()
    } catch (err) {
      showToast({ title: err?.response?.data?.message || 'Lỗi khi xóa ao nuôi', type: 'error' })
    }
  }

  const handleToggleUsage = async (pond) => {
    const current = normalizeUpper(pond.usage_status)
    const next = current === 'HOAT_DONG' ? 'NGUNG_SU_DUNG' : 'HOAT_DONG'
    const message =
      next === 'NGUNG_SU_DUNG'
        ? `Bạn có chắc muốn chuyển ao ${pond.pond_name} sang Ngưng sử dụng?`
        : `Bạn có chắc muốn mở lại ao ${pond.pond_name} về Hoạt động?`
    if (!window.confirm(message)) return

    try {
      await pondService.updateUsageStatus(pond.pond_id, next)
      showToast({ title: 'Cập nhật trạng thái sử dụng thành công', type: 'success' })
      await fetchData()
    } catch (err) {
      showToast({ title: err?.response?.data?.message || 'Không cập nhật được trạng thái sử dụng', type: 'error' })
    }
  }

  const handleAssignmentChange = async (pond, technicianId, checked) => {
    const key = `${pond.pond_id}:${technicianId || 'none'}`
    try {
      setBusyAssignmentKey(key)
      await pondService.updateAssignment(pond.pond_id, checked ? technicianId : null)
      await fetchData()
      showToast({ title: 'Cập nhật phân công thành công', type: 'success' })
    } catch (err) {
      showToast({ title: err?.response?.data?.message || 'Không cập nhật được phân công', type: 'error' })
    } finally {
      setBusyAssignmentKey('')
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
    <div className="dashboard admin-page owner-ponds">
      <div className="table-container admin-users_panel">
        <div className="table-header admin-users_table-header">
          <div>
            <h2>Quản lý ao nuôi</h2>
            <p className="admin-users_subtitle">
              Quản lý thông tin ao nuôi, trạng thái vận hành và phân công kỹ sư phụ trách
            </p>
          </div>
          <div className="owner-ponds_header-actions">
            <button type="button" className="btn btn-primary" onClick={openCreateModal}>＋ Thêm ao</button>
            <button type="button" className="btn btn-primary" onClick={() => setShowAssignmentModal(true)}>＋ Phân công phụ trách</button>
          </div>
        </div>

        <div className="owner-ponds_stats-grid">
          <div className="owner-ponds_stat-card owner-ponds_stat-card--total">
            <span>Tổng ao nuôi</span>
            <strong>{summary.total}</strong>
          </div>
          <div className="owner-ponds_stat-card owner-ponds_stat-card--farming">
            <span>Ao đang nuôi</span>
            <strong>{summary.dangNuoi}</strong>
          </div>
          <div className="owner-ponds_stat-card owner-ponds_stat-card--paused">
            <span>Ao chuẩn bị nuôi</span>
            <strong>{summary.chuanBiNuoi}</strong>
          </div>
          <div className="owner-ponds_stat-card owner-ponds_stat-card--renovating">
            <span>Ao đang cải tạo</span>
            <strong>{summary.dangCaiTao}</strong>
          </div>
        </div>

        <div className="owner-ponds_charts-grid">
          <PondChartCard
            prefix="owner-ponds"
            title="Phân bố trạng thái ao nuôi"
            type="doughnut"
            data={pondStatusChartData}
            total={pondStatusTotal}
          />

          <PondChartCard
            prefix="owner-ponds"
            title="Phân bố trạng thái sử dụng"
            type="doughnut"
            data={usageStatusChartData}
            total={usageStatusTotal}
          />

          <PondChartCard
            prefix="owner-ponds"
            title="Tải trọng công việc kỹ sư"
            type="bar"
            data={technicianWorkload.map((item, index) => ({
              label: String(item.name || '').split(' ').slice(-1)[0] || item.name,
              value: item.count,
              color: CHART_COLORS[index % CHART_COLORS.length],
            }))}
          />
        </div>

        <div className="admin-users_toolbar owner-ponds_toolbar">
          <div className="admin-users_search-wrap">
            <span className="admin-users_search-icon">⌕</span>
            <input
              type="text"
              value={searchTerm}
              placeholder="Tìm theo tên ao..."
              onChange={(e) => {
                setSearchTerm(e.target.value)
                resetToFirstPage()
              }}
            />
          </div>

          <select
            className="admin-users_filter-select"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              resetToFirstPage()
            }}
          >
            {POND_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>

          <select
            className="admin-users_filter-select"
            value={usageFilter}
            onChange={(e) => {
              setUsageFilter(e.target.value)
              resetToFirstPage()
            }}
          >
            {USAGE_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>

          <select
            className="admin-users_filter-select"
            value={technicianFilter}
            onChange={(e) => {
              setTechnicianFilter(e.target.value)
              resetToFirstPage()
            }}
          >
            <option value="ALL">Tất cả kỹ sư phụ trách</option>
            {technicianOptions.map((tech) => (
              <option key={tech.id} value={tech.id}>{tech.name}</option>
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
                <th>Kỹ sư phụ trách</th>
                <th>Trạng thái sử dụng</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {paginatedPonds.length === 0 ? (
                <tr>
                  <td className="admin-users_empty-row" colSpan="7">
                    Không có dữ liệu ao phù hợp bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                paginatedPonds.map((pond) => (
                  <tr key={pond.pond_id}>
                    <td>
                      <div className="owner-ponds_name-block">
                        <strong>{pond.pond_name}</strong>
                        <span>{pond.pond_code}</span>
                      </div>
                    </td>
                    <td>{formatRoundedNumber(pond.area_m2)}</td>
                    <td>{formatRoundedNumber(pond.depth_m)}</td>
                    <td><span className={getPondStatusClass(pond.status)}>{getPondStatusLabel(pond.status)}</span></td>
                    <td>{getTechnicianName(pond.assigned_staff)}</td>
                    <td><span className={getUsageStatusClass(pond.usage_status)}>{getUsageStatusLabel(pond.usage_status)}</span></td>
                    <td>
                      <div className="admin-users_table-actions">
                        <button type="button" className="admin-users_action-btn admin-users_action-btn--view" title="Xem chi tiết" onClick={() => openDetailModal(pond)}>ⓘ</button>
                        <button type="button" className="admin-users_action-btn admin-users_action-btn--role" title="Chỉnh sửa" onClick={() => openEditModal(pond)}>✎</button>
                        <button
                          type="button"
                          className="admin-users_action-btn admin-users_action-btn--unlock"
                          title={normalizeUpper(pond.usage_status) === 'HOAT_DONG' ? 'Ngưng sử dụng' : 'Mở lại hoạt động'}
                          onClick={() => handleToggleUsage(pond)}
                        >
                          {normalizeUpper(pond.usage_status) === 'HOAT_DONG' ? '⊘' : '↺'}
                        </button>
                        <button type="button" className="admin-users_action-btn admin-users_action-btn--lock" title="Xóa ao" onClick={() => handleDelete(pond.pond_id)}>🗑</button>
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
                setPageSize(Number(e.target.value) || DEFAULT_PAGE_SIZE)
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

      {showCreateModal && (
        <div className="modal">
          <div className="modal-content admin-users_modal">
            <h3>Tạo ao nuôi mới</h3>
            <form className="admin-users_modal-form" onSubmit={handleCreateSubmit}>
              <div className="admin-users_detail-grid admin-users_modal-grid">
                <div className="form-group">
                  <label>Tên ao *</label>
                  <input value={createForm.pondName} onChange={(e) => handleCreateChange('pondName', e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Diện tích ao (m²) *</label>
                  <input type="number" min="0" step="0.01" value={createForm.area_m2} onChange={(e) => handleCreateChange('area_m2', e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Độ sâu ao (m) *</label>
                  <input type="number" min="0" step="0.01" value={createForm.depth_m} onChange={(e) => handleCreateChange('depth_m', e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Kỹ sư phụ trách (tùy chọn)</label>
                  <select value={createForm.assigned_staff} onChange={(e) => handleCreateChange('assigned_staff', e.target.value)}>
                    <option value="">-- Chưa phân công --</option>
                    {technicianOptions.map((tech) => (
                      <option key={tech.id} value={tech.id} disabled={!tech.isActive}>
                        {tech.name} {!tech.isActive ? '(Bị khóa)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="admin-users_modal-buttons admin-users_form-buttons">
                <button type="button" className="btn btn-secondary" disabled={saving} onClick={() => setShowCreateModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Đang lưu...' : 'Tạo ao'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && selectedPond && (
        <div className="modal">
          <div className="modal-content admin-users_modal">
            <h3>Chỉnh sửa ao nuôi</h3>
            <form className="admin-users_modal-form" onSubmit={handleEditSubmit}>
              <div className="admin-users_detail-grid admin-users_modal-grid">
                <div className="form-group admin-users_detail-card admin-users_detail-card--full">
                  <label>Mã ao</label>
                  <input value={selectedPond.pond_code || ''} readOnly />
                </div>

                <div className="form-group">
                  <label>Tên ao *</label>
                  <input value={editForm.pondName} onChange={(e) => handleEditChange('pondName', e.target.value)} required />
                </div>

                <div className="form-group">
                  <label>Diện tích ao (m²) *</label>
                  <input type="number" min="0" step="0.01" value={editForm.area_m2} onChange={(e) => handleEditChange('area_m2', e.target.value)} required />
                </div>

                <div className="form-group">
                  <label>Độ sâu ao (m) *</label>
                  <input type="number" min="0" step="0.01" value={editForm.depth_m} onChange={(e) => handleEditChange('depth_m', e.target.value)} required />
                </div>

                <div className="form-group">
                  <label>Kỹ sư phụ trách</label>
                  <select value={editForm.assigned_staff} onChange={(e) => handleEditChange('assigned_staff', e.target.value)}>
                    <option value="">-- Chưa phân công --</option>
                    {technicianOptions.map((tech) => (
                      <option key={tech.id} value={tech.id} disabled={!tech.isActive}>
                        {tech.name} {!tech.isActive ? '(Bị khóa)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Trạng thái sử dụng</label>
                  <select value={editForm.usage_status} onChange={(e) => handleEditChange('usage_status', e.target.value)}>
                    <option value="HOAT_DONG">Hoạt động</option>
                    <option value="NGUNG_SU_DUNG">Ngưng sử dụng</option>
                  </select>
                </div>
              </div>

              <div className="admin-users_modal-buttons admin-users_form-buttons">
                <button type="button" className="btn btn-secondary" disabled={saving} onClick={() => setShowEditModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu cập nhật'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDetailModal && selectedPond && (
        <div className="modal" onClick={() => setShowDetailModal(false)}>
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
                <strong>{getTechnicianName(selectedPond.assigned_staff)}</strong>
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
              <button type="button" className="btn btn-secondary" onClick={() => setShowDetailModal(false)}>Đóng</button>
            </div>
          </div>
        </div>
      )}

      {showAssignmentModal && (
        <div className="modal" onClick={() => setShowAssignmentModal(false)}>
          <div className="modal-content admin-users_modal owner-ponds_assignment-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Phân công kỹ sư phụ trách ao</h3>

            <div className="owner-ponds_assignment-wrap">
              <table className="owner-ponds_assignment-table">
                <thead>
                  <tr>
                    <th>Ao nuôi</th>
                    {technicianOptions.map((tech) => (
                      <th key={`head-tech-${tech.id}`}>{tech.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedPonds.length === 0 ? (
                    <tr>
                      <td colSpan={Math.max(1, technicianOptions.length + 1)} className="owner-ponds_assignment-empty">
                        Chưa có ao trong trại nuôi.
                      </td>
                    </tr>
                  ) : technicianOptions.length === 0 ? (
                    <tr>
                      <td colSpan={Math.max(1, 2)} className="owner-ponds_assignment-empty">
                        Chưa có kỹ sư trong trại nuôi.
                      </td>
                    </tr>
                  ) : (
                    sortedPonds.map((pond) => (
                      <tr key={`row-${pond.pond_id}`}>
                        <td>
                          <strong>{pond.pond_name}</strong>
                          <div className="owner-ponds_assignment-sub">{pond.pond_code}</div>
                        </td>
                        {technicianOptions.map((tech) => {
                          const checked = Number(pond.assigned_staff) === Number(tech.id)
                          const disabledByOther = Boolean(pond.assigned_staff) && Number(pond.assigned_staff) !== Number(tech.id)
                          const disabled = disabledByOther || !tech.isActive || Boolean(busyAssignmentKey)

                          return (
                            <td key={`cell-${pond.pond_id}-${tech.id}`}>
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={disabled}
                                onChange={(e) => handleAssignmentChange(pond, tech.id, e.target.checked)}
                              />
                            </td>
                          )
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="admin-users_modal-buttons admin-users_form-buttons">
              <button type="button" className="btn btn-secondary" onClick={() => setShowAssignmentModal(false)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default OwnerPonds
