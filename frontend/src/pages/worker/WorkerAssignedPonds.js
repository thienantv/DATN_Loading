import React, { useEffect, useMemo, useState } from 'react'
import { pondService, seasonService } from '../../services/api'
import { showToast } from '../../utils/toast'
import PondChartCard from '../../components/charts/PondChartCard'
import '../../styles/worker/worker-assigned-ponds.css'

const getPondStatusText = (status) => {
  const normalized = String(status || '').toUpperCase()
  const map = {
    DANG_NUOI: 'Đang nuôi',
    DANG_CAI_TAO: 'Đang cải tạo',
    TAM_NGUNG: 'Tạm ngưng',
    HOAT_DONG: 'Hoạt động',
    NGUNG_SU_DUNG: 'Ngưng sử dụng',
    READY: 'Sẵn sàng',
    RUNNING: 'Đang nuôi',
    MAINTENANCE: 'Bảo trì',
    INACTIVE: 'Tạm dừng',
  }
  return map[normalized] || (status || '-')
}

const getPondStatusClass = (status) => {
  const normalized = String(status || '').toUpperCase()
  if (normalized === 'DANG_NUOI' || normalized === 'RUNNING') return 'badge-running'
  if (normalized === 'TAM_NGUNG' || normalized === 'READY') return 'badge-ready'
  if (normalized === 'DANG_CAI_TAO' || normalized === 'MAINTENANCE') return 'badge-maintenance'
  return 'badge-default'
}

const formatArea = (value) => {
  const number = Number(value)
  if (!Number.isFinite(number)) return '-'
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(number) + ' m2'
}

const formatDepth = (value) => {
  const number = Number(value)
  if (!Number.isFinite(number)) return '-'
  return number.toFixed(1) + ' m'
}

const formatDate = (value) => {
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

const WorkerAssignedPonds = () => {
  const [loading, setLoading] = useState(true)
  const [ponds, setPonds] = useState([])
  const [runningSeasonsByPond, setRunningSeasonsByPond] = useState({})

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)

        const pondsRes = await pondService.getAllPonds()
        const assignedPonds = pondsRes?.data?.data || []
        setPonds(assignedPonds)

        const seasonResults = await Promise.all(
          assignedPonds.map(async (pond) => {
            try {
              const seasonsRes = await seasonService.getAllSeasons({ pondId: pond.pond_id })
              const seasons = seasonsRes?.data?.data || []
              const running = seasons.find((season) => {
                const status = String(season.status || '').toUpperCase()
                return status === 'RUNNING' || status === 'ACTIVE'
              })

              return [pond.pond_id, running || null]
            } catch (seasonError) {
              return [pond.pond_id, null]
            }
          })
        )

        setRunningSeasonsByPond(Object.fromEntries(seasonResults))
      } catch (loadError) {
        showToast({ title: loadError?.response?.data?.message || 'Không tải được danh sách ao được phân công', type: 'error' })
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const stats = useMemo(() => {
    const runningCount = ponds.filter((pond) => Boolean(runningSeasonsByPond[pond.pond_id])).length
    return {
      total: ponds.length,
      running: runningCount,
      idle: ponds.length - runningCount,
    }
  }, [ponds, runningSeasonsByPond])

  const statusChartData = useMemo(() => {
    const counts = {
      DANG_NUOI: 0,
      DANG_CAI_TAO: 0,
      TAM_NGUNG: 0,
    }

    ponds.forEach((pond) => {
      const normalized = String(pond.status || '').toUpperCase()
      if (normalized in counts) counts[normalized] += 1
    })

    return [
      { label: 'Đang nuôi', value: counts.DANG_NUOI, color: '#22c55e' },
      { label: 'Đang cải tạo', value: counts.DANG_CAI_TAO, color: '#f59e0b' },
      { label: 'Tạm ngưng', value: counts.TAM_NGUNG, color: '#0ea5e9' },
    ]
  }, [ponds])

  const seasonChartData = useMemo(
    () => [
      { label: 'Có mùa vụ chạy', value: stats.running, color: '#14b8a6' },
      { label: 'Chưa có mùa vụ chạy', value: stats.idle, color: '#ef4444' },
    ],
    [stats]
  )

  const areaChartData = useMemo(
    () =>
      [...ponds]
        .sort((a, b) => Number(b.area_m2 || 0) - Number(a.area_m2 || 0))
        .slice(0, 6)
        .map((pond, index) => ({
          label: String(pond.pond_name || pond.pond_code || `Ao ${index + 1}`).split(' ').slice(-1)[0],
          value: Number(pond.area_m2) || 0,
          color: ['#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#a855f7', '#14b8a6'][index % 6],
        })),
    [ponds]
  )

  return (
    <div className="staff-ponds-page">
      <div className="staff-ponds-header">
        <h1>Ao được phân công</h1>
        <p>Danh sách ao bạn đang phụ trách và mùa vụ đang chạy tương ứng.</p>
      </div>

      {/* Notifications handled by global toast */}

      <section className="staff-ponds-summary">
        <article>
          <span>Tổng ao phụ trách</span>
          <strong>{stats.total}</strong>
        </article>
        <article>
          <span>Ao có mùa vụ chạy</span>
          <strong>{stats.running}</strong>
        </article>
        <article>
          <span>Ao chưa có mùa vụ chạy</span>
          <strong>{stats.idle}</strong>
        </article>
      </section>

      <section className="staff-ponds-charts">
        <PondChartCard prefix="staff-ponds" title="Phân bố trạng thái ao nuôi" type="doughnut" data={statusChartData} total={ponds.length} />
        <PondChartCard prefix="staff-ponds" title="Tình trạng mùa vụ" type="doughnut" data={seasonChartData} total={stats.total} />
        <PondChartCard prefix="staff-ponds" title="Diện tích các ao phụ trách" type="bar" data={areaChartData} />
      </section>

      <section className="staff-ponds-list">
        {loading ? (
          <div className="staff-ponds-loading">Đang tải dữ liệu ao...</div>
        ) : ponds.length === 0 ? (
          <div className="staff-ponds-empty">Bạn chưa được phân công ao nào.</div>
        ) : (
          ponds.map((pond) => {
            const runningSeason = runningSeasonsByPond[pond.pond_id]

            return (
              <article className="staff-pond-card" key={pond.pond_id}>
                <header>
                  <div>
                    <p className="pond-code">{pond.pond_code || `AO-${pond.pond_id}`}</p>
                    <h2>{pond.pond_name || 'Ao chưa đặt tên'}</h2>
                  </div>
                  <span className={`pond-badge ${getPondStatusClass(pond.status)}`}>
                    {getPondStatusText(pond.status)}
                  </span>
                </header>

                <div className="pond-meta-grid">
                  <div>
                    <span>Diện tích</span>
                    <strong>{formatArea(pond.area_m2)}</strong>
                  </div>
                  <div>
                    <span>Độ sâu</span>
                    <strong>{formatDepth(pond.depth_m)}</strong>
                  </div>
                </div>

                <div className="season-box">
                  <p>Mùa vụ đang chạy</p>
                  {runningSeason ? (
                    <div className="season-content">
                      <strong>{runningSeason.season_name || 'Mùa vụ hiện tại'}</strong>
                      <span>Ngày bắt đầu: {formatDate(runningSeason.start_date)}</span>
                    </div>
                  ) : (
                    <div className="season-empty">Hiện chưa có mùa vụ RUNNING cho ao này.</div>
                  )}
                </div>
              </article>
            )
          })
        )}
      </section>
    </div>
  )
}

export default WorkerAssignedPonds
