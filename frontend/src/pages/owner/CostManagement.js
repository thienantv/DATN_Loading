import React, { useEffect, useMemo, useState } from 'react'
import { expenseService, pondService, seasonService } from '../../services/api'
import { showToast } from '../../utils/toast'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import '../../styles/owner/cost-management.css'

const GENERAL_CATEGORY_OPTIONS = [
  { value: 'ALL', label: 'Tất cả hạng mục chung' },
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
const CHART_COLORS = ['#0ea5e9', '#ea580c', '#10b981', '#8b5cf6', '#f59e0b', '#14b8a6']

const emptyCreateForm = {
  category: 'ELECTRICITY',
  amount: '',
  expense_date: new Date().toISOString().split('T')[0],
  note: ''
}

const normalizeUpper = (value) => String(value || '').trim().toUpperCase()
const normalizeText = (value) => String(value || '').trim().toLowerCase()
const formatCurrency = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0)

const getCategoryLabel = (category) => {
  switch (normalizeUpper(category)) {
    case 'MATERIAL': return 'Vật tư tiêu hao'
    case 'ELECTRICITY': return 'Điện năng'
    case 'LABOR': return 'Nhân công'
    case 'MAINTENANCE': return 'Bảo trì, sửa chữa'
    default: return 'Chi phí khác'
  }
}

