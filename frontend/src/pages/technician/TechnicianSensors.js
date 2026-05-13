import React, { useEffect, useMemo, useState } from 'react'
import { pondService, sensorService } from '../../services/api'
import '../../styles/dashboard.css'
import '../../styles/technician/technician-sensors.css'

const emptyForm = {
  pondId: '',
  sensorName: '',
  sensorType: '',
  serialNumber: '',
  status: 'ACTIVE',
}

const TechnicianSensors = () => {
  const [sensors, setSensors] = useState([])
  const [ponds, setPonds] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [sensorRes, pondRes] = await Promise.all([
        sensorService.getAllSensors(),
        pondService.getAllPonds(),
      ])
      setSensors(sensorRes?.data?.data || [])
      setPonds(pondRes?.data?.data || [])
      setError('')
    } catch (err) {
      setError(err?.response?.data?.message || 'Không tải được dữ liệu cảm biến')
    } finally {
      setLoading(false)
    }
  }

  const pondOptions = useMemo(() => ponds, [ponds])

  const getPondName = (pondId) => {
    if (!pondId) return '-'
    const found = pondOptions.find((pond) => String(pond.pond_id) === String(pondId))
    return found ? `${found.pond_code || ''} ${found.pond_name || ''}`.trim() : '-'
  }

  const openCreateModal = () => {
    setForm(emptyForm)
    setEditingId(null)
    setShowModal(true)
  }

  const openEditModal = (sensor) => {
    setEditingId(sensor.sensor_id)
    setForm({
      pondId: sensor.pond_id,
      sensorName: sensor.sensor_name,
      sensorType: sensor.sensor_type,
      serialNumber: sensor.serial_number || '',
      status: sensor.status || 'ACTIVE',
    })
    setShowModal(true)
  }

  const handleChange = (field, value) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value }

      // Tự động sinh mã seri khi đã chọn ao và loại cảm biến
      if ((field === 'pondId' || field === 'sensorType')) {
        const pond = pondOptions.find((p) => String(p.pond_id) === String(next.pondId))
        const pondCode = pond ? pond.pond_code : null

        const typeMap = {
          pH: 'PH',
          temperature: 'TEMP',
          'dissolved oxygen': 'DO',
          salinity: 'SAL',
          'water level': 'LEVEL',
        }

        const t = (next.sensorType || '').toString()
        const typeCode = typeMap[t]
        if (typeCode && pondCode) {
          next.serialNumber = `${typeCode}-${pondCode}`
        } else if (typeCode && next.pondId) {
          next.serialNumber = `${typeCode}-${next.pondId}`
        }
      }

      return next
    })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    try {
      setSaving(true)
      if (editingId) {
        await sensorService.updateSensor(editingId, {
          pond_id: Number(form.pondId),
          sensor_name: form.sensorName.trim(),
          sensor_type: form.sensorType.trim(),
          serial_number: form.serialNumber.trim() || null,
          status: form.status,
        })
      } else {
        await sensorService.createSensor({
          pond_id: Number(form.pondId),
          sensor_name: form.sensorName.trim(),
          sensor_type: form.sensorType.trim(),
          serial_number: form.serialNumber.trim() || null,
          status: form.status,
        })
      }
      setShowModal(false)
      setForm(emptyForm)
      setEditingId(null)
      await fetchData()
    } catch (err) {
      setError(err?.response?.data?.message || 'Không tạo được cảm biến')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (sensorId) => {
    if (!window.confirm('Bạn có chắc muốn xóa cảm biến này?')) return
    try {
      await sensorService.deleteSensor(sensorId)
      await fetchData()
    } catch (err) {
      setError(err?.response?.data?.message || 'Không xóa được cảm biến')
    }
  }

  return (
    <div className="dashboard-container">
      <div className="technician-sensors__header">
        <div>
          <h2>Quản lý cảm biến</h2>
          <p className="technician-sensors__header-description">Kỹ thuật viên thêm mới, sửa và quản lý cảm biến trong hệ thống.</p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}>
          + Thêm cảm biến
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card">
        <h3>Danh sách cảm biến</h3>
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Cảm biến</th>
                <th>Ao</th>
                <th>Loại</th>
                <th>Serial</th>
                <th>Trạng thái</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6">Đang tải...</td></tr>
              ) : sensors.length === 0 ? (
                <tr><td colSpan="6">Chưa có cảm biến nào</td></tr>
              ) : (
                sensors.map((sensor) => (
                  <tr key={sensor.sensor_id}>
                    <td>{sensor.sensor_name}</td>
                    <td>{getPondName(sensor.pond_id)}</td>
                    <td>{sensor.sensor_type}</td>
                    <td>{sensor.serial_number || '-'}</td>
                    <td>{sensor.status || '-'}</td>
                    <td className="technician-sensors__table-actions">
                      <button className="btn btn-sm btn-secondary" onClick={() => openEditModal(sensor)}>Sửa</button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(sensor.sensor_id)}>Xóa</button>
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
          <div className="modal-content technician-sensors__modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="technician-sensors__modal-title">{editingId ? 'Sửa cảm biến' : 'Thêm cảm biến mới'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Ao nuôi</label>
                <select className="input" value={form.pondId} onChange={(e) => handleChange('pondId', e.target.value)} required>
                  <option value="">-- Chọn ao --</option>
                  {pondOptions.map((pond) => (
                    <option key={pond.pond_id} value={pond.pond_id}>
                      {pond.pond_code} - {pond.pond_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Tên cảm biến</label>
                <input className="input" value={form.sensorName} onChange={(e) => handleChange('sensorName', e.target.value)} required />
              </div>

              <div className="technician-sensors__form-grid">
                <div className="form-group">
                  <label>Loại cảm biến</label>
                  <select className="input" value={form.sensorType} onChange={(e) => handleChange('sensorType', e.target.value)} required>
                    <option value="">-- Chọn loại --</option>
                    <option value="pH">pH</option>
                    <option value="temperature">Nhiệt độ</option>
                    <option value="dissolved oxygen">Oxy hoà tan</option>
                    <option value="salinity">Độ mặn</option>
                    <option value="water level">Mực nước</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Serial number (tự sinh)</label>
                  <input className="input" value={form.serialNumber} onChange={(e) => handleChange('serialNumber', e.target.value)} placeholder="Sẽ tự điền khi chọn ao và loại" />
                </div>
              </div>

              <div className="form-group">
                <label>Trạng thái</label>
                <select className="input" value={form.status} onChange={(e) => handleChange('status', e.target.value)}>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>

              <div className="technician-sensors__form-buttons">
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  💾 {saving ? 'Đang lưu' : 'Lưu cảm biến'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
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

export default TechnicianSensors
