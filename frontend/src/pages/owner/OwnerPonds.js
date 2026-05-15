import React, { useEffect, useMemo, useState } from 'react'
import { pondService, userService } from '../../services/api'
import '../../styles/dashboard.css'
import '../../styles/manager/manager-common.css'
import '../../styles/manager/manager-ponds.css'

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

const OwnerPonds = () => {
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
        userService.getWorkers(),
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
        alert('Cập nhật ao nuôi thành công')
      } else {
        await pondService.createPond(payload)
        alert('Tạo ao nuôi thành công')
      }

      setShowModal(false)
      await fetchData()
    } catch (err) {
      alert(err?.response?.data?.message || 'Lỗi khi lưu dữ liệu')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (pondId) => {
    if (window.confirm('Bạn chắc chắn muốn xóa ao nuôi này?')) {
      try {
        await pondService.deletePond(pondId)
        alert('Xóa ao nuôi thành công')
        await fetchData()
      } catch (err) {
        alert(err?.response?.data?.message || 'Lỗi khi xóa ao nuôi')
      }
    }
  }

  if (loading) {
    return (
      <div className="owner-ponds owner-page">
        <div className="flex-center" style={{ height: '100vh' }}>
          <div className="spinner"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="owner-ponds owner-page">
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Quản lý ao nuôi</h1>
          <p>Tổng số ao: {ponds.length}</p>
        </div>
        <button onClick={openCreateModal} className="btn btn-primary">
          ➕ Thêm ao mới
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ddd' }}>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Mã ao</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Tên ao</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Diện tích (m²)</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Độ sâu (m)</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Mật độ tối đa</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Người phụ trách</th>
              <th style={{ padding: '12px', textAlign: 'center', fontWeight: 600 }}>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {ponds.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ padding: '32px', textAlign: 'center', color: '#999' }}>
                  Không có ao nuôi nào. Hãy tạo ao mới để bắt đầu!
                </td>
              </tr>
            ) : (
              ponds.map((pond) => (
                <tr key={pond.pond_id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '12px' }}>{pond.pond_code}</td>
                  <td style={{ padding: '12px' }}>{pond.pond_name}</td>
                  <td style={{ padding: '12px' }}>{formatRoundedNumber(pond.area_m2)}</td>
                  <td style={{ padding: '12px' }}>{formatRoundedNumber(pond.depth_m)}</td>
                  <td style={{ padding: '12px' }}>{formatRoundedNumber(pond.max_density)}</td>
                  <td style={{ padding: '12px' }}>{getStaffName(pond.assigned_staff)}</td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <button
                      onClick={() => openEditModal(pond)}
                      className="btn btn-secondary"
                      style={{ marginRight: '8px', padding: '4px 8px', fontSize: '0.85rem' }}
                    >
                      ✏️ Sửa
                    </button>
                    <button
                      onClick={() => handleDelete(pond.pond_id)}
                      className="btn btn-danger"
                      style={{ padding: '4px 8px', fontSize: '0.85rem' }}
                    >
                      🗑️ Xóa
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal" style={{ backgroundColor: 'white', borderRadius: '8px', padding: '32px', maxWidth: '600px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ marginBottom: '24px' }}>{editingPond ? 'Sửa ao nuôi' : 'Tạo ao nuôi mới'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label htmlFor="pondCode" style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Mã ao (tùy chọn)</label>
                <input
                  id="pondCode"
                  type="text"
                  value={form.pondCode}
                  onChange={(e) => handleChange('pondCode', e.target.value)}
                  placeholder="Ví dụ: AO001"
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              </div>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label htmlFor="pondName" style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Tên ao *</label>
                <input
                  id="pondName"
                  type="text"
                  value={form.pondName}
                  onChange={(e) => handleChange('pondName', e.target.value)}
                  placeholder="Nhập tên ao"
                  required
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              </div>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label htmlFor="area_m2" style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Diện tích (m²) *</label>
                <input
                  id="area_m2"
                  type="number"
                  value={form.area_m2}
                  onChange={(e) => handleChange('area_m2', e.target.value)}
                  placeholder="Nhập diện tích"
                  required
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              </div>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label htmlFor="depth_m" style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Độ sâu (m) *</label>
                <input
                  id="depth_m"
                  type="number"
                  value={form.depth_m}
                  onChange={(e) => handleChange('depth_m', e.target.value)}
                  placeholder="Nhập độ sâu"
                  required
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              </div>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label htmlFor="max_density" style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Mật độ tối đa *</label>
                <input
                  id="max_density"
                  type="number"
                  value={form.max_density}
                  onChange={(e) => handleChange('max_density', e.target.value)}
                  placeholder="Nhập mật độ tối đa"
                  required
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              </div>
              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label htmlFor="assigned_staff" style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Người phụ trách (tùy chọn)</label>
                <select
                  id="assigned_staff"
                  value={form.assigned_staff}
                  onChange={(e) => handleChange('assigned_staff', e.target.value)}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                >
                  <option value="">-- Chọn nhân viên --</option>
                  {staffOptions.map((staff) => (
                    <option key={staff.id} value={staff.id}>
                      {staff.name}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn btn-secondary"
                  disabled={saving}
                >
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Đang lưu...' : editingPond ? 'Cập nhật' : 'Tạo mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default OwnerPonds
