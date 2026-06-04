import React, { useEffect, useMemo, useState } from 'react'
import { expenseService } from '../../services/api'
import { showToast } from '../../utils/toast'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'

// NHÚNG FILE CSS RIÊNG CỦA TRANG VÀO ĐÂY
import '../../styles/owner/cost-management.css'

const CATEGORY_FILTER_OPTIONS = [
  { value: 'ALL', label: 'Tất cả hạng mục' },
  { value: 'MATERIAL', label: 'Vật tư tiêu hao (Tự động)' },
  { value: 'ELECTRICITY', label: 'Điện năng (Bơm, Quạt)' },
  { value: 'LABOR', label: 'Nhân công (Lương, Thưởng)' },
  { value: 'MAINTENANCE', label: 'Bảo trì, Sửa chữa' },
  { value: 'OTHER', label: 'Chi phí khác' },
]

const FORM_CATEGORY_OPTIONS = [
  { value: 'ELECTRICITY', label: 'Điện năng (Bơm, Quạt nước)' },
  { value: 'LABOR', label: 'Nhân công (Lương, Thưởng)' },
  { value: 'MAINTENANCE', label: 'Bảo trì, Sửa chữa thiết bị' },
  { value: 'OTHER', label: 'Chi phí phát sinh khác' }
]

const DEFAULT_PAGE_SIZE = 10
const CHART_COLORS = ['#0ea5e9', '#ea580c', '#10b981', '#8b5cf6', '#f59e0b']

const emptyCreateForm = {
  category: 'ELECTRICITY',
  amount: '',
  expense_date: new Date().toISOString().split('T')[0],
  note: ''
}

const normalizeUpper = (value) => String(value || '').trim().toUpperCase()
const normalizeText = (value) => String(value || '').trim().toLowerCase()

const formatCurrency = (val) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0)
}

const getCategoryLabel = (category) => {
  switch (normalizeUpper(category)) {
    case 'MATERIAL': return 'Vật tư tiêu hao'
    case 'ELECTRICITY': return 'Điện năng'
    case 'LABOR': return 'Nhân công'
    case 'MAINTENANCE': return 'Bảo trì, sửa chữa'
    default: return 'Chi phí khác'
  }
}

const getSourceClass = (source) => {
  if (normalizeText(source).includes('tự động')) {
    return 'table-status-badge table-status-active'
  }
  return 'table-status-badge table-status-inactive'
}

