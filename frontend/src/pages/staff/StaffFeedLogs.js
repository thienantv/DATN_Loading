import React, { useEffect, useMemo, useState } from 'react'
import { feedLogService, productService, seasonService } from '../../services/api'
import '../../styles/staff-feed-logs.css'

const emptyForm = {
  seasonId: '',
  productId: '',
  feedingDate: '',
  feedingTime: '',
  mealNo: '',
  quantityKg: '',
  note: '',
}

const toIsoDate = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(date)
}

const StaffFeedLogs = () => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [seasons, setSeasons] = useState([])
  const [feedProducts, setFeedProducts] = useState([])
  const [feedLogs, setFeedLogs] = useState([])
  const [form, setForm] = useState(emptyForm)

  const selectedSeasonId = form.seasonId

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true)
        const [seasonsRes, productsRes] = await Promise.all([
          seasonService.getAllSeasons(),
          productService.getAllProducts(),
        ])

        const seasonDataRaw = seasonsRes?.data?.data || []
        const productData = productsRes?.data?.data || []

        const runningSeasons = seasonDataRaw.filter((season) => {
          const status = String(season.status || '').toUpperCase()
          return status === 'RUNNING' || status === 'ACTIVE'
        })
        const seasonData = runningSeasons.length > 0 ? runningSeasons : seasonDataRaw

        const feedOnlyProducts = productData.filter((product) => {
          const category = String(product.category || '').toLowerCase()
          return category.includes('feed') || category.includes('thuc') || category.includes('thức')
        })

        setSeasons(seasonData)
        setFeedProducts(feedOnlyProducts.length > 0 ? feedOnlyProducts : productData)

        if (seasonData.length > 0) {
          const firstSeasonId = String(seasonData[0].season_id)
          setForm((prev) => ({ ...prev, seasonId: firstSeasonId }))
        }

        setError('')
      } catch (loadError) {
        setError(loadError?.response?.data?.message || 'Không tải được dữ liệu ban đầu')
      } finally {
        setLoading(false)
      }
    }

    loadInitialData()
  }, [])

  useEffect(() => {
    const loadFeedLogs = async () => {
      if (!selectedSeasonId) {
        setFeedLogs([])
        return
      }

      try {
        const logsRes = await feedLogService.getFeedLogsBySeasonId(selectedSeasonId)
        setFeedLogs(logsRes?.data?.data || [])
      } catch (loadError) {
        setFeedLogs([])
        setError(loadError?.response?.data?.message || 'Không tải được nhật ký cho ăn')
      }
    }

    loadFeedLogs()
  }, [selectedSeasonId])

  const seasonOptions = useMemo(
    () =>
      seasons.map((season) => ({
        id: season.season_id,
        label: `${season.season_name || `Mùa vụ ${season.season_id}`} - Ao ${season.pond_id}`,
      })),
    [seasons]
  )

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    try {
      setSaving(true)
      setError('')
      setSuccess('')

      await feedLogService.createFeedLog({
        seasonId: Number(form.seasonId),
        productId: Number(form.productId),
        feedingDate: form.feedingDate,
        feedingTime: form.feedingTime,
        mealNo: Number(form.mealNo),
        quantityKg: Number(form.quantityKg),
        note: form.note.trim() || null,
      })

      setSuccess('Đã ghi nhật ký cho ăn thành công')
      setForm((prev) => ({
        ...emptyForm,
        seasonId: prev.seasonId,
      }))

      const logsRes = await feedLogService.getFeedLogsBySeasonId(form.seasonId)
      setFeedLogs(logsRes?.data?.data || [])
    } catch (submitError) {
      setError(submitError?.response?.data?.message || 'Không thể lưu nhật ký cho ăn')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="staff-feed-page">
      <div className="staff-feed-header">
        <h1>Nhập nhật ký cho ăn</h1>
        <p>Ghi nhận từng lần cho ăn theo mùa vụ thuộc ao bạn phụ trách.</p>
      </div>

      {error && <div className="staff-feed-alert error">{error}</div>}
      {success && <div className="staff-feed-alert success">{success}</div>}

      <section className="staff-feed-form-card">
        <form onSubmit={handleSubmit}>
          <div className="staff-feed-grid two-col">
            <div>
              <label>Mùa vụ</label>
              <select
                value={form.seasonId}
                onChange={(e) => handleChange('seasonId', e.target.value)}
                required
              >
                <option value="">-- Chọn mùa vụ --</option>
                {seasonOptions.map((season) => (
                  <option key={season.id} value={season.id}>
                    {season.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label>Loại thức ăn</label>
              <select
                value={form.productId}
                onChange={(e) => handleChange('productId', e.target.value)}
                required
              >
                <option value="">-- Chọn thức ăn --</option>
                {feedProducts.map((product) => (
                  <option key={product.product_id} value={product.product_id}>
                    {product.product_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="staff-feed-grid four-col">
            <div>
              <label>Ngày cho ăn</label>
              <input
                type="date"
                value={form.feedingDate}
                onChange={(e) => handleChange('feedingDate', e.target.value)}
                required
              />
            </div>

            <div>
              <label>Giờ cho ăn</label>
              <input
                type="time"
                value={form.feedingTime}
                onChange={(e) => handleChange('feedingTime', e.target.value)}
                required
              />
            </div>

            <div>
              <label>Cữ ăn</label>
              <input
                type="number"
                min="1"
                step="1"
                value={form.mealNo}
                onChange={(e) => handleChange('mealNo', e.target.value)}
                placeholder="Ví dụ: 1"
                required
              />
            </div>

            <div>
              <label>Số lượng (kg)</label>
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={form.quantityKg}
                onChange={(e) => handleChange('quantityKg', e.target.value)}
                placeholder="Ví dụ: 12.5"
                required
              />
            </div>
          </div>

          <div>
            <label>Ghi chú</label>
            <textarea
              rows="3"
              value={form.note}
              onChange={(e) => handleChange('note', e.target.value)}
              placeholder="Ghi chú thêm nếu cần"
            />
          </div>

          <div className="staff-feed-actions">
            <button type="submit" disabled={saving || loading}>
              {saving ? 'Đang lưu...' : 'Lưu nhật ký'}
            </button>
          </div>
        </form>
      </section>

      <section className="staff-feed-table-card">
        <h2>Lịch sử cho ăn theo mùa vụ đã chọn</h2>
        {loading ? (
          <p>Đang tải dữ liệu...</p>
        ) : feedLogs.length === 0 ? (
          <p>Chưa có dữ liệu cho mùa vụ này.</p>
        ) : (
          <div className="staff-feed-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Ngày</th>
                  <th>Giờ</th>
                  <th>Cữ</th>
                  <th>Thức ăn</th>
                  <th>Số lượng (kg)</th>
                  <th>Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {feedLogs.map((item) => (
                  <tr key={item.feed_log_id}>
                    <td>{toIsoDate(item.feeding_date)}</td>
                    <td>{item.feeding_time || '-'}</td>
                    <td>{item.meal_no}</td>
                    <td>{item.product_name || '-'}</td>
                    <td>{item.quantity_kg}</td>
                    <td>{item.note || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

export default StaffFeedLogs