const CostManagement = () => {
  const [expenses, setExpenses] = useState([])
  const [ponds, setPonds] = useState([])
  const [seasons, setSeasons] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [activeTab, setActiveTab] = useState('SPECIFIC')

  const [searchTerm, setSearchTerm] = useState('')
  const [monthFilter, setMonthFilter] = useState('ALL')
  const [seasonFilter, setSeasonFilter] = useState('ALL')
  const [pondFilter, setPondFilter] = useState('ALL')
  const [productCategoryFilter, setProductCategoryFilter] = useState('ALL')
  const [generalCategoryFilter, setGeneralCategoryFilter] = useState('ALL')
  
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [currentPage, setCurrentPage] = useState(1)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createForm, setCreateForm] = useState(emptyCreateForm)

  useEffect(() => {
    fetchInitialData()
  }, [])

  const fetchInitialData = async () => {
    try {
      setLoading(true)
      const [expenseRes, pondRes, seasonRes] = await Promise.all([
        expenseService.getAllExpenses(),
        pondService.getAllPonds(),
        seasonService.getAllSeasons()
      ])
      setExpenses(expenseRes?.data?.data || [])
      setPonds(pondRes?.data?.data || [])
      setSeasons(seasonRes?.data?.data || [])
    } catch (err) {
      showToast({ title: 'Không tải được dữ liệu chi phí hệ thống', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  // Quét tìm các Tháng
  const availableMonths = useMemo(() => {
    const monthsSet = new Set()
    expenses.forEach(e => {
      if (e.expense_date) monthsSet.add(e.expense_date.substring(0, 7))
    })
    return Array.from(monthsSet).sort().reverse()
  }, [expenses])

  // 🌟 Quét tìm các Danh mục vật tư trực tiếp từ mảng chi phí (KHÔNG CẦN GỌI API API PRODUCT)
  const availableProductCategories = useMemo(() => {
    const catMap = new Map()
    expenses.forEach(e => {
      if (e.product_category_id && e.product_category_name) {
        catMap.set(String(e.product_category_id), e.product_category_name)
      }
    })
    return Array.from(catMap.entries()).map(([id, name]) => ({ id, name }))
  }, [expenses])

  const filteredExpenses = useMemo(() => {
    const normalizedSearch = normalizeText(searchTerm)
    
    return expenses.filter((e) => {
      const isMaterial = normalizeUpper(e.category) === 'MATERIAL'
      
      const matchSearch = !normalizedSearch || normalizeText(e.note).includes(normalizedSearch) || normalizeText(e.name).includes(normalizedSearch)
      const matchMonth = monthFilter === 'ALL' || (e.expense_date && e.expense_date.startsWith(monthFilter))

      if (activeTab === 'SPECIFIC') {
        if (!isMaterial) return false;
        const matchPond = pondFilter === 'ALL' || String(e.pond_id) === String(pondFilter)
        const matchSeason = seasonFilter === 'ALL' || String(e.season_id) === String(seasonFilter)
        const matchProdCategory = productCategoryFilter === 'ALL' || String(e.product_category_id) === String(productCategoryFilter)
        
        return matchSearch && matchMonth && matchPond && matchSeason && matchProdCategory
      } else {
        if (isMaterial) return false;
        const matchGenCategory = generalCategoryFilter === 'ALL' || normalizeUpper(e.category) === generalCategoryFilter
        return matchSearch && matchMonth && matchGenCategory
      }
    })
  }, [expenses, activeTab, searchTerm, monthFilter, seasonFilter, pondFilter, productCategoryFilter, generalCategoryFilter])

  const summary = useMemo(() => {
    const initial = { total: 0, material: 0, electricity: 0, labor: 0, maintenance: 0, other: 0 }
    filteredExpenses.forEach(e => {
      const amt = Number(e.amount || 0)
      initial.total += amt
      const cat = normalizeUpper(e.category)
      if (cat === 'MATERIAL') initial.material += amt
      else if (cat === 'ELECTRICITY') initial.electricity += amt
      else if (cat === 'LABOR') initial.labor += amt
      else if (cat === 'MAINTENANCE') initial.maintenance += amt
      else initial.other += amt
    })
    return initial
  }, [filteredExpenses])

  const chartData = useMemo(() => {
    if (activeTab === 'SPECIFIC') {
      return [{ name: 'Vật tư tiêu hao', value: summary.material }].filter(d => d.value > 0)
    } else {
      return [
        { name: 'Điện năng', value: summary.electricity },
        { name: 'Nhân công', value: summary.labor },
        { name: 'Bảo trì, sửa chữa', value: summary.maintenance },
        { name: 'Chi phí khác', value: summary.other },
      ].filter(d => d.value > 0)
    }
  }, [summary, activeTab])

  const totalPages = Math.max(1, Math.ceil(filteredExpenses.length / pageSize))
  const safePage = Math.min(currentPage, totalPages)
  const startIndex = (safePage - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, filteredExpenses.length)
  const paginatedExpenses = filteredExpenses.slice(startIndex, endIndex)

  const handleTabChange = (tabName) => {
    setActiveTab(tabName)
    setSearchTerm('')
    setMonthFilter('ALL')
    setSeasonFilter('ALL')
    setPondFilter('ALL')
    setProductCategoryFilter('ALL')
    setGeneralCategoryFilter('ALL')
    setCurrentPage(1)
  }

  const handleCreateSubmit = async (event) => {
    event.preventDefault()
    if (!createForm.amount || Number(createForm.amount) <= 0) return showToast({ title: 'Số tiền chi trả phải lớn hơn 0', type: 'error' })

    try {
      setSaving(true)
      await expenseService.addExpense(createForm)
      showToast({ title: 'Ghi nhận chi phí thành công', type: 'success' })
      setShowCreateModal(false)
      setCreateForm(emptyCreateForm)
      
      const res = await expenseService.getAllExpenses()
      setExpenses(res?.data?.data || [])
    } catch (err) {
      showToast({ title: 'Lỗi không thể ghi nhận chi phí', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="dashboard admin-page"><div className="flex-center table-loading-container"><div className="spinner" /></div></div>

  return (
    <div className="dashboard admin-page cost-management">
      <div className="table-container table-panel">
        
        <div className="table-header">
          <div>
            <h2>Hạch toán & Quản lý chi phí trại</h2>
            <p className="table-subtitle">Tách biệt dòng tiền sản xuất thực địa theo ao vụ và các chi phí vận hành cố định toàn trại</p>
          </div>
          <div className="owner-ponds_header-actions">
            <button type="button" className="btn btn-primary" onClick={() => setShowCreateModal(true)}>＋ Thêm chi phí vận hành chung</button>
          </div>
        </div>

        <div className="cost-management_tabs">
          <button className={`cost-management_tab-btn ${activeTab === 'SPECIFIC' ? 'active' : ''}`} onClick={() => handleTabChange('SPECIFIC')}>
            🏞️ Chi phí sản xuất riêng (Theo ao nuôi / Mùa vụ)
          </button>
          <button className={`cost-management_tab-btn ${activeTab === 'GENERAL' ? 'active' : ''}`} onClick={() => handleTabChange('GENERAL')}>
            ⚙️ Chi phí vận hành chung (Điện, Lương, Sửa chữa)
          </button>
        </div>

        <div className="stats-grid">
          <div className="stats-card stats-card--primary">
            <span className="stats-card-label">TỔNG MỤC ĐANG LỌC</span>
            <strong className="stats-card-value">{formatCurrency(summary.total)}</strong>
          </div>
          {activeTab === 'SPECIFIC' ? (
            <div className="stats-card stats-card--warning">
              <span className="stats-card-label">Vật tư ao/vụ này</span>
              <strong className="stats-card-value">{formatCurrency(summary.material)}</strong>
            </div>
          ) : (
            <>
              <div className="stats-card stats-card--danger">
                <span className="stats-card-label">Tổng tiền điện</span>
                <strong className="stats-card-value">{formatCurrency(summary.electricity)}</strong>
              </div>
              <div className="stats-card stats-card--success">
                <span className="stats-card-label">Tổng lương nhân công</span>
                <strong className="stats-card-value">{formatCurrency(summary.labor)}</strong>
              </div>
            </>
          )}
        </div>

        <div className="cost-management_charts-grid">
          <div className="cost-management_chart-card">
            <h4>Cơ cấu phân bổ dòng tiền trong bộ lọc hiện tại</h4>
            {chartData.length > 0 ? (
              <div style={{ width: '100%', height: '250px', marginTop: '10px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value">
                      {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : <div className="cost-management_chart-empty">Chưa có dữ liệu dòng tiền phù hợp điều kiện lọc</div>}
          </div>
        </div>

        <div className="table-toolbar cost-management_toolbar">
          <div className="table-search">
            <span className="table-search-icon">⌕</span>
            <input type="text" value={searchTerm} placeholder="Tìm nội dung, tên sản phẩm..." onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1) }} />
          </div>

          <select className="table-filter" value={monthFilter} onChange={(e) => { setMonthFilter(e.target.value); setCurrentPage(1) }}>
            <option value="ALL">Tất cả các tháng</option>
            {availableMonths.map(m => {
              const [year, month] = m.split('-');
              return <option key={m} value={m}>Tháng {month}/{year}</option>
            })}
          </select>

          {activeTab === 'SPECIFIC' && (
            <>
              <select className="table-filter" value={seasonFilter} onChange={(e) => { setSeasonFilter(e.target.value); setCurrentPage(1) }}>
                <option value="ALL">Tất cả mùa vụ</option>
                {seasons.map(s => <option key={s.season_id} value={s.season_id}>{s.season_name}</option>)}
              </select>

              <select className="table-filter" value={pondFilter} onChange={(e) => { setPondFilter(e.target.value); setCurrentPage(1) }}>
                <option value="ALL">Tất cả ao nuôi</option>
                {ponds.map(p => <option key={p.pond_id} value={p.pond_id}>{p.pond_name}</option>)}
              </select>

              {/* 🌟 SELECT BỘ LỌC TỰ ĐỘNG RENDERING DANH MỤC */}
              <select className="table-filter" value={productCategoryFilter} onChange={(e) => { setProductCategoryFilter(e.target.value); setCurrentPage(1) }}>
                <option value="ALL">Tất cả danh mục vật tư</option>
                {availableProductCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </>
          )}

          {activeTab === 'GENERAL' && (
            <select className="table-filter" value={generalCategoryFilter} onChange={(e) => { setGeneralCategoryFilter(e.target.value); setCurrentPage(1) }}>
              {GENERAL_CATEGORY_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          )}
        </div>

        <div className="table-wrapper">
          <table className="table-base">
            <thead>
              <tr>
                <th>Ngày ghi nhận</th>
                <th>Hạng mục chi phí / Vật tư</th>
                <th>Nguồn gốc hạch toán</th>
                <th>Số tiền chi trả</th>
                <th>Nội dung diễn giải / Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              {paginatedExpenses.length === 0 ? (
                <tr><td className="table-empty-row" colSpan="5">Không tìm thấy dữ liệu dòng tiền nào thỏa mãn điều kiện lọc.</td></tr>
              ) : (
                paginatedExpenses.map((e, idx) => (
                  <tr key={idx}>
                    <td><strong>{new Date(e.expense_date).toLocaleDateString('vi-VN')}</strong></td>
                    <td>
                      <div className="cost-management_name-block">
                        <strong>{e.name}</strong>
                        {/* 🌟 Hiển thị kèm tên Danh mục vật tư nếu có */}
                        <span>{e.product_category_name ? `Danh mục: ${e.product_category_name}` : getCategoryLabel(e.category)}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`table-status-badge ${activeTab === 'SPECIFIC' ? 'table-status-active' : 'table-status-inactive'}`}>
                        {e.source}
                      </span>
                    </td>
                    <td style={{ color: '#ef4444', fontWeight: '700' }}>-{formatCurrency(e.amount)}</td>
                    <td style={{ maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={e.note}>{e.note || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="table-pagination">
          <div className="table-pagination-left">
            <span>Số mục</span>
            <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value) || DEFAULT_PAGE_SIZE); setCurrentPage(1) }}>
              {[5, 10, 20, 50].map(size => <option key={size} value={size}>{size}</option>)}
            </select>
            <span>{filteredExpenses.length === 0 ? 0 : startIndex + 1}-{endIndex} / {filteredExpenses.length}</span>
          </div>
          <div className="table-pagination-right">
            <button type="button" className="btn btn-sm btn-secondary" onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))} disabled={safePage <= 1}>‹</button>
            <span className="table-page-pill">{safePage}</span>
            <button type="button" className="btn btn-sm btn-secondary" onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))} disabled={safePage >= totalPages}>›</button>
          </div>
        </div>
      </div>

      {showCreateModal && (
        <div className="modal" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content admin-users_modal" onClick={(e) => e.stopPropagation()}>
            <h3>Ghi nhận chi phí vận hành chung mới</h3>
            <form className="admin-users_modal-form" onSubmit={handleCreateSubmit}>
              <div className="admin-users_detail-grid admin-users_modal-grid">
                <div className="form-group">
                  <label>Loại chi phí vận hành *</label>
                  <select value={createForm.category} onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}>
                    {FORM_CATEGORY_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Số tiền chi trả (VNĐ) *</label>
                  <input type="number" min="1000" step="1000" placeholder="Ví dụ: 3500000" value={createForm.amount} onChange={(e) => setCreateForm({ ...createForm, amount: e.target.value })} required />
                </div>
                <div className="form-group admin-users_detail-card--full">
                  <label>Ngày thanh toán hóa đơn / Chi trả *</label>
                  <input type="date" value={createForm.expense_date} onChange={(e) => setCreateForm({ ...createForm, expense_date: e.target.value })} required />
                </div>
                <div className="form-group admin-users_detail-card--full">
                  <label>Nội dung chi tiết / Diễn giải</label>
                  <textarea rows="3" placeholder="Ví dụ: Thanh toán hóa đơn..." value={createForm.note} onChange={(e) => setCreateForm({ ...createForm, note: e.target.value })} />
                </div>
              </div>
              <div className="admin-users_modal-buttons admin-users_form-buttons">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Hủy bỏ</button>
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