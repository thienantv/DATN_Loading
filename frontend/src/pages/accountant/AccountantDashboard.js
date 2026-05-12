import React, { useEffect, useMemo, useState } from 'react'
import { expenseService, seasonService } from '../../services/api'
import DashboardCard, { evaluateMetric } from '../../components/DashboardCard'
import '../../styles/dashboard.css'
import '../../styles/dashboard-cards.css'

const formatCurrency = (value) => {
  const amount = Number(value || 0)
  if (!Number.isFinite(amount)) return '0 đ'
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(amount) + ' đ'
}

const AccountantDashboard = () => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [seasons, setSeasons] = useState([])
  const [expenseTotal, setExpenseTotal] = useState(0)

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const [seasonsRes] = await Promise.all([
          seasonService.getAllSeasons(),
        ])
        const seasonData = seasonsRes?.data?.data || []
        setSeasons(seasonData)

        const activeSeason = seasonData.find((s) => String(s.status || '').toUpperCase() === 'ACTIVE')
        if (activeSeason?.season_id) {
          try {
            const totalRes = await expenseService.getTotalExpenseBySeason(activeSeason.season_id)
            setExpenseTotal(totalRes?.data?.data?.total_expense || 0)
          } catch (err) {
            setExpenseTotal(0)
          }
        }

        setError('')
      } catch (err) {
        setError(err?.response?.data?.message || 'Không tải được dữ liệu')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const summary = useMemo(() => ({
    seasonCount: seasons.length,
    totalExpense: expenseTotal,
  }), [seasons, expenseTotal])

  if (loading) return (
    <div className="dashboard">
      <div className="flex-center" style={{ minHeight: '400px' }}>
        <div className="spinner" />
      </div>
    </div>
  )

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>📊 Kế toán - Theo dõi chi phí</h1>
        <p>Theo dõi chi phí và ghi chép tài chính</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <section className="dashboard-cards-container">
        <DashboardCard
          title="Mùa vụ"
          value={summary.seasonCount}
          rating={evaluateMetric('ponds', summary.seasonCount)}
          description="Số mùa vụ"
        />
        <DashboardCard
          title="Tổng chi phí"
          value={summary.totalExpense}
          rating={evaluateMetric('alerts', summary.totalExpense)}
          description={formatCurrency(summary.totalExpense)}
        />
      </section>

      <div className="recent-section" style={{ marginTop: 20 }}>
        <h2>📌 Tính năng chính</h2>
        <div className="info-boxes">
          <div className="info-box">
            <h3>✨ Quyền hạn</h3>
            <ul>
              <li>✅ Xem tổng chi phí theo mùa vụ</li>
              <li>✅ Ghi nhận chi phí</li>
              <li>✅ Phân loại & xuất báo cáo cơ bản</li>
            </ul>
          </div>

          <div className="info-box">
            <h3>🔒 Giới hạn</h3>
            <ul>
              <li>❌ Không quản lý ao</li>
              <li>❌ Không quản lý công việc</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AccountantDashboard
