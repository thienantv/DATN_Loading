import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { expenseService, seasonService } from '../../services/api'
import '../../styles/dashboard.css'

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

const ManagerExpenses = () => {
  const [seasons, setSeasons] = useState([])
  const [expenseCategories, setExpenseCategories] = useState([])
  const [expenses, setExpenses] = useState([])
  const [seasonSummary, setSeasonSummary] = useState({ season_id: null, season_name: '', total_expense: 0 })
  const [selectedSeasonId, setSelectedSeasonId] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)

  useEffect(() => {
    if (selectedSeasonId) {
      fetchSeasonData(selectedSeasonId)
    }
  }, [selectedSeasonId])

  const seasonOptions = useMemo(() => {
    return seasons.map((season) => ({
      id: season.season_id,
      label: season.season_name,
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

  const totalsByCategory = useMemo(() => {
    return expenseCategories.map((category) => {
      const categoryExpenses = expenses.filter((item) => String(item.category_id) === String(category.id))
      return {
        ...category,
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

  if (loading) {
    return (
      <div className="dashboard">
        <div className="flex-center" style={{ minHeight: '400px' }}>
          <div className="spinner" />
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>💰 Quản lý chi phí</h1>
        <p>Nhập chi phí thức ăn, thuốc, điện và theo dõi tổng chi phí theo mùa vụ</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '24px' }}>
        <div style={{ minWidth: '260px' }}>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px' }}>Chọn mùa vụ</label>
          <select
            value={selectedSeasonId}
            onChange={(e) => setSelectedSeasonId(e.target.value)}
            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #d1d5db' }}
          >
            {seasonOptions.map((season) => (
              <option key={season.id} value={season.id}>
                {season.label}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'end' }}>
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
      </div>

      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#e0f2fe' }}>📈</div>
          <div className="stat-content">
            <p className="stat-label">Mùa vụ</p>
            <p className="stat-value" style={{ fontSize: '18px' }}>{currentSeason?.season_name || seasonSummary.season_name || '-'}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#dcfce7' }}>💰</div>
          <div className="stat-content">
            <p className="stat-label">Tổng chi phí</p>
            <p className="stat-value">{formatCurrency(seasonSummary.total_expense)}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#fef3c7' }}>🧾</div>
          <div className="stat-content">
            <p className="stat-label">Số dòng chi phí</p>
            <p className="stat-value">{expenses.length}</p>
          </div>
        </div>
      </div>

      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        {totalsByCategory.map((category) => (
          <div key={category.id} className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: '#f3f4f6' }}>💸</div>
            <div className="stat-content">
              <p className="stat-label">{category.name}</p>
              <p className="stat-value" style={{ fontSize: '18px' }}>{formatCurrency(category.total)}</p>
              <p style={{ margin: 0, color: '#6b7280', fontSize: '12px' }}>{category.count} khoản</p>
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
                    <td style={{ maxWidth: '360px' }}>{expense.note || '-'}</td>
                    <td>{expense.created_by_name || expense.created_by_username || '-'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '24px' }}>
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
                <select
                  value={form.category_id}
                  onChange={(e) => handleChange('category_id', e.target.value)}
                  required
                >
                  <option value="">Chọn loại chi phí</option>
                    {expenseCategories.map((category) => (
                      <option key={category.category_id} value={category.category_id}>
                        {category.category_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-row">
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

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={saving}>
                  {saving ? 'Đang lưu...' : 'Lưu chi phí'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => setShowModal(false)}
                >
                  Hủy
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