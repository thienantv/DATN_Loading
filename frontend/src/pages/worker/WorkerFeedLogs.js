import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { feedLogService, productService, seasonService } from '../../services/api'
import { showToast } from '../../utils/toast'
import '../../styles/worker/worker-feed-logs.css'

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

const toDateInput = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 10)
}

const toTimeInput = (value) => {
  if (!value) return ''
  return String(value).slice(0, 5)
}

const WorkerFeedLogs = () => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [seasons, setSeasons] = useState([])
  const [feedProducts, setFeedProducts] = useState([])
  const [feedLogs, setFeedLogs] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [detailOpen, setDetailOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [selectedFeedLog, setSelectedFeedLog] = useState(null)
  const [editForm, setEditForm] = useState(emptyForm)
  const [detailLoading, setDetailLoading] = useState(false)
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

        // Filter products: only show products from category_id = 1 (feed category)
        const feedOnlyProducts = productData.filter((product) => {
          return Number(product.category_id) === 1
        })

        setSeasons(seasonDataRaw)
        setFeedProducts(feedOnlyProducts)

        if (seasonDataRaw.length > 0) {
          const firstSeasonId = String(seasonDataRaw[0].season_id)
          setForm((prev) => ({ ...prev, seasonId: firstSeasonId }))
        }

        // cleared via toast
      } catch (loadError) {
        showToast({ message: loadError?.response?.data?.message || 'Không tải được dữ liệu ban đầu', type: 'error' })
      } finally {
        setLoading(false)
      }
    }

    loadInitialData()
  }, [])

  const refreshFeedLogs = useCallback(async (seasonId = selectedSeasonId) => {
    if (!seasonId) {
      setFeedLogs([])
      return
    }

    try {
      const logsRes = await feedLogService.getFeedLogsBySeasonId(seasonId)
      setFeedLogs(logsRes?.data?.data || [])
    } catch (loadError) {
      setFeedLogs([])
      showToast({ message: loadError?.response?.data?.message || 'Không tải được nhật ký cho ăn', type: 'error' })
    }
  }, [selectedSeasonId])

  useEffect(() => {
    refreshFeedLogs()
  }, [refreshFeedLogs])

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

  const openDetail = async (feedLog) => {
    try {
      // use global toasts instead of local state
      setDetailOpen(true)
      setDetailLoading(true)
      setIsEditing(false)
      setSelectedFeedLog(feedLog)
      const detailRes = await feedLogService.getFeedLogDetail(feedLog.feed_log_id)
      const detail = detailRes?.data?.data || feedLog
      setSelectedFeedLog(detail)
      setEditForm({
        seasonId: String(detail.season_id || ''),
        productId: String(detail.product_id || ''),
        feedingDate: toDateInput(detail.feeding_date),
        feedingTime: toTimeInput(detail.feeding_time),
        mealNo: String(detail.meal_no || ''),
        quantityKg: String(detail.quantity_kg ?? ''),
        note: detail.note || '',
      })
    } catch (detailError) {
      showToast({ message: detailError?.response?.data?.message || 'Không tải được chi tiết nhật ký cho ăn', type: 'error' })
      setDetailOpen(false)
      setSelectedFeedLog(null)
    } finally {
      setDetailLoading(false)
    }
  }

  const closeDetail = () => {
    setDetailOpen(false)
    setIsEditing(false)
    setSelectedFeedLog(null)
    setEditForm(emptyForm)
  }

  const handleEditChange = (field, value) => {
    setEditForm((prev) => ({ ...prev, [field]: value }))
  }

  const startEdit = () => {
    setIsEditing(true)
    setEditForm({
      seasonId: String(selectedFeedLog?.season_id || ''),
      productId: String(selectedFeedLog?.product_id || ''),
      feedingDate: toDateInput(selectedFeedLog?.feeding_date),
      feedingTime: toTimeInput(selectedFeedLog?.feeding_time),
      mealNo: String(selectedFeedLog?.meal_no || ''),
      quantityKg: String(selectedFeedLog?.quantity_kg ?? ''),
      note: selectedFeedLog?.note || '',
    })
  }

  const handleSaveEdit = async (event) => {
    event.preventDefault()

    try {
      setSaving(true)

      const updateRes = await feedLogService.updateFeedLog(selectedFeedLog.feed_log_id, {
        productId: Number(editForm.productId),
        feedingDate: editForm.feedingDate,
        feedingTime: editForm.feedingTime,
        mealNo: Number(editForm.mealNo),
        quantityKg: Number(editForm.quantityKg),
        note: editForm.note.trim() || null,
      })

      const updatedFeedLog = updateRes?.data?.data || null
      showToast({ message: 'Đã cập nhật nhật ký cho ăn thành công', type: 'success' })
      if (updatedFeedLog) {
        setSelectedFeedLog(updatedFeedLog)
      }
      setIsEditing(false)
      await refreshFeedLogs(selectedSeasonId)
    } catch (editError) {
      showToast({ message: editError?.response?.data?.message || 'Không thể cập nhật nhật ký cho ăn', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedFeedLog) return

    const confirmed = window.confirm('Bạn có chắc muốn xoá nhật ký cho ăn này không?')
    if (!confirmed) return

    try {
      setSaving(true)

      await feedLogService.deleteFeedLog(selectedFeedLog.feed_log_id)
      showToast({ message: 'Đã xoá nhật ký cho ăn thành công', type: 'success' })
      closeDetail()
      await refreshFeedLogs(selectedSeasonId)
    } catch (deleteError) {
      showToast({ message: deleteError?.response?.data?.message || 'Không thể xoá nhật ký cho ăn', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const selectedSeasonLabel = useMemo(() => {
    const matchedSeason = seasons.find((season) => String(season.season_id) === String(form.seasonId))
    if (!matchedSeason) return '-'
    return `${matchedSeason.season_name || `Mùa vụ ${matchedSeason.season_id}`} - Ao ${matchedSeason.pond_id}`
  }, [seasons, form.seasonId])

  const handleSubmit = async (event) => {
    event.preventDefault()

    try {
      setSaving(true)

      await feedLogService.createFeedLog({
        seasonId: Number(form.seasonId),
        productId: Number(form.productId),
        feedingDate: form.feedingDate,
        feedingTime: form.feedingTime,
        mealNo: Number(form.mealNo),
        quantityKg: Number(form.quantityKg),
        note: form.note.trim() || null,
      })

      showToast({ message: 'Đã ghi nhật ký cho ăn thành công', type: 'success' })
      setForm((prev) => ({
        ...emptyForm,
        seasonId: prev.seasonId,
      }))

      await refreshFeedLogs(form.seasonId)
    } catch (submitError) {
      showToast({ message: submitError?.response?.data?.message || 'Không thể lưu nhật ký cho ăn', type: 'error' })
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

      {/* Notifications handled by global toast */}

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
        <p className="staff-feed-subtitle">{selectedSeasonLabel}</p>
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
                  <th>Hành động</th>
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
                    <td>
                      <button className="staff-feed-link-button" type="button" onClick={() => openDetail(item)}>
                        Xem chi tiết
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {detailOpen && selectedFeedLog && (
        <div className="modal" onClick={closeDetail}>
          <div className="modal-content staff-feed-modal" onClick={(event) => event.stopPropagation()}>
            <div className="staff-feed-modal-header">
              <div>
                <h3>{isEditing ? 'Sửa nhật ký cho ăn' : 'Chi tiết nhật ký cho ăn'}</h3>
                <p>Mã nhật ký: #{selectedFeedLog.feed_log_id}</p>
              </div>
              <button className="staff-feed-icon-button" type="button" onClick={closeDetail}>
                Đóng
              </button>
            </div>

            {detailLoading ? (
              <p>Đang tải chi tiết...</p>
            ) : isEditing ? (
              <form onSubmit={handleSaveEdit}>
                <div className="staff-feed-grid two-col">
                  <div>
                    <label>Mùa vụ</label>
                    <input value={selectedSeasonLabel} disabled />
                  </div>
                  <div>
                    <label>Loại thức ăn</label>
                    <select
                      value={editForm.productId}
                      onChange={(e) => handleEditChange('productId', e.target.value)}
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
                      value={editForm.feedingDate}
                      onChange={(e) => handleEditChange('feedingDate', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label>Giờ cho ăn</label>
                    <input
                      type="time"
                      value={editForm.feedingTime}
                      onChange={(e) => handleEditChange('feedingTime', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label>Cữ ăn</label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={editForm.mealNo}
                      onChange={(e) => handleEditChange('mealNo', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label>Số lượng (kg)</label>
                    <input
                      type="number"
                      min="0.1"
                      step="0.1"
                      value={editForm.quantityKg}
                      onChange={(e) => handleEditChange('quantityKg', e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label>Ghi chú</label>
                  <textarea
                    rows="3"
                    value={editForm.note}
                    onChange={(e) => handleEditChange('note', e.target.value)}
                  />
                </div>

                <div className="staff-feed-modal-actions">
                  <button type="button" className="staff-feed-secondary-button" onClick={() => setIsEditing(false)}>
                    Huỷ sửa
                  </button>
                  <button type="submit" className="staff-feed-primary-button" disabled={saving}>
                    {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="staff-feed-detail-grid">
                <div><strong>Mùa vụ:</strong> {selectedSeasonLabel}</div>
                <div><strong>Loại thức ăn:</strong> {selectedFeedLog.product_name || '-'}</div>
                <div><strong>Ngày cho ăn:</strong> {toIsoDate(selectedFeedLog.feeding_date)}</div>
                <div><strong>Giờ cho ăn:</strong> {selectedFeedLog.feeding_time || '-'}</div>
                <div><strong>Cữ ăn:</strong> {selectedFeedLog.meal_no}</div>
                <div><strong>Số lượng (kg):</strong> {selectedFeedLog.quantity_kg}</div>
                <div><strong>Ghi chú:</strong> {selectedFeedLog.note || '-'}</div>
                <div><strong>Người tạo:</strong> {selectedFeedLog.created_by_name || '-'}</div>
              </div>
            )}

            {!isEditing && (
              <div className="staff-feed-modal-actions">
                <button type="button" className="staff-feed-secondary-button" onClick={startEdit} disabled={saving}>
                  Sửa
                </button>
                <button type="button" className="staff-feed-danger-button" onClick={handleDelete} disabled={saving}>
                  {saving ? 'Đang xoá...' : 'Xoá'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default WorkerFeedLogs
