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
import { feedLogService, seasonService } from '../../services/api'
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

  useEffect(() => {
    fetchSeasons()
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
    </div>
    </>
  )
}

export default ManagerFeedLogs
