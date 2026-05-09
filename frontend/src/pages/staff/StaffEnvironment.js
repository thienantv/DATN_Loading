import React, { useEffect, useMemo, useState } from 'react'
import { environmentLogService, seasonService } from '../../services/api'
import '../../styles/staff-environment.css'

const emptyForm = {
  seasonId: '',
  ph: '',
  temperature: '',
  oxygen: '',
  salinity: '',
  waterLevel: '',
}

const formatDateTime = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(date)
}

const formatNumber = (value) => {
  if (value === null || value === undefined || value === '') return '-'
  const number = Number(value)
  if (Number.isNaN(number)) return value
  return number.toString()
}

const StaffEnvironment = () => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [seasons, setSeasons] = useState([])
  const [environmentLogs, setEnvironmentLogs] = useState([])
  const [form, setForm] = useState(emptyForm)

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const seasonsRes = await seasonService.getAllSeasons()
        const seasonData = seasonsRes?.data?.data || []
        setSeasons(seasonData)

        if (seasonData.length > 0) {
          setForm((prev) => ({ ...prev, seasonId: String(seasonData[0].season_id) }))
        }

        setError('')
      } catch (loadError) {
        setError(loadError?.response?.data?.message || 'Không tải được dữ liệu mùa vụ')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  useEffect(() => {
    const loadLogs = async () => {
      if (!form.seasonId) {
        setEnvironmentLogs([])
        return
      }

      try {
        const res = await environmentLogService.getBySeasonId(form.seasonId)
        setEnvironmentLogs(res?.data?.data || [])
      } catch (loadError) {
        setEnvironmentLogs([])
        setError(loadError?.response?.data?.message || 'Không tải được dữ liệu môi trường')
      }
    }

    loadLogs()
  }, [form.seasonId])

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

      await environmentLogService.createLog({
        seasonId: Number(form.seasonId),
        ph: Number(form.ph),
        temperature: Number(form.temperature),
        oxygen: Number(form.oxygen),
        salinity: Number(form.salinity),
        waterLevel: Number(form.waterLevel),
      })

      setSuccess('Đã lưu dữ liệu môi trường thành công')
      setForm((prev) => ({
        ...emptyForm,
        seasonId: prev.seasonId,
      }))

      const res = await environmentLogService.getBySeasonId(form.seasonId)
      setEnvironmentLogs(res?.data?.data || [])
    } catch (submitError) {
      setError(submitError?.response?.data?.message || 'Không thể lưu dữ liệu môi trường')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="staff-environment-page">
      <div className="staff-environment-header">
        <h1>Nhập chỉ số môi trường</h1>
        <p>Nhập dữ liệu đo thủ công cho mùa vụ thuộc ao bạn phụ trách. Không chỉnh sửa dữ liệu realtime.</p>
      </div>

      {error && <div className="staff-environment-alert error">{error}</div>}
      {success && <div className="staff-environment-alert success">{success}</div>}

      <section className="staff-environment-card">
        <form onSubmit={handleSubmit}>
          <div className="staff-environment-grid two-col">
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
          </div>

          <div className="staff-environment-grid three-col">
            <div>
              <label>pH</label>
              <input
                type="number"
                step="0.01"
                value={form.ph}
                onChange={(e) => handleChange('ph', e.target.value)}
                required
              />
            </div>
            <div>
              <label>Nhiệt độ</label>
              <input
                type="number"
                step="0.1"
                value={form.temperature}
                onChange={(e) => handleChange('temperature', e.target.value)}
                required
              />
            </div>
            <div>
              <label>Oxy hòa tan</label>
              <input
                type="number"
                step="0.1"
                value={form.oxygen}
                onChange={(e) => handleChange('oxygen', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="staff-environment-grid two-col">
            <div>
              <label>Độ mặn</label>
              <input
                type="number"
                step="0.1"
                value={form.salinity}
                onChange={(e) => handleChange('salinity', e.target.value)}
                required
              />
            </div>
            <div>
              <label>Mực nước (cm)</label>
              <input
                type="number"
                step="1"
                value={form.waterLevel}
                onChange={(e) => handleChange('waterLevel', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="staff-environment-actions">
            <button type="submit" disabled={loading || saving}>
              {saving ? 'Đang lưu...' : 'Lưu chỉ số'}
            </button>
          </div>
        </form>
      </section>

      <section className="staff-environment-card">
        <h2>Lịch sử nhập theo mùa vụ</h2>
        {loading ? (
          <p>Đang tải dữ liệu...</p>
        ) : environmentLogs.length === 0 ? (
          <p>Chưa có dữ liệu môi trường cho mùa vụ này.</p>
        ) : (
          <div className="staff-environment-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Thời gian</th>
                  <th>pH</th>
                  <th>Nhiệt độ (°C)</th>
                  <th>Oxy (mg/l)</th>
                  <th>Độ mặn (ppt)</th>
                  <th>Mực nước (cm)</th>
                </tr>
              </thead>
              <tbody>
                {environmentLogs.map((item) => (
                  <tr key={item.log_id || item.recorded_at}>
                    <td>{formatDateTime(item.recorded_at)}</td>
                    <td>{formatNumber(item.ph)}</td>
                    <td>{formatNumber(item.temperature)}</td>
                    <td>{formatNumber(item.oxygen)}</td>
                    <td>{formatNumber(item.salinity)}</td>
                    <td>{formatNumber(item.water_level)}</td>
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

export default StaffEnvironment
