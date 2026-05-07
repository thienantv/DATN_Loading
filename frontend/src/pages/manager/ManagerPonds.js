import React, { useEffect, useMemo, useState } from 'react'
import { pondService, userService } from '../../services/api'
import '../../styles/dashboard.css'

const emptyForm = {
  pondCode: '',
  pondName: '',
  area_m2: '',
  depth_m: '',
  max_density: '',
  assigned_staff: '',
}

const formatRoundedNumber = (value) => {
  if (value === null || value === undefined || value === '') return '-'
  const numberValue = Number(value)
  if (Number.isNaN(numberValue)) return value
  return String(Math.round(numberValue))
}

const ManagerPonds = () => {
  const [ponds, setPonds] = useState([])
  const [staffList, setStaffList] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingPond, setEditingPond] = useState(null)
  const [form, setForm] = useState(emptyForm)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [pondRes, staffRes] = await Promise.all([
        pondService.getAllPonds(),
        userService.getStaff(),
      ])
      setPonds(pondRes?.data?.data || [])
      setStaffList(staffRes?.data?.data || [])
      setError('')
    } catch (err) {
      setError(err?.response?.data?.message || 'Không tải được dữ liệu ao nuôi')
    } finally {
      setLoading(false)
    }
  }

  const staffOptions = useMemo(() => {
    return staffList.map((staff) => ({
      id: staff.user_id,
      name: staff.full_name || staff.username,
    }))
  }, [staffList])

  const getStaffName = (id) => {
    if (!id) return '-'
    const found = staffOptions.find((s) => String(s.id) === String(id))
    return found ? found.name : '-'
  }

  const openCreateModal = () => {
    setEditingPond(null)
    setForm(emptyForm)
    setShowModal(true)
  }

  const openEditModal = (pond) => {
    setEditingPond(pond)
    setForm({
      pondCode: pond.pond_code || '',
      pondName: pond.pond_name || '',
      area_m2: pond.area_m2 ?? '',
      depth_m: pond.depth_m ?? '',
      max_density: pond.max_density ?? '',
      assigned_staff: pond.assigned_staff || '',
    })
    setShowModal(true)
  }

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    try {
      setSaving(true)
      const payload = {
        pondCode: form.pondCode.trim() || undefined,
        pondName: form.pondName.trim(),
        areaMeter: Number(form.area_m2),
        depthMeter: Number(form.depth_m),
        maxDensity: Number(form.max_density),
        assignedStaff: form.assigned_staff ? Number(form.assigned_staff) : null,
      }

      if (editingPond) {
        await pondService.updatePond(editingPond.pond_id, payload)
      } else {
        await pondService.createPond(payload)
      }

      setShowModal(false)
      setEditingPond(null)
      setForm(emptyForm)
      await fetchData()
    } catch (err) {
      setError(err?.response?.data?.message || 'Không lưu được ao nuôi')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (pondId) => {
    if (!window.confirm('Xóa ao này?')) return
    try {
      await pondService.deletePond(pondId)
      await fetchData()
    } catch (err) {
      setError(err?.response?.data?.message || 'Không xóa được ao')
    }
  }

  const handleAssignStaff = async (pondId, staffId) => {
    try {
      await pondService.assignStaff(pondId, staffId)
      await fetchData()
    } catch (err) {
      setError(err?.response?.data?.message || 'Không gán được nhân viên')
    }
  }

  return (
    <div className="dashboard-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2>Quản lý ao nuôi</h2>
          <p style={{ margin: 0, color: '#666' }}>Manager tạo ao, cập nhật ao và gán nhân viên phụ trách.</p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}>
          + Tạo ao mới
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card">
        <h3>Danh sách ao</h3>
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Mã ao</th>
                <th>Tên ao</th>
                <th>Diện tích</th>
                <th>Độ sâu</th>
                <th>Mật độ</th>
                <th>Phụ trách</th>
                <th>Trạng thái</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="8">Đang tải...</td></tr>
              ) : ponds.length === 0 ? (
                <tr><td colSpan="8">Chưa có ao nào</td></tr>
              ) : (
                ponds.map((pond) => (
                  <tr key={pond.pond_id}>
                    <td>{pond.pond_code}</td>
                    <td>{pond.pond_name}</td>
                    <td>{formatRoundedNumber(pond.area_m2)}</td>
                    <td>{formatRoundedNumber(pond.depth_m)}</td>
                    <td>{formatRoundedNumber(pond.max_density)}</td>
                    <td>{getStaffName(pond.assigned_staff)}</td>
                    <td>{pond.status}</td>
                    <td style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-secondary" onClick={() => openEditModal(pond)}>Sửa</button>
                      <button className="btn btn-danger" onClick={() => handleDelete(pond.pond_id)}>Xóa</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720 }}>
            <h3 style={{ marginTop: 0 }}>{editingPond ? 'Cập nhật ao' : 'Tạo ao mới'}</h3>
            <form onSubmit={handleSubmit}>
              {editingPond && (
                <div className="form-group">
                  <label>Mã ao</label>
                  <input className="input" value={form.pondCode} onChange={(e) => handleChange('pondCode', e.target.value)} placeholder="Để trống để tự sinh" />
                </div>
              )}

              <div className="form-group">
                <label>Tên ao</label>
                <input className="input" value={form.pondName} onChange={(e) => handleChange('pondName', e.target.value)} required />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                <div className="form-group">
                  <label>Diện tích (m2)</label>
                  <input className="input" type="number" value={form.area_m2} onChange={(e) => handleChange('area_m2', e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Độ sâu (m)</label>
                  <input className="input" type="number" value={form.depth_m} onChange={(e) => handleChange('depth_m', e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Mật độ</label>
                  <input className="input" type="number" value={form.max_density} onChange={(e) => handleChange('max_density', e.target.value)} required />
                </div>
              </div>

              <div className="form-group">
                <label>Nhân viên phụ trách</label>
                <select className="input" value={form.assigned_staff} onChange={(e) => handleChange('assigned_staff', e.target.value)} required>
                  <option value="">-- Chọn nhân viên --</option>
                  {staffOptions.map((staff) => (
                    <option key={staff.id} value={staff.id}>{staff.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={saving}>
                  💾 {saving ? 'Đang lưu' : 'Lưu'}
                </button>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowModal(false)}>
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

export default ManagerPonds
