import React, { useEffect, useMemo, useState } from 'react'
import { pondService, sensorService } from '../../services/api'
import { showToast } from '../../utils/toast'
import '../../styles/dashboard.css'
import '../../styles/technician/technician-layout.css'
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
  const [searchTerm, setSearchTerm] = useState('')
  const [pondFilter, setPondFilter] = useState('ALL')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [pageSize, setPageSize] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
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
    } catch (err) {
      showToast({ title: err?.response?.data?.message || 'Không tải được dữ liệu cảm biến', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const pondOptions = useMemo(() => ponds, [ponds])

  const normalizeType = (type) => String(type || '').trim().toLowerCase()

  const normalizeStatus = (status) => {
    const value = String(status || '').trim().toUpperCase()
    if (['ACTIVE', 'HOAT_DONG', 'ONLINE'].includes(value)) return 'ACTIVE'
    if (['INACTIVE', 'OFFLINE', 'NGOAI_TUYEN'].includes(value)) return 'INACTIVE'
    return value || 'INACTIVE'
  }

  const getStatusLabel = (status) => {
    switch (normalizeStatus(status)) {
      case 'ACTIVE':
        return 'Hoạt động'
      case 'INACTIVE':
        return 'Ngoại tuyến'
      default:
        return 'Ngoại tuyến'
    }
  }

  const getTypeLabel = (sensorType) => {
    switch (normalizeType(sensorType)) {
      case 'ph':
        return 'Độ pH'
      case 'temperature':
        return 'Nhiệt độ nước'
      case 'dissolved oxygen':
        return 'Oxy hòa tan'
      case 'salinity':
        return 'Độ mặn'
      case 'water level':
      case 'turbidity':
        return 'Độ đục'
      default:
        return sensorType || '-'
    }
  }

  const getSensorBadge = (sensorType) => {
    switch (normalizeType(sensorType)) {
      case 'ph':
        return 'pH'
      case 'temperature':
        return '°C'
      case 'dissolved oxygen':
        return 'O2'
      case 'salinity':
        return 'Na'
      case 'water level':
      case 'turbidity':
        return 'NTU'
      default:
        return 'SN'
    }
  }

  const getDisplayValue = (sensor) => {
    const value = sensor.current_value
    if (value === null || value === undefined || Number.isNaN(Number(value))) return '-'

    const num = Number(value)
    const type = normalizeType(sensor.sensor_type)
    if (type === 'temperature') return `${num.toFixed(1)}°C`
    if (type === 'dissolved oxygen') return `${num.toFixed(1)} mg/L`
    if (type === 'ph') return `${num.toFixed(1)} pH`
    if (type === 'salinity') return `${num.toFixed(1)} ppt`
    if (type === 'water level' || type === 'turbidity') return `${num.toFixed(1)} NTU`
    return `${num.toFixed(1)}`
  }

  const formatDateTime = (raw) => {
    if (!raw) return '-'
    const d = new Date(raw)
    if (Number.isNaN(d.getTime())) return '-'
    return d.toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  const resetToFirstPage = () => {
    setCurrentPage(1)
  }

  const filteredSensors = useMemo(() => {
    return sensors.filter((sensor) => {
      const normalizedSearch = searchTerm.trim().toLowerCase()
      const searchMatched =
        !normalizedSearch ||
        String(sensor.sensor_name || '').toLowerCase().includes(normalizedSearch) ||
        String(sensor.serial_number || '').toLowerCase().includes(normalizedSearch) ||
        String(sensor.sensor_id || '').toLowerCase().includes(normalizedSearch)

      const sensorPondId = String(sensor.pond_id || '')
      const pondMatched = pondFilter === 'ALL' || String(pondFilter) === sensorPondId

      const sensorType = normalizeType(sensor.sensor_type)
      const typeMatched = typeFilter === 'ALL' || sensorType === normalizeType(typeFilter)

      const statusMatched = statusFilter === 'ALL' || normalizeStatus(sensor.status) === statusFilter

      return searchMatched && pondMatched && typeMatched && statusMatched
    })
  }, [sensors, searchTerm, pondFilter, typeFilter, statusFilter])

  const stats = useMemo(() => {
    const total = sensors.length
    const active = sensors.filter((item) => normalizeStatus(item.status) === 'ACTIVE').length
    const inactive = sensors.filter((item) => normalizeStatus(item.status) === 'INACTIVE').length
    return { total, active, inactive }
  }, [sensors])

  const totalPages = Math.max(1, Math.ceil(filteredSensors.length / pageSize))
  const safePage = Math.min(currentPage, totalPages)
  const startIndex = (safePage - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, filteredSensors.length)
  const paginatedSensors = filteredSensors.slice(startIndex, endIndex)

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

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
          turbidity: 'TURB',
          'water level': 'TURB',
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
      const wasEditing = !!editingId
      if (wasEditing) {
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
      showToast({ title: wasEditing ? 'Cập nhật cảm biến thành công' : 'Thêm cảm biến thành công', type: 'success' })
    } catch (err) {
      showToast({ title: err?.response?.data?.message || 'Không tạo được cảm biến', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (sensorId) => {
    if (!window.confirm('Bạn có chắc muốn xóa cảm biến này?')) return
    try {
      await sensorService.deleteSensor(sensorId)
      await fetchData()
      showToast({ title: 'Đã xóa cảm biến', type: 'success' })
    } catch (err) {
      showToast({ title: err?.response?.data?.message || 'Không xóa được cảm biến', type: 'error' })
    }
  }

  return (
    <div className="dashboard technician-sensors technician-page-shell">
      <div className="technician-sensors_title-block">
        <h2>Quản lý cảm biến</h2>
        <p>Theo dõi và quản lý các cảm biến trong hệ thống ao tôm</p>
      </div>

      {/* Notifications handled by global toast */}

      <section className="technician-sensors_stats-grid">
        <article className="technician-sensors_stat-card">
          <span className="technician-sensors_stat-icon technician-sensors_stat-icon--blue">◈</span>
          <div>
            <p className="technician-sensors_stat-label">Tổng cảm biến</p>
            <h3 className="technician-sensors_stat-value">{stats.total}</h3>
          </div>
        </article>
        <article className="technician-sensors_stat-card">
          <span className="technician-sensors_stat-icon technician-sensors_stat-icon--green">◉</span>
          <div>
            <p className="technician-sensors_stat-label">Cảm biến đang hoạt động</p>
            <h3 className="technician-sensors_stat-value">{stats.active}</h3>
          </div>
        </article>
        <article className="technician-sensors_stat-card">
          <span className="technician-sensors_stat-icon technician-sensors_stat-icon--red">✕</span>
          <div>
            <p className="technician-sensors_stat-label">Cảm biến ngoại tuyến</p>
            <h3 className="technician-sensors_stat-value">{stats.inactive}</h3>
          </div>
        </article>
      </section>

      <section className="technician-sensors_panel">
        <div className="technician-sensors_toolbar">
          <div className="technician-sensors_search-wrap">
            <span className="technician-sensors_search-icon">⌕</span>
            <input
              type="text"
              value={searchTerm}
              placeholder="Tìm kiếm cảm biến..."
              onChange={(e) => {
                setSearchTerm(e.target.value)
                resetToFirstPage()
              }}
            />
          </div>

          <select
            value={pondFilter}
            onChange={(e) => {
              setPondFilter(e.target.value)
              resetToFirstPage()
            }}
          >
            <option value="ALL">Tất cả ao</option>
            {pondOptions.map((pond) => (
              <option key={pond.pond_id} value={pond.pond_id}>
                {pond.pond_code} - {pond.pond_name}
              </option>
            ))}
          </select>

          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value)
              resetToFirstPage()
            }}
          >
            <option value="ALL">Tất cả loại cảm biến</option>
            <option value="pH">Độ pH</option>
            <option value="temperature">Nhiệt độ</option>
            <option value="dissolved oxygen">Oxy hòa tan</option>
            <option value="salinity">Độ mặn</option>
            <option value="turbidity">Độ đục</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              resetToFirstPage()
            }}
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Hoạt động</option>
            <option value="INACTIVE">Ngoại tuyến</option>
          </select>

          <button className="btn btn-primary technician-sensors_create-btn" onClick={openCreateModal}>
            + Thêm cảm biến
          </button>
        </div>

        <div className="table-wrapper">
          <table className="technician-sensors_table">
            <thead>
              <tr>
                <th>Avatar</th>
                <th>Tên cảm biến</th>
                <th>Loại cảm biến</th>
                <th>Ao nuôi</th>
                <th>Giá trị hiện tại</th>
                <th>Trạng thái</th>
                <th>Lần cập nhật cuối</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="technician-sensors_empty-row">Đang tải dữ liệu...</td>
                </tr>
              ) : paginatedSensors.length === 0 ? (
                <tr>
                  <td colSpan="8" className="technician-sensors_empty-row">Không có cảm biến phù hợp bộ lọc</td>
                </tr>
              ) : (
                paginatedSensors.map((sensor) => (
                  <tr key={sensor.sensor_id}>
                    <td>
                      <span className="technician-sensors_avatar-chip">{getSensorBadge(sensor.sensor_type)}</span>
                    </td>
                    <td>{sensor.sensor_name || '-'}</td>
                    <td>{getTypeLabel(sensor.sensor_type)}</td>
                    <td>{getPondName(sensor.pond_id)}</td>
                    <td className="technician-sensors_value-cell">{getDisplayValue(sensor)}</td>
                    <td>
                      <span className={`technician-sensors_status technician-sensors_status--${normalizeStatus(sensor.status).toLowerCase()}`}>
                        {getStatusLabel(sensor.status)}
                      </span>
                    </td>
                    <td>{formatDateTime(sensor.last_updated)}</td>
                    <td>
                      <div className="technician-sensors_table-actions">
                        <button className="btn btn-sm btn-secondary" onClick={() => openEditModal(sensor)} title="Sửa">
                          ✎
                        </button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(sensor.sensor_id)} title="Xóa">
                          🗑
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="technician-sensors_pagination">
          <div className="technician-sensors_pagination-left">
            <label htmlFor="technicianSensorPageSize">Số hàng trên trang:</label>
            <select
              id="technicianSensorPageSize"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value))
                setCurrentPage(1)
              }}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <span>
              {filteredSensors.length === 0 ? 0 : startIndex + 1}-{endIndex} / {filteredSensors.length}
            </span>
          </div>

          <div className="technician-sensors_pagination-right">
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={safePage <= 1}
            >
              ‹
            </button>
            <span className="technician-sensors_page-pill">{safePage}</span>
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={safePage >= totalPages}
            >
              ›
            </button>
          </div>
        </div>
      </section>

      {showModal && (
        <div className="modal" onClick={() => setShowModal(false)}>
          <div className="modal-content technician-sensors_modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="technician-sensors_modal-title">{editingId ? 'Sửa cảm biến' : 'Thêm cảm biến mới'}</h3>
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

              <div className="technician-sensors_form-grid">
                <div className="form-group">
                  <label>Loại cảm biến</label>
                  <select className="input" value={form.sensorType} onChange={(e) => handleChange('sensorType', e.target.value)} required>
                    <option value="">-- Chọn loại --</option>
                    <option value="pH">pH</option>
                    <option value="temperature">Nhiệt độ</option>
                    <option value="dissolved oxygen">Oxy hoà tan</option>
                    <option value="salinity">Độ mặn</option>
                    <option value="turbidity">Độ đục</option>
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
                  <option value="ACTIVE">Hoạt động</option>
                  <option value="INACTIVE">Ngoại tuyến</option>
                </select>
              </div>

              <div className="technician-sensors_form-buttons">
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
