import React, { useEffect, useMemo, useState } from 'react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { feedLogService, seasonService, productService } from '../../services/api'
import '../../styles/dashboard.css'
import '../../styles/manager/manager-common.css'
import '../../styles/manager/manager-feed-logs.css'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

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
  if (value === null || value === undefined || value === '') return '0'
  const numberValue = Number(value)
  if (Number.isNaN(numberValue)) return String(value)
  return String(Math.round(numberValue))
}

const ManagerFeedLogs = () => {
  const [seasons, setSeasons] = useState([])
  const [selectedSeasonId, setSelectedSeasonId] = useState('')
  const [feedLogs, setFeedLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingLogs, setLoadingLogs] = useState(false)
  const [error, setError] = useState('')
  const [products, setProducts] = useState([])
  const [showProductModal, setShowProductModal] = useState(false)
  const [productName, setProductName] = useState('')
  const [productCategory, setProductCategory] = useState('')
  const [productUnit, setProductUnit] = useState('kg')
  const [productPrice, setProductPrice] = useState('')
  const [productDesc, setProductDesc] = useState('')
  const [productSaving, setProductSaving] = useState(false)
  const [productError, setProductError] = useState('')
  const [productSuccess, setProductSuccess] = useState('')
  const [editingProductId, setEditingProductId] = useState(null)
  const [editingProductName, setEditingProductName] = useState('')
  const [editingProductCategory, setEditingProductCategory] = useState('')
  const [editingProductUnit, setEditingProductUnit] = useState('kg')
  const [editingProductPrice, setEditingProductPrice] = useState('')
  const [editingProductDesc, setEditingProductDesc] = useState('')

  useEffect(() => {
    fetchSeasons()
    fetchProducts()
  }, [])

  useEffect(() => {
    if (selectedSeasonId) {
      fetchFeedLogs(selectedSeasonId)
    } else {
      setFeedLogs([])
    }
  }, [selectedSeasonId])

  const fetchSeasons = async () => {
    try {
      setLoading(true)
      const seasonsRes = await seasonService.getAllSeasons()
      const seasonList = seasonsRes?.data?.data || []
      setSeasons(seasonList)
      if (seasonList.length > 0) {
        setSelectedSeasonId(String(seasonList[0].season_id))
      }
      setError('')
    } catch (err) {
      setError(err?.response?.data?.message || 'Không tải được danh sách mùa vụ')
    } finally {
      setLoading(false)
    }
  }

  const fetchFeedLogs = async (seasonId) => {
    try {
      setLoadingLogs(true)
      const res = await feedLogService.getFeedLogsBySeasonId(seasonId)
      setFeedLogs(res?.data?.data || [])
      setError('')
    } catch (err) {
      setError(err?.response?.data?.message || 'Không tải được nhật ký cho ăn')
      setFeedLogs([])
    } finally {
      setLoadingLogs(false)
    }
  }

  const fetchProducts = async () => {
    try {
      const res = await productService.getAllProducts()
      setProducts(res?.data?.data || [])
    } catch (err) {
      // ignore silently
    }
  }

  const handleCreateProduct = async (e) => {
    e?.preventDefault()
    setProductError('')
    setProductSuccess('')
    if (!productName.trim()) {
      setProductError('Vui lòng nhập tên sản phẩm')
      return
    }
    try {
      setProductSaving(true)
      await productService.createProduct({ productName: productName.trim(), category: productCategory.trim(), unit: productUnit, price: productPrice ? Number(productPrice) : null, description: productDesc.trim() })
      await fetchProducts()
      setProductSuccess('Đã tạo sản phẩm')
      setProductName('')
      setProductCategory('')
      setProductUnit('kg')
      setProductPrice('')
      setProductDesc('')
    } catch (err) {
      setProductError(err?.response?.data?.message || 'Không thể tạo sản phẩm')
    } finally {
      setProductSaving(false)
    }
  }

  const handleStartEditProduct = (p) => {
    setEditingProductId(p.product_id)
    setEditingProductName(p.product_name || '')
    setEditingProductCategory(p.category || '')
    setEditingProductUnit(p.unit || 'kg')
    setEditingProductPrice(p.price || '')
    setEditingProductDesc(p.description || '')
    setProductError('')
    setProductSuccess('')
  }

  const handleCancelEditProduct = () => {
    setEditingProductId(null)
  }

  const handleSaveEditProduct = async (e) => {
    e?.preventDefault()
    if (!editingProductName.trim()) {
      setProductError('Vui lòng nhập tên sản phẩm')
      return
    }
    try {
      setProductSaving(true)
      await productService.updateProduct(editingProductId, { productName: editingProductName.trim(), category: editingProductCategory.trim(), unit: editingProductUnit, price: editingProductPrice ? Number(editingProductPrice) : null, description: editingProductDesc.trim() })
      await fetchProducts()
      setProductSuccess('Đã cập nhật sản phẩm')
      setEditingProductId(null)
    } catch (err) {
      setProductError(err?.response?.data?.message || 'Không thể cập nhật sản phẩm')
    } finally {
      setProductSaving(false)
    }
  }

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Bạn có chắc muốn xoá sản phẩm này?')) return
    try {
      setProductSaving(true)
      await productService.deleteProduct(productId)
      await fetchProducts()
      setProductSuccess('Đã xoá sản phẩm')
    } catch (err) {
      setProductError(err?.response?.data?.message || 'Không thể xoá sản phẩm')
    } finally {
      setProductSaving(false)
    }
  }

  const getSeasonLabel = (season) => {
    if (!season) return '-'
    const seasonName = season.season_name || `Mùa vụ ${season.season_id}`
    return `${seasonName} - Ao ${season.pond_id}`
  }

  const summary = useMemo(() => {
    const totalQuantity = feedLogs.reduce((sum, log) => sum + (Number(log.quantity_kg) || 0), 0)
    const dailyMap = new Map()

    feedLogs.forEach((log) => {
      const key = log.feeding_date ? formatVietnameseDate(log.feeding_date) : '-'
      const current = dailyMap.get(key) || 0
      dailyMap.set(key, current + (Number(log.quantity_kg) || 0))
    })

    const labels = Array.from(dailyMap.keys())
    const values = Array.from(dailyMap.values()).map((value) => Math.round(value))

    return {
      totalQuantity: Math.round(totalQuantity),
      labels,
      values,
    }
  }, [feedLogs])

  const chartData = useMemo(() => ({
    labels: summary.labels,
    datasets: [
      {
        label: 'Tổng lượng thức ăn (kg)',
        data: summary.values,
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37, 99, 235, 0.12)',
        tension: 0.35,
        fill: true,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  }), [summary.labels, summary.values])

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => formatRoundedNumber(value),
        },
      },
    },
  }

  const selectedSeason = seasons.find((season) => String(season.season_id) === String(selectedSeasonId))

  return (
    <>
    <div className="dashboard-container manager-page">
      <div className="manager-feed-logs__header">
        <div>
          <h2>Theo dõi hoạt động cho ăn</h2>
          <p>Manager chỉ xem để theo dõi tổng lượng thức ăn và xu hướng theo mùa vụ.</p>
        </div>
        <div className="manager-feed-logs__controls">
          <select
            className="input"
            value={selectedSeasonId}
            onChange={(e) => setSelectedSeasonId(e.target.value)}
          >
            <option value="">-- Chọn mùa vụ --</option>
            {seasons.map((season) => (
              <option key={season.season_id} value={season.season_id}>
                {getSeasonLabel(season)}
              </option>
            ))}
          </select>
          <button className="btn btn-secondary" onClick={() => setShowProductModal(true)}>➕ Thêm danh mục thức ăn</button>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="manager-feed-logs__summary-grid">
        <div className="card">
          <h3>Tổng lượng thức ăn</h3>
          <p className="manager-feed-logs__stat-value">{summary.totalQuantity} kg</p>
        </div>
        <div className="card">
          <h3>Số bản ghi</h3>
          <p className="manager-feed-logs__stat-value">{feedLogs.length}</p>
        </div>
        <div className="card">
          <h3>Mùa vụ</h3>
          <p className="manager-feed-logs__season-label">{selectedSeason ? getSeasonLabel(selectedSeason) : 'Chưa chọn'}</p>
          <p className="manager-feed-logs__season-sub">{selectedSeason ? formatVietnameseDate(selectedSeason.start_date) : '-'}</p>
        </div>
      </div>

      <div className="card manager-feed-logs__chart-card">
        <h3>Xu hướng cho ăn theo ngày</h3>
        {loadingLogs ? (
          <div className="manager-feed-logs__loading">Đang tải dữ liệu...</div>
        ) : summary.labels.length > 0 ? (
          <Line data={chartData} options={chartOptions} />
        ) : (
          <div className="manager-feed-logs__chart-empty">Chưa có dữ liệu để hiển thị xu hướng</div>
        )}
      </div>

      <div className="card">
        <h3>Danh sách cho ăn</h3>
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Ngày</th>
                <th>Giờ</th>
                <th>Sản phẩm</th>
                <th>Lần ăn</th>
                <th>Lượng (kg)</th>
                <th>Người ghi</th>
                <th>Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              {loading || loadingLogs ? (
                <tr><td colSpan="7">Đang tải...</td></tr>
              ) : feedLogs.length === 0 ? (
                <tr><td colSpan="7">Chưa có nhật ký cho ăn</td></tr>
              ) : (
                feedLogs.map((log) => (
                  <tr key={log.feed_log_id}>
                    <td>{formatVietnameseDate(log.feeding_date)}</td>
                    <td>{log.feeding_time || '-'}</td>
                    <td>{log.product_name || 'N/A'}</td>
                    <td>{log.meal_no || '-'}</td>
                    <td>{formatRoundedNumber(log.quantity_kg)}</td>
                    <td>{log.created_by_name || 'Hệ thống'}</td>
                    <td>{log.note || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    {showProductModal && (
        <div className="modal" onClick={() => setShowProductModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>📦 Quản lý sản phẩm thức ăn</h2>
            {productError && <div className="alert alert-error">{productError}</div>}
            {productSuccess && <div className="alert alert-success">{productSuccess}</div>}

            <div className="manager-feed-logs__products-list">
              {products.length === 0 && <div>Chưa có sản phẩm nào.</div>}
              {products.map((p) => (
                <div key={p.product_id} className="manager-feed-logs__product-row">
                  {editingProductId === p.product_id ? (
                    <form className="manager-feed-logs__product-edit-form" onSubmit={handleSaveEditProduct}>
                      <input value={editingProductName} onChange={(e) => setEditingProductName(e.target.value)} required />
                      <button type="submit" className="btn btn-primary" disabled={productSaving}>Lưu</button>
                      <button type="button" className="btn btn-secondary" onClick={handleCancelEditProduct}>Hủy</button>
                    </form>
                  ) : (
                    <>
                      <div className="manager-feed-logs__product-name">{p.product_name}</div>
                      <div className="manager-feed-logs__product-actions">
                        <button type="button" className="btn" onClick={() => handleStartEditProduct(p)}>Sửa</button>
                        <button type="button" className="btn btn-danger" onClick={() => handleDeleteProduct(p.product_id)}>Xoá</button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            <hr className="manager-feed-logs__divider" />

            <h3>➕ Thêm sản phẩm mới</h3>
            <form onSubmit={handleCreateProduct}>
              <div className="form-group">
                <label>Tên sản phẩm *</label>
                <input type="text" value={productName} onChange={(e) => setProductName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Đơn vị</label>
                <input type="text" value={productUnit} onChange={(e) => setProductUnit(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Giá (tùy chọn)</label>
                <input type="number" value={productPrice} onChange={(e) => setProductPrice(e.target.value)} />
              </div>
              <div className="manager-feed-logs__form-actions">
                <button type="submit" className="btn btn-primary" disabled={productSaving}>{productSaving ? 'Đang lưu...' : 'Lưu sản phẩm'}</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowProductModal(false)}>Đóng</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
    </>
  )
}

export default ManagerFeedLogs
