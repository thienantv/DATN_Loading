import React, { useEffect, useMemo, useState } from 'react'
import { cultivationLogService, seasonService } from '../../services/api'
import { showToast } from '../../utils/toast'
import '../../styles/worker/worker-feed-logs.css'

const ACTION_OPTIONS = [
  { label: 'Thay nước', value: 'water_change' },
  { label: 'Siphon đáy', value: 'siphon_bottom' },
  { label: 'Dùng thuốc', value: 'medication' },
  { label: 'Bổ sung vi sinh', value: 'probiotics' },
  { label: 'Xử lý môi trường', value: 'env_treatment' },
]

const emptyForm = {
  seasonId: '',
  actionType: '',
  description: '',
  logDate: '',
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

const WorkerCultivationLogs = () => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [seasons, setSeasons] = useState([])
  const [logs, setLogs] = useState([])
  const [form, setForm] = useState(emptyForm)

  const selectedSeasonId = form.seasonId

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true)
        const seasonsRes = await seasonService.getAllSeasons()
        const seasonDataRaw = seasonsRes?.data?.data || []

        const allowedSeasons = seasonDataRaw.filter((season) => {
          const status = String(season.status || '').toUpperCase()
          return status === 'RUNNING' || status === 'ACTIVE' || status === 'OPEN'
        })

        setSeasons(allowedSeasons.length > 0 ? allowedSeasons : seasonDataRaw)

        if (seasonDataRaw.length > 0) {
          setForm((prev) => ({ ...prev, seasonId: String(seasonDataRaw[0].season_id) }))
        }

        // clear handled via toast
      } catch (loadError) {
        showToast({ title: loadError?.response?.data?.message || 'Không tải được dữ liệu mùa vụ', type: 'error' })
      } finally {
        setLoading(false)
      }
    }

    loadInitialData()
  }, [])

  useEffect(() => {
    const loadLogs = async () => {
      if (!selectedSeasonId) {
        setLogs([])
        return
      }

      try {
        const logsRes = await cultivationLogService.getBySeasonId(selectedSeasonId)
        setLogs(logsRes?.data?.data || [])
      } catch (loadError) {
        setLogs([])
        showToast({ title: loadError?.response?.data?.message || 'Không tải được nhật ký canh tác', type: 'error' })
      }
    }

    loadLogs()
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

      await cultivationLogService.createLog({
        seasonId: Number(form.seasonId),
        actionType: form.actionType,
        description: form.description.trim(),
        logDate: form.logDate,
      })

      showToast({ title: 'Đã ghi nhật ký canh tác thành công', type: 'success' })
      setForm((prev) => ({
        ...emptyForm,
        seasonId: prev.seasonId,
      }))

      const logsRes = await cultivationLogService.getBySeasonId(form.seasonId)
      setLogs(logsRes?.data?.data || [])
    } catch (submitError) {
      showToast({ title: submitError?.response?.data?.message || 'Không thể lưu nhật ký canh tác', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="staff-feed-page">
      <div className="staff-feed-header">
        <h1>Ghi nhật ký canh tác</h1>
        <p>Ghi lại các hoạt động xử lý ao cho mùa vụ thuộc ao bạn phụ trách.</p>
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
              <label>Ngày thực hiện</label>
              <input
                type="date"
                value={form.logDate}
                onChange={(e) => handleChange('logDate', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="staff-feed-grid two-col">
            <div>
              <label>Loại hoạt động</label>
              <select
                value={form.actionType}
                onChange={(e) => handleChange('actionType', e.target.value)}
                required
              >
                <option value="">-- Chọn loại hoạt động --</option>
                {ACTION_OPTIONS.map((action) => (
                  <option key={action.value} value={action.value}>
                    {action.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label>Nội dung xử lý</label>
              <textarea
                rows="4"
                value={form.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Ví dụ: Xử lý xong đáy ao, thay 20% nước..."
                required
              />
            </div>
          </div>

          <div className="staff-feed-actions">
            <button type="submit" disabled={loading || saving}>
              {saving ? 'Đang lưu...' : 'Lưu nhật ký'}
            </button>
          </div>
        </form>
      </section>

      <section className="staff-feed-table-card">
        <h2>Lịch sử nhật ký theo mùa vụ</h2>
        {loading ? (
          <p>Đang tải dữ liệu...</p>
        ) : logs.length === 0 ? (
          <p>Chưa có nhật ký canh tác cho mùa vụ này.</p>
        ) : (
          <div className="staff-feed-table-wrap">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Ngày thực hiện</th>
                  <th>Loại hoạt động</th>
                  <th>Nội dung xử lý</th>
                  <th>Người ghi</th>
                  <th>Trạng thái</th>
                  <th>Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const statusUpper = String(log.approval_status || 'PENDING').toUpperCase()
                  const statusDisplay =
                    statusUpper === 'APPROVED'
                      ? '✓ Đã duyệt'
                      : statusUpper === 'REJECTED'
                        ? '✗ Từ chối'
                        : statusUpper === 'LOCKED'
                          ? '🔒 Đã khóa'
                          : '⏳ Chờ duyệt'

                  return (
                    <tr key={log.log_id || `${log.season_id}-${log.log_date}`}>
                      <td>{formatDate(log.log_date)}</td>
                      <td>{ACTION_OPTIONS.find((action) => action.value === log.action_type)?.label || log.action_type}</td>
                      <td>{log.description}</td>
                      <td>{log.created_by_name || log.created_by_username || '-'}</td>
                      <td>
                        <span
                          className="status-badge"
                          style={{
                            '--status-bg': statusUpper === 'APPROVED' ? '#d4edda' : statusUpper === 'REJECTED' ? '#f8d7da' : '#e2e3e5',
                            '--status-color': statusUpper === 'APPROVED' ? '#155724' : statusUpper === 'REJECTED' ? '#721c24' : '#383d41',
                          }}
                        >
                          {statusDisplay}
                        </span>
                      </td>
                      <td className="cell-note">
                        {statusUpper === 'REJECTED' ? (
                          <span title={log.rejected_reason || 'Không có lý do'}>
                            {log.rejected_reason || '-'}
                          </span>
                        ) : statusUpper === 'APPROVED' ? (
                          'Đã được duyệt'
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

export default WorkerCultivationLogs

