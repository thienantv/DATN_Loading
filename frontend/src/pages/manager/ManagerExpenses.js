import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { expenseService, seasonService } from '../../services/api'
import '../../styles/dashboard.css'
import '../../styles/manager/manager-common.css'
import '../../styles/manager/manager-expenses.css'

const emptyForm = {
  season_id: '',
  category_id: '',
  amount: '',
  expense_date: '',
  note: '',
}

const formatCurrency = (value) => {
  const numberValue = Number(value || 0)
  return `${numberValue.toLocaleString('vi-VN')} đ`
}

const formatDate = (value) => {
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

const getSeasonLabel = (season) => {
  if (!season) return '-'
  const seasonName = season.season_name || `Mùa vụ ${season.season_id}`
  const pondLabel = season.pond_code
    ? `${season.pond_code} - ${season.pond_name || `Ao số ${season.pond_id}`}`
    : `Ao số ${season.pond_id}`
  return `${seasonName} - ${pondLabel}`
}

const ManagerExpenses = () => {
  const [seasons, setSeasons] = useState([])
  const [expenseCategories, setExpenseCategories] = useState([])
  const [expenses, setExpenses] = useState([])
  const [seasonSummary, setSeasonSummary] = useState({ season_id: null, season_name: '', total_expense: 0 })
  const [selectedSeasonId, setSelectedSeasonId] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [categorySaving, setCategorySaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [categoryError, setCategoryError] = useState('')
  const [categorySuccess, setCategorySuccess] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [categoryName, setCategoryName] = useState('')
  const [editingCategoryId, setEditingCategoryId] = useState(null)
  const [editingCategoryName, setEditingCategoryName] = useState('')

  useEffect(() => {
    if (selectedSeasonId) {
      fetchSeasonData(selectedSeasonId)
    }
  }, [selectedSeasonId])

  const seasonOptions = useMemo(() => {
    return seasons.map((season) => ({
      id: season.season_id,
      label: getSeasonLabel(season),
    }))
  }, [seasons])

  const currentSeason = useMemo(() => {
    return seasons.find((season) => String(season.season_id) === String(selectedSeasonId)) || null
  }, [seasons, selectedSeasonId])

  const fetchInitialData = useCallback(async () => {
    try {
      setLoading(true)
      const [seasonsRes, categoriesRes] = await Promise.all([
        seasonService.getAllSeasons(),
        expenseService.getExpenseCategories(),
      ])

      const seasonList = seasonsRes?.data?.data || []
      setSeasons(seasonList)
      setExpenseCategories(categoriesRes?.data?.data || [])

      const firstSeasonId = seasonList[0]?.season_id
      if (firstSeasonId) {
        setSelectedSeasonId(String(firstSeasonId))
        setForm((prev) => ({ ...prev, season_id: String(firstSeasonId) }))
        await fetchSeasonData(firstSeasonId)
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Không tải được dữ liệu chi phí')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchInitialData()
  }, [fetchInitialData])

  const fetchSeasonData = async (seasonId) => {
    try {
      const [expensesRes, summaryRes] = await Promise.all([
        expenseService.getExpensesBySeasonId(seasonId),
        expenseService.getTotalExpenseBySeason(seasonId),
      ])

      setExpenses(expensesRes?.data?.data || [])
      setSeasonSummary(summaryRes?.data?.data || { season_id: seasonId, season_name: '', total_expense: 0 })
      setError('')
    } catch (err) {
      setError(err?.response?.data?.message || 'Không tải được chi phí theo mùa vụ')
    }
  }

  const refreshExpenseCategories = async () => {
    const categoriesRes = await expenseService.getExpenseCategories()
    setExpenseCategories(categoriesRes?.data?.data || [])
  }

  const totalsByCategory = useMemo(() => {
    return expenseCategories.map((category) => {
      const id = category.category_id || category.id
      const name = category.category_name || category.name
      const categoryExpenses = expenses.filter((item) => String(item.category_id) === String(id))
      return {
        id,
        name,
        total: categoryExpenses.reduce((sum, item) => sum + Number(item.amount || 0), 0),
        count: categoryExpenses.length,
      }
    })
  }, [expenses, expenseCategories])

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (!form.season_id) {
      setError('Vui lòng chọn mùa vụ')
      return
    }

    if (!form.category_id) {
      setError('Vui lòng chọn loại chi phí')
      return
    }

    if (!form.amount || Number(form.amount) <= 0) {
      setError('Số tiền phải lớn hơn 0')
      return
    }

    try {
      setSaving(true)
      await expenseService.createExpense({
        seasonId: Number(form.season_id),
        categoryId: Number(form.category_id),
        amount: Number(form.amount),
        expenseDate: form.expense_date || null,
        note: form.note.trim(),
      })

      setSuccess('Đã ghi nhận chi phí thành công')
      setShowModal(false)
      setForm({ ...emptyForm, season_id: String(selectedSeasonId) })

      if (selectedSeasonId) {
        await fetchSeasonData(selectedSeasonId)
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Không lưu được chi phí')
    } finally {
      setSaving(false)
    }
  }

  const handleCreateCategory = async (event) => {
    event.preventDefault()
    setCategoryError('')
    setCategorySuccess('')

    if (!categoryName.trim()) {
      setCategoryError('Vui lòng nhập tên danh mục')
      return
    }

    try {
      setCategorySaving(true)
      const res = await expenseService.createExpenseCategory({ categoryName: categoryName.trim() })
      await refreshExpenseCategories()
      const newCategory = res?.data?.data
      if (newCategory?.category_id) {
        setForm((prev) => ({ ...prev, category_id: String(newCategory.category_id) }))
      }
      setCategorySuccess('Đã tạo danh mục chi phí')
      setCategoryName('')
      setShowCategoryModal(false)
    } catch (err) {
      setCategoryError(err?.response?.data?.message || 'Không thể tạo danh mục')
    } finally {
      setCategorySaving(false)
    }
  }

  const handleStartEditCategory = (category) => {
    setEditingCategoryId(category.category_id)
    setEditingCategoryName(category.category_name)
    setCategoryError('')
    setCategorySuccess('')
  }

  const handleCancelEdit = () => {
    setEditingCategoryId(null)
    setEditingCategoryName('')
  }

  const handleSaveEdit = async (event) => {
    event?.preventDefault()
    if (!editingCategoryName.trim()) {
      setCategoryError('Vui lòng nhập tên danh mục')
      return
    }

    try {
      setCategorySaving(true)
      await expenseService.updateExpenseCategory(editingCategoryId, { categoryName: editingCategoryName.trim() })
      await refreshExpenseCategories()
      setCategorySuccess('Đã cập nhật danh mục')
      setEditingCategoryId(null)
      setEditingCategoryName('')
    } catch (err) {
      setCategoryError(err?.response?.data?.message || 'Không thể cập nhật danh mục')
    } finally {
      setCategorySaving(false)
    }
  }

  const handleDeleteCategory = async (categoryId) => {
    if (!window.confirm('Bạn có chắc muốn xoá danh mục này?')) return
    try {
      setCategorySaving(true)
      await expenseService.deleteExpenseCategory(categoryId)
      await refreshExpenseCategories()
      setCategorySuccess('Đã xoá danh mục')
    } catch (err) {
      setCategoryError(err?.response?.data?.message || 'Không thể xoá danh mục')
    } finally {
      setCategorySaving(false)
    }
  }

  if (loading) {
    return (
      <div className="dashboard manager-page">
        <div className="flex-center manager-expenses-loading">
          <div className="spinner" />
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard manager-page">
      <div className="dashboard-header">
        <h1>💰 Quản lý chi phí</h1>
        <p>Nhập chi phí thức ăn, thuốc, điện và theo dõi tổng chi phí theo mùa vụ</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="manager-expenses-toolbar">
        <div className="manager-expenses-season-filter">
          <label className="manager-expenses-label">Chọn mùa vụ</label>
          <select
            value={selectedSeasonId}
            onChange={(e) => setSelectedSeasonId(e.target.value)}
            className="manager-expenses-select"
          >
            {seasonOptions.map((season) => (
              <option key={season.id} value={season.id}>
                {season.label}
              </option>
            ))}
          </select>
        </div>

        <div className="manager-expenses-actions">
          <button
            className="btn btn-primary"
            onClick={() => {
              setForm((prev) => ({ ...prev, season_id: String(selectedSeasonId) }))
              setShowModal(true)
            }}
          >
            ➕ Ghi nhận chi phí
          </button>
        </div>

        {/* Add-category moved into expense modal */}
      </div>

      {categoryError && <div className="alert alert-error">{categoryError}</div>}
      {categorySuccess && <div className="alert alert-success">{categorySuccess}</div>}

      <div className="stats-grid manager-expenses-stats-row">
        <div className="stat-card">
          <div className="stat-icon stat-icon-blue">📈</div>
          <div className="stat-content">
            <p className="stat-label">Mùa vụ</p>
            <p className="stat-value manager-expenses-stat-value">{getSeasonLabel(currentSeason || seasonSummary)}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-green">💰</div>
          <div className="stat-content">
            <p className="stat-label">Tổng chi phí</p>
            <p className="stat-value">{formatCurrency(seasonSummary.total_expense)}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-yellow">🧾</div>
          <div className="stat-content">
            <p className="stat-label">Số dòng chi phí</p>
            <p className="stat-value">{expenses.length}</p>
          </div>
        </div>
      </div>

      <div className="stats-grid manager-expenses-stats-row">
        {totalsByCategory.map((category) => (
          <div key={category.id} className="stat-card">
            <div className="stat-icon stat-icon-gray">💸</div>
            <div className="stat-content">
              <p className="stat-label">{category.name}</p>
              <p className="stat-value manager-expenses-stat-value">{formatCurrency(category.total)}</p>
              <p className="manager-expenses-subtext">{category.count} khoản</p>
            </div>
          </div>
        ))}
      </div>

      <div className="table-container">
        <div className="table-header">
          <h2>Danh sách chi phí theo mùa vụ</h2>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Ngày chi</th>
                <th>Danh mục</th>
                <th>Số tiền</th>
                <th>Ghi chú</th>
                <th>Người nhập</th>
              </tr>
            </thead>
            <tbody>
              {expenses.length > 0 ? (
                expenses.map((expense) => (
                  <tr key={expense.expense_id}>
                    <td>{formatDate(expense.expense_date)}</td>
                    <td>{expense.category_name || '-'}</td>
                    <td><strong>{formatCurrency(expense.amount)}</strong></td>
                    <td className="manager-expenses-note-cell">{expense.note || '-'}</td>
                    <td>{expense.created_by_name || expense.created_by_username || '-'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="manager-expenses-empty-cell">
                    Chưa có khoản chi nào trong mùa vụ này
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>💰 Ghi nhận chi phí</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Mùa vụ *</label>
                <select
                  value={form.season_id}
                  onChange={(e) => handleChange('season_id', e.target.value)}
                  required
                >
                  <option value="">Chọn mùa vụ</option>
                  {seasonOptions.map((season) => (
                    <option key={season.id} value={season.id}>
                      {season.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Loại chi phí *</label>
                <div className="manager-expenses-inline-row">
                  <select
                    value={form.category_id}
                    onChange={(e) => handleChange('category_id', e.target.value)}
                    required
                    className="manager-expenses-grow"
                  >
                    <option value="">Chọn loại chi phí</option>
                    {expenseCategories.map((category) => (
                      <option key={category.category_id} value={category.category_id}>
                        {category.category_name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    className="manager-expenses-add-btn"
                    onClick={() => setShowCategoryModal(true)}
                  >
                    ➕
                  </button>
                </div>
              </div>

              <div className="form-row manager-expenses-form-row">
                <div className="form-group">
                  <label>Số tiền (đ) *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.amount}
                    onChange={(e) => handleChange('amount', e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Ngày chi</label>
                  <input
                    type="date"
                    value={form.expense_date}
                    onChange={(e) => handleChange('expense_date', e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Ghi chú</label>
                <textarea
                  value={form.note}
                  onChange={(e) => handleChange('note', e.target.value)}
                  placeholder="Ví dụ: Mua thức ăn cho ao A1, hóa đơn điện tháng 5..."
                />
              </div>

              <div className="manager-expenses-actions-row">
                <button type="submit" className="btn btn-primary manager-expenses-flex-btn" disabled={saving}>
                  {saving ? 'Đang lưu...' : 'Lưu chi phí'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  className="manager-expenses-flex-btn"
                  onClick={() => setShowModal(false)}
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCategoryModal && (
        <div className="modal" onClick={() => setShowCategoryModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>📁 Quản lý danh mục chi phí</h2>

            {categoryError && <div className="alert alert-error">{categoryError}</div>}
            {categorySuccess && <div className="alert alert-success">{categorySuccess}</div>}

            <div className="manager-expenses-category-list">
              {expenseCategories.length === 0 && <div>Chưa có danh mục nào.</div>}
              {expenseCategories.map((cat) => (
                <div key={cat.category_id} className="manager-expenses-category-item">
                  {editingCategoryId === cat.category_id ? (
                    <form className="manager-expenses-category-edit" onSubmit={handleSaveEdit}>
                      <input
                        value={editingCategoryName}
                        onChange={(e) => setEditingCategoryName(e.target.value)}
                        className="manager-expenses-grow"
                        required
                      />
                      <button type="submit" className="btn btn-primary" disabled={categorySaving}>Lưu</button>
                      <button type="button" className="btn btn-secondary" onClick={handleCancelEdit}>Hủy</button>
                    </form>
                  ) : (
                    <>
                      <div className="manager-expenses-grow">{cat.category_name}</div>
                      <button type="button" className="btn" onClick={() => handleStartEditCategory(cat)}>Sửa</button>
                      <button type="button" className="btn btn-danger" onClick={() => handleDeleteCategory(cat.category_id)}>Xoá</button>
                    </>
                  )}
                </div>
              ))}
            </div>

            <hr className="manager-expenses-divider" />

            <h3>➕ Thêm danh mục mới</h3>
            <form onSubmit={handleCreateCategory}>
              <div className="form-group">
                <label>Tên danh mục *</label>
                <input
                  type="text"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder="Ví dụ: Thức ăn, Thuốc, Điện, Bảo trì..."
                  required
                />
              </div>

              <div className="manager-expenses-actions-row">
                <button type="submit" className="btn btn-primary manager-expenses-flex-btn" disabled={categorySaving}>
                  {categorySaving ? 'Đang lưu...' : 'Lưu danh mục'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  className="manager-expenses-flex-btn"
                  onClick={() => setShowCategoryModal(false)}
                >
                  Đóng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default ManagerExpenses