const CostManagement = () => {
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [currentPage, setCurrentPage] = useState(1)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createForm, setCreateForm] = useState(emptyCreateForm)

  useEffect(() => {
    fetchExpenses()
  }, [])

  const fetchExpenses = async () => {
    try {
      setLoading(true)
      const res = await expenseService.getAllExpenses()
      setExpenses(res?.data?.data || [])
    } catch (err) {
      showToast({ title: 'Không tải được danh sách chi phí', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const summary = useMemo(() => {
    const initial = { total: 0, material: 0, electricity: 0, labor: 0, other: 0 }
    expenses.forEach(e => {
      const amt = Number(e.amount || 0)
      initial.total += amt
      const cat = normalizeUpper(e.category)
      if (cat === 'MATERIAL') initial.material += amt
      else if (cat === 'ELECTRICITY') initial.electricity += amt
      else if (cat === 'LABOR') initial.labor += amt
      else initial.other += amt
    })
    return initial
  }, [expenses])

  const chartData = useMemo(() => [
    { name: 'Vật tư tiêu hao', value: summary.material },
    { name: 'Điện năng', value: summary.electricity },
    { name: 'Nhân công', value: summary.labor },
    { name: 'Chi phí khác', value: summary.other },
  ].filter(d => d.value > 0), [summary])

  const filteredExpenses = useMemo(() => {
    const normalizedSearch = normalizeText(searchTerm)
    return expenses.filter((e) => {
      const matchSearch = !normalizedSearch || normalizeText(e.note).includes(normalizedSearch) || normalizeText(e.name).includes(normalizedSearch)
      const matchCategory = categoryFilter === 'ALL' || normalizeUpper(e.category) === categoryFilter
      return matchSearch && matchCategory
    })
  }, [expenses, searchTerm, categoryFilter])

  const totalPages = Math.max(1, Math.ceil(filteredExpenses.length / pageSize))
  const safePage = Math.min(currentPage, totalPages)
  const startIndex = (safePage - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, filteredExpenses.length)
  const paginatedExpenses = filteredExpenses.slice(startIndex, endIndex)

  const resetToFirstPage = () => setCurrentPage(1)

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const handleCreateChange = (field, value) => {
    setCreateForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleCreateSubmit = async (event) => {
    event.preventDefault()
    if (!createForm.amount || Number(createForm.amount) <= 0) {
      showToast({ title: 'Số tiền chi trả phải lớn hơn 0', type: 'error' })
      return
    }

    try {
      setSaving(true)
      await expenseService.addExpense(createForm)
      showToast({ title: 'Ghi nhận chi phí thành công', type: 'success' })
      setShowCreateModal(false)
      setCreateForm(emptyCreateForm)
      await fetchExpenses()
    } catch (err) {
      showToast({ title: err?.response?.data?.message || 'Lỗi khi lưu chi phí', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="dashboard admin-page">
        <div className="flex-center table-loading-container">
          <div className="spinner" />
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard admin-page cost-management">
      <div className="table-container table-panel">
        
        {/* HEADER */}
        <div className="table-header">
          <div>
            <h2>Quản lý chi phí vận hành</h2>
            <p className="table-subtitle">
              Theo dõi dòng tiền chi trả vật tư tự động từ thực địa và hạch toán các chi phí phát sinh
            </p>
          </div>
          <div className="owner-ponds_header-actions">
            <button type="button" className="btn btn-primary" onClick={() => setShowCreateModal(true)}>＋ Thêm chi phí phụ</button>
          </div>
        </div>

        {/* THÈ KPI KHỐI CHUNG */}
        <div className="stats-grid">
          <div className="stats-card stats-card--primary">
            <span className="stats-card-label">TỔNG CHI PHÍ ĐÃ DÙNG</span>
            <strong className="stats-card-value">{formatCurrency(summary.total)}</strong>
          </div>
          <div className="stats-card stats-card--warning">
            <span className="stats-card-label">Chi phí vật tư</span>
            <strong className="stats-card-value">{formatCurrency(summary.material)}</strong>
          </div>
          <div className="stats-card stats-card--danger">
            <span className="stats-card-label">Tiền điện vận hành</span>
            <strong className="stats-card-value">{formatCurrency(summary.electricity)}</strong>
          </div>
          <div className="stats-card stats-card--success">
            <span className="stats-card-label">Chi phí nhân công</span>
            <strong className="stats-card-value">{formatCurrency(summary.labor)}</strong>
          </div>
        </div>

        {/* BIỂU ĐỒ TRÒN KHU VỰC CHI PHÍ */}
        <div className="cost-management_charts-grid">
          <div className="cost-management_chart-card">
            <h4>Biểu đồ cơ cấu phân bổ chi phí hoạt động</h4>
            {chartData.length > 0 ? (
              <div style={{ width: '100%', height: '260px', marginTop: '10px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value">
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="cost-management_chart-empty">Chưa có dữ liệu dòng tiền</div>
            )}
          </div>
        </div>

        {/* TOOLBAR LỌC DỮ LIỆU */}
        <div className="table-toolbar cost-management_toolbar">
          <div className="table-search">
            <span className="table-search-icon">⌕</span>
            <input
              type="text"
              value={searchTerm}
              placeholder="Tìm theo nội dung ghi chú, diễn giải..."
              onChange={(e) => {
                setSearchTerm(e.target.value)
                resetToFirstPage()
              }}
            />
          </div>

          <select
            className="table-filter"
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value)
              resetToFirstPage()
            }}
          >
            {CATEGORY_FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        {/* BẢNG BIỂU */}
        <div className="table-wrapper">
          <table className="table-base">
            <thead>
              <tr>
                <th>Ngày ghi nhận</th>
                <th>Hạng mục chi phí</th>
                <th>Nguồn gốc hạch toán</th>
                <th>Số tiền chi trả</th>
                <th>Chi tiết diễn giải / Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              {paginatedExpenses.length === 0 ? (
                <tr>
                  <td className="table-empty-row" colSpan="5">
                    Không tìm thấy dữ liệu chi phí nào khớp với bộ lọc.
                  </td>
                </tr>
              ) : (
                paginatedExpenses.map((e, idx) => (
                  <tr key={idx}>
                    <td><strong>{new Date(e.expense_date).toLocaleDateString('vi-VN')}</strong></td>
                    <td>
                      <div className="cost-management_name-block">
                        <strong>{e.name}</strong>
                        <span>{getCategoryLabel(e.category)}</span>
                      </div>
                    </td>
                    <td>
                      <span className={getSourceClass(e.source)}>
                        {e.source}
                      </span>
                    </td>
                    <td style={{ color: '#ef4444', fontWeight: '700' }}>
                      -{formatCurrency(e.amount)}
                    </td>
                    <td style={{ maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={e.note}>
                      {e.note || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PHÂN TRANG */}
        <div className="table-pagination">
          <div className="table-pagination-left">
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
            <span>{filteredExpenses.length === 0 ? 0 : startIndex + 1}-{endIndex} / {filteredExpenses.length}</span>
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

      {/* MODAL FORM NHẬP CHI PHÍ */}
      {showCreateModal && (
        <div className="modal" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content admin-users_modal" onClick={(e) => e.stopPropagation()}>
            <h3>Ghi nhận chi phí vận hành mới</h3>
            <form className="admin-users_modal-form" onSubmit={handleCreateSubmit}>
              <div className="admin-users_detail-grid admin-users_modal-grid">
                
                <div className="form-group">
                  <label>Loại chi phí *</label>
                  <select value={createForm.category} onChange={(e) => handleCreateChange('category', e.target.value)}>
                    {FORM_CATEGORY_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Số tiền chi trả (VNĐ) *</label>
                  <input type="number" min="1000" step="1000" placeholder="Ví dụ: 2000000" value={createForm.amount} onChange={(e) => handleCreateChange('amount', e.target.value)} required />
                </div>

                <div className="form-group admin-users_detail-card--full">
                  <label>Ngày thanh toán / Thực hiện *</label>
                  <input type="date" value={createForm.expense_date} onChange={(e) => handleCreateChange('expense_date', e.target.value)} required />
                </div>

                <div className="form-group admin-users_detail-card--full">
                  <label>Nội dung diễn giải / Ghi chú</label>
                  <textarea rows="3" placeholder="Ví dụ: Chi tiền trả hóa đơn tiền điện phục vụ bơm nước tháng 5/2026..." value={createForm.note} onChange={(e) => handleCreateChange('note', e.target.value)} />
                </div>

              </div>

              <div className="admin-users_modal-buttons admin-users_form-buttons">
                <button type="button" className="btn btn-secondary" disabled={saving} onClick={() => setShowCreateModal(false)}>Hủy bỏ</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu chi phí'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default CostManagement