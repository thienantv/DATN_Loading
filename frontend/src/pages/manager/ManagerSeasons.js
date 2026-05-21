import React, { useEffect, useState } from 'react'
import { seasonService, pondService } from '../../services/api'
import { showToast } from '../../utils/toast'
import '../../styles/dashboard.css'
import '../../styles/manager/manager-common.css'
import '../../styles/manager/manager-seasons.css'

const emptyCreateForm = {
  pondId: '',
  seasonName: '',
  startDate: '',
  shrimpType: '',
  density: '',
}

const emptyHarvestForm = {
  actualHarvestDate: '',
  note: '',
}

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
  if (value === null || value === undefined || value === '') return '-'
  const numberValue = Number(value)
  if (Number.isNaN(numberValue)) return value
  return String(Math.round(numberValue))
}

const ManagerSeasons = () => {
  const [seasons, setSeasons] = useState([])
  const [ponds, setPonds] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showHarvestModal, setShowHarvestModal] = useState(false)
  const [selectedSeason, setSelectedSeason] = useState(null)
  const [createForm, setCreateForm] = useState(emptyCreateForm)
  const [harvestForm, setHarvestForm] = useState(emptyHarvestForm)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [seasonsRes, pondsRes] = await Promise.all([
        seasonService.getAllSeasons(),
        pondService.getAllPonds(),
      ])
      setSeasons(seasonsRes?.data?.data || [])
      setPonds(pondsRes?.data?.data || [])
    } catch (err) {
      showToast({ title: err?.response?.data?.message || 'Không tải được dữ liệu mùa vụ', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const getPondName = (pondId) => {
    if (!pondId) return '-'
    const found = ponds.find((p) => p.pond_id === pondId)
    return found ? (found.pond_name || found.pond_code) : '-'
  }

  const openCreateModal = () => {
    setCreateForm(emptyCreateForm)
    setShowCreateModal(true)
  }

  const openHarvestModal = (season) => {
    setSelectedSeason(season)
    setHarvestForm(emptyHarvestForm)
    setShowHarvestModal(true)
  }

  const handleCreateChange = (field, value) => {
    setCreateForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleHarvestChange = (field, value) => {
    setHarvestForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleCreateSubmit = async (event) => {
    event.preventDefault()
    try {
      setSaving(true)
      await seasonService.createSeason({
        pondId: Number(createForm.pondId),
        seasonName: createForm.seasonName.trim(),
        startDate: createForm.startDate,
        shrimpType: createForm.shrimpType.trim(),
        density: Number(createForm.density),
      })
      setShowCreateModal(false)
      setCreateForm(emptyCreateForm)
      await fetchData()
    } catch (err) {
      showToast({ title: err?.response?.data?.message || 'Không tạo được mùa vụ', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleHarvestSubmit = async (event) => {
    event.preventDefault()
    try {
      setSaving(true)
      await seasonService.harvestSeason(selectedSeason.season_id, {
        actualHarvestDate: harvestForm.actualHarvestDate,
        note: harvestForm.note.trim() || null,
      })
      setShowHarvestModal(false)
      setSelectedSeason(null)
      setHarvestForm(emptyHarvestForm)
      await fetchData()
    } catch (err) {
      showToast({ title: err?.response?.data?.message || 'Không kết thúc mùa vụ', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="dashboard-container manager-page">
      {/* Errors shown via global toasts */}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3>Danh sách mùa vụ</h3>
          <button className="btn btn-primary" onClick={openCreateModal}>
            + Tạo mùa vụ mới
          </button>
        </div>
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Ao</th>
                <th>Tên mùa vụ</th>
                <th>Loại tôm</th>
                <th>Ngày thả</th>
                <th>Mật độ</th>
                <th>Dự kiến Thu hoạch</th>
                <th>Trạng thái</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="8">Đang tải...</td></tr>
              ) : seasons.length === 0 ? (
                <tr><td colSpan="8">Chưa có mùa vụ nào</td></tr>
              ) : (
                seasons.map((season) => (
                  <tr key={season.season_id}>
                    <td>{getPondName(season.pond_id)}</td>
                    <td>{season.season_name}</td>
                    <td>{season.shrimp_type}</td>
                    <td>{formatVietnameseDate(season.start_date)}</td>
                    <td>{formatRoundedNumber(season.density)}</td>
                    <td>{formatVietnameseDate(season.expected_harvest)}</td>
                    <td>
                      <span className={`manager-seasons_status ${season.status === 'RUNNING' ? 'manager-seasons_status--running' : 'manager-seasons_status--finished'}`}>
                        {season.status === 'RUNNING' ? '🔄 RUNNING' : '✓ FINISHED'}
                      </span>
                    </td>
                    <td className="manager-seasons_action-cell">
                      {season.status === 'RUNNING' && (
                        <div className="manager-seasons_table-actions">
                          <button className="btn btn-sm btn-success" title="Thu hoạch" onClick={() => openHarvestModal(season)}>🌾</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Season Modal */}
      {showCreateModal && (
        <div className="modal" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content manager-seasons_modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="manager-seasons_modal-title">Tạo mùa vụ mới</h3>
            <form onSubmit={handleCreateSubmit}>
              <div className="form-group">
                <label>Ao nuôi</label>
                <select className="input" value={createForm.pondId} onChange={(e) => handleCreateChange('pondId', e.target.value)} required>
                  <option value="">-- Chọn ao --</option>
                  {ponds.map((pond) => (
                    <option key={pond.pond_id} value={pond.pond_id}>
                      {pond.pond_code} - {pond.pond_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Tên mùa vụ</label>
                <input className="input" value={createForm.seasonName} onChange={(e) => handleCreateChange('seasonName', e.target.value)} placeholder="VD: Mùa 1/2024" required />
              </div>

              <div className="form-group">
                <label>Ngày thả (Start Date)</label>
                <input className="input" type="date" value={createForm.startDate} onChange={(e) => handleCreateChange('startDate', e.target.value)} required />
              </div>

              <div className="form-group">
                <label>Loại tôm</label>
                <input className="input" value={createForm.shrimpType} onChange={(e) => handleCreateChange('shrimpType', e.target.value)} placeholder="VD: Tôm sú, Tôm thẻ chân trắng" required />
              </div>

              <div className="form-group">
                <label>Mật độ</label>
                <input className="input" type="number" step="0.01" value={createForm.density} onChange={(e) => handleCreateChange('density', e.target.value)} placeholder="Mật độ nuôi (con/m²)" required />
              </div>

              <div className="manager-seasons_actions">
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  💾 {saving ? 'Đang tạo' : 'Tạo mùa vụ'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                  ❌ Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Harvest Season Modal */}
      {showHarvestModal && selectedSeason && (
        <div className="modal" onClick={() => setShowHarvestModal(false)}>
          <div className="modal-content manager-seasons_modal manager-seasons_modal--harvest" onClick={(e) => e.stopPropagation()}>
            <h3 className="manager-seasons_modal-title">Thu hoạch mùa vụ</h3>
            <form onSubmit={handleHarvestSubmit}>
              <div className="manager-seasons_harvest-box">
                <p><strong>Ao:</strong> {getPondName(selectedSeason.pond_id)}</p>
                <p><strong>Mùa vụ:</strong> {selectedSeason.season_name}</p>
                <p><strong>Loại tôm:</strong> {selectedSeason.shrimp_type}</p>
                <p><strong>Ngày thả:</strong> {formatVietnameseDate(selectedSeason.start_date)}</p>
              </div>

              <div className="form-group">
                <label>Ngày Thu hoạch (Actual Harvest)</label>
                <input className="input" type="date" value={harvestForm.actualHarvestDate} onChange={(e) => handleHarvestChange('actualHarvestDate', e.target.value)} required />
              </div>

              <div className="form-group">
                <label>Ghi chú</label>
                <textarea className="input" value={harvestForm.note} onChange={(e) => handleHarvestChange('note', e.target.value)} placeholder="Ghi chú về mùa vụ (tùy chọn)" rows="3"></textarea>
              </div>

              <div className="manager-seasons_actions">
                <button type="submit" className="btn btn-success" disabled={saving}>
                  🎯 {saving ? 'Đang lưu' : 'Thu hoạch'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowHarvestModal(false)}>
                  ❌ Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default ManagerSeasons
