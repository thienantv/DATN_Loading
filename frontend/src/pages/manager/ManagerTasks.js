import React, { useEffect, useState, useMemo } from 'react'
import { taskService, userService, seasonService, pondService } from '../../services/api'
import '../../styles/dashboard.css'

const emptyForm = {
  task_title: '',
  description: '',
  assigned_to: '',
  due_date: '',
  season_id: '',
  pond_id: '',
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

const formatVietnameseDateTime = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(date)
}

const getStatusBadge = (status) => {
  const statusMap = {
    PENDING: { label: '⏳ Chờ làm', class: 'status-pending' },
    IN_PROGRESS: { label: '🔄 Đang làm', class: 'status-active' },
    COMPLETED: { label: '✅ Hoàn thành', class: 'status-active' },
  }
  const s = (status || 'PENDING').toString().toUpperCase()
  const badge = statusMap[s] || statusMap.PENDING
  return <span className={badge.class}>{badge.label}</span>
}

const ManagerTasks = () => {
  const [tasks, setTasks] = useState([])
  const [staffList, setStaffList] = useState([])
  const [seasons, setSeasons] = useState([])
  const [ponds, setPonds] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [filterPond, setFilterPond] = useState('ALL')
  const [form, setForm] = useState(emptyForm)
  const [detailTask, setDetailTask] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  useEffect(() => {
    fetchAllData()
  }, [])

  const fetchAllData = async () => {
    try {
      setLoading(true)
      const [tasksRes, staffRes, seasonsRes, pondsRes] = await Promise.all([
        taskService.getAllTasks(),
        userService.getStaff(),
        seasonService.getAllSeasons(),
        pondService.getAllPonds(),
      ])
      setTasks(tasksRes?.data?.data || [])
      setStaffList(staffRes?.data?.data || [])
      setSeasons(seasonsRes?.data?.data || [])
      setPonds(pondsRes?.data?.data || [])
      setError('')
    } catch (err) {
      setError(err?.response?.data?.message || 'Không tải được dữ liệu công việc')
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

  const seasonOptions = useMemo(() => {
    return seasons.map((season) => ({
      id: season.season_id,
      name: season.season_name,
    }))
  }, [seasons])

  const pondOptions = useMemo(() => {
    return ponds.map((pond) => ({
      id: pond.pond_id,
      code: pond.pond_code,
      name: pond.pond_name,
    }))
  }, [ponds])

  const getStaffName = (id) => {
    if (!id) return '-'
    const found = staffOptions.find((s) => String(s.id) === String(id))
    return found ? found.name : '-'
  }

  const getSeasonName = (id) => {
    if (!id) return '-'
    const found = seasonOptions.find((s) => String(s.id) === String(id))
    return found ? found.name : '-'
  }

  const filteredTasks = useMemo(() => {
    let result = tasks
    if (filterStatus !== 'ALL') {
      result = result.filter((t) => (t.status || 'PENDING').toString().toUpperCase() === filterStatus)
    }
    if (filterPond !== 'ALL') {
      result = result.filter((t) => String(t.pond_id) === String(filterPond))
    }
    return result
  }, [tasks, filterStatus, filterPond])

  const summary = useMemo(() => {
    return {
      total: tasks.length,
      pending: tasks.filter((t) => (t.status || 'PENDING').toString().toUpperCase() === 'PENDING').length,
      inProgress: tasks.filter((t) => (t.status || 'PENDING').toString().toUpperCase() === 'IN_PROGRESS').length,
      completed: tasks.filter((t) => (t.status || 'PENDING').toString().toUpperCase() === 'COMPLETED').length,
    }
  }, [tasks])

  const openCreateModal = () => {
    setEditingTask(null)
    setForm(emptyForm)
    setShowModal(true)
  }

  const openEditModal = (task) => {
    setEditingTask(task)
    setForm({
      task_title: task.task_title || '',
      description: task.description || '',
      assigned_to: task.assigned_to ? String(task.assigned_to) : '',
      due_date: task.due_date || '',
      season_id: task.season_id ? String(task.season_id) : '',
      pond_id: task.pond_id ? String(task.pond_id) : '',
    })
    setShowModal(true)
  }

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!form.task_title.trim()) {
      setError('Tiêu đề công việc là bắt buộc')
      return
    }

    if (!form.pond_id) {
      setError('Vui lòng chọn ao nuôi')
      return
    }

    if (!form.assigned_to) {
      setError('Vui lòng chọn nhân viên')
      return
    }

    if (!form.due_date) {
      setError('Vui lòng chọn hạn chót')
      return
    }

    try {
      setSaving(true)
      const payload = {
        task_title: form.task_title.trim(),
        description: form.description.trim(),
        assigned_to: Number(form.assigned_to),
        due_date: form.due_date,
        pond_id: Number(form.pond_id),
        season_id: form.season_id ? Number(form.season_id) : null,
      }

      if (editingTask) {
        await taskService.updateTask(editingTask.task_id, payload)
        setSuccess('Cập nhật công việc thành công')
      } else {
        await taskService.createTask(payload)
        setSuccess('Tạo công việc thành công')
      }

      setShowModal(false)
      setForm(emptyForm)
      await fetchAllData()
    } catch (err) {
      setError(err?.response?.data?.message || 'Lỗi khi lưu công việc')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Bạn chắc chắn muốn xóa công việc này?')) return

    try {
      await taskService.deleteTask(taskId)
      setSuccess('Xóa công việc thành công')
      await fetchAllData()
    } catch (err) {
      setError(err?.response?.data?.message || 'Lỗi khi xóa công việc')
    }
  }

  const handleViewDetail = async (taskId) => {
    try {
      const res = await taskService.getTaskById(taskId)
      setDetailTask(res?.data?.data || null)
      setShowDetailModal(true)
    } catch (err) {
      setError('Lỗi khi tải chi tiết công việc')
    }
  }

  if (loading) {
    return (
      <div className="dashboard">
        <div className="flex-center" style={{ minHeight: '400px' }}>
          <div className="spinner"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>📋 Quản lý công việc</h1>
        <p>Tạo công việc, giao nhân viên và theo dõi tiến độ</p>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
          <button onClick={() => setError('')} style={{ marginLeft: '10px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}>
            ×
          </button>
        </div>
      )}
      {success && (
        <div className="alert alert-success">
          {success}
          <button onClick={() => setSuccess('')} style={{ marginLeft: '10px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}>
            ×
          </button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '30px' }}>
        <div style={{ background: '#f5f5f5', padding: '16px', borderRadius: '8px', border: 'left 4px solid #3b82f6' }}>
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>Tổng công việc</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#1f2937' }}>{summary.total}</div>
        </div>
        <div style={{ background: '#fef3c7', padding: '16px', borderRadius: '8px', border: 'left 4px solid #f59e0b' }}>
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>Chờ làm</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#92400e' }}>{summary.pending}</div>
        </div>
        <div style={{ background: '#dbeafe', padding: '16px', borderRadius: '8px', border: 'left 4px solid #06b6d4' }}>
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>Đang làm</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#0c4a6e' }}>{summary.inProgress}</div>
        </div>
        <div style={{ background: '#dcfce7', padding: '16px', borderRadius: '8px', border: 'left 4px solid #22c55e' }}>
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>Hoàn thành</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#166534' }}>{summary.completed}</div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <label style={{ marginRight: '10px', fontWeight: 600 }}>Lọc ao nuôi:</label>
            <select value={filterPond} onChange={(e) => setFilterPond(e.target.value)} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
              <option value="ALL">Tất cả</option>
              {pondOptions.map((pond) => (
                <option key={pond.id} value={pond.id}>
                  {pond.code} - {pond.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ marginRight: '10px', fontWeight: 600 }}>Lọc trạng thái:</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
              <option value="ALL">Tất cả</option>
              <option value="PENDING">⏳ Chờ làm</option>
              <option value="IN_PROGRESS">🔄 Đang làm</option>
              <option value="COMPLETED">✅ Hoàn thành</option>
            </select>
          </div>
        </div>
        <button onClick={openCreateModal} style={{ background: '#3b82f6', color: 'white', padding: '10px 20px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
          + Tạo công việc
        </button>
      </div>

      <div className="table-container">
        <div className="table-header">
          <h2>Danh sách công việc ({filteredTasks.length})</h2>
        </div>

        {filteredTasks.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
            <p style={{ fontSize: '16px' }}>Không có công việc nào</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Tiêu đề</th>
                  <th>Ao nuôi</th>
                  <th>Nhân viên</th>
                  <th>Mùa vụ</th>
                  <th>Hạn chót</th>
                  <th>Trạng thái</th>
                  <th>Tạo ngày</th>
                  <th style={{ width: '180px' }}>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map((task) => (
                  <tr key={task.task_id}>
                    <td style={{ maxWidth: '180px' }}>
                      <div style={{ fontSize: '14px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {task.task_title || '-'}
                      </div>
                      {task.description && (
                        <div style={{ fontSize: '12px', color: '#666', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {task.description.substring(0, 40)}...
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ fontWeight: 500, fontSize: '13px' }}>{task.pond_code || '-'}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>{task.pond_name || '-'}</div>
                    </td>
                    <td>{getStaffName(task.assigned_to)}</td>
                    <td>{getSeasonName(task.season_id)}</td>
                    <td>{formatVietnameseDate(task.due_date)}</td>
                    <td>{getStatusBadge(task.status)}</td>
                    <td>{formatVietnameseDateTime(task.created_at)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', fontSize: '12px' }}>
                        <button onClick={() => handleViewDetail(task.task_id)} title="Xem chi tiết" style={{ padding: '6px 10px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                          👁️
                        </button>
                        <button onClick={() => openEditModal(task)} title="Sửa" style={{ padding: '6px 10px', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                          ✏️
                        </button>
                        <button onClick={() => handleDeleteTask(task.task_id)} title="Xóa" style={{ padding: '6px 10px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '8px', maxWidth: '500px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ marginBottom: '20px' }}>{editingTask ? '✏️ Sửa công việc' : '➕ Tạo công việc mới'}</h2>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>Tiêu đề *</label>
                <input type="text" value={form.task_title} onChange={(e) => handleChange('task_title', e.target.value)} placeholder="Ví dụ: Siphon đáy ao A1" style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e5e7eb' }} />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>Mô tả</label>
                <textarea value={form.description} onChange={(e) => handleChange('description', e.target.value)} placeholder="Mô tả chi tiết công việc..." style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e5e7eb', minHeight: '80px' }} />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>Ao nuôi *</label>
                <select value={form.pond_id} onChange={(e) => handleChange('pond_id', e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                  <option value="">Chọn ao nuôi</option>
                  {pondOptions.map((pond) => (
                    <option key={pond.id} value={pond.id}>
                      {pond.code} - {pond.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>Mùa vụ</label>
                <select value={form.season_id} onChange={(e) => handleChange('season_id', e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                  <option value="">Chọn mùa vụ (tùy chọn)</option>
                  {seasonOptions.map((season) => (
                    <option key={season.id} value={season.id}>
                      {season.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>Giao cho nhân viên *</label>
                <select value={form.assigned_to} onChange={(e) => handleChange('assigned_to', e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                  <option value="">Chọn nhân viên</option>
                  {staffOptions.map((staff) => (
                    <option key={staff.id} value={staff.id}>
                      {staff.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>Hạn chót *</label>
                <input type="date" value={form.due_date} onChange={(e) => handleChange('due_date', e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e5e7eb' }} />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => { setShowModal(false); setForm(emptyForm) }} style={{ padding: '10px 20px', background: '#e5e7eb', borderRadius: '6px', border: 'none', cursor: 'pointer' }}>
                  Hủy
                </button>
                <button type="submit" disabled={saving} style={{ padding: '10px 20px', background: '#3b82f6', color: 'white', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                  {saving ? 'Đang lưu...' : 'Lưu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDetailModal && detailTask && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '8px', maxWidth: '600px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ marginBottom: '20px' }}>📋 Chi tiết công việc</h2>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontWeight: 600, display: 'block', marginBottom: '4px' }}>Tiêu đề</label>
              <p style={{ color: '#333', margin: 0 }}>{detailTask.task_title || '-'}</p>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontWeight: 600, display: 'block', marginBottom: '4px' }}>Mô tả</label>
              <p style={{ color: '#333', margin: 0, whiteSpace: 'pre-wrap' }}>{detailTask.description || '-'}</p>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontWeight: 600, display: 'block', marginBottom: '4px' }}>Ao nuôi</label>
              <p style={{ color: '#333', margin: 0 }}>
                <strong>{detailTask.pond_code || '-'}</strong> - {detailTask.pond_name || '-'}
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ fontWeight: 600, display: 'block', marginBottom: '4px' }}>Giao cho</label>
                <p style={{ color: '#333', margin: 0 }}>{detailTask.assigned_to_name || '-'}</p>
              </div>
              <div>
                <label style={{ fontWeight: 600, display: 'block', marginBottom: '4px' }}>Giao bởi</label>
                <p style={{ color: '#333', margin: 0 }}>{detailTask.assigned_by_name || '-'}</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ fontWeight: 600, display: 'block', marginBottom: '4px' }}>Hạn chót</label>
                <p style={{ color: '#333', margin: 0 }}>{formatVietnameseDate(detailTask.due_date)}</p>
              </div>
              <div>
                <label style={{ fontWeight: 600, display: 'block', marginBottom: '4px' }}>Trạng thái</label>
                <p style={{ margin: 0 }}>{getStatusBadge(detailTask.status)}</p>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontWeight: 600, display: 'block', marginBottom: '4px' }}>Mùa vụ</label>
              <p style={{ color: '#333', margin: 0 }}>{detailTask.season_name || '-'}</p>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontWeight: 600, display: 'block', marginBottom: '8px' }}>Hình ảnh hoàn thành</label>
              {detailTask.images && detailTask.images.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '12px' }}>
                  {detailTask.images.map((image) => (
                    <div key={image.image_id} style={{ border: '1px solid #e5e7eb', borderRadius: '6px', overflow: 'hidden', background: '#f9fafb' }}>
                      <img src={image.image_url} alt="Task completion" style={{ width: '100%', height: '120px', objectFit: 'cover' }} onError={(e) => { e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="120" height="120"%3E%3Crect fill="%23f3f4f6" width="120" height="120"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="14" fill="%239ca3af"%3E📷%3C/text%3E%3C/svg%3E' }} />
                      <div style={{ fontSize: '11px', color: '#666', padding: '6px', textAlign: 'center' }}>
                        {formatVietnameseDateTime(image.uploaded_at)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: '#999', margin: 0 }}>Chưa có hình ảnh</p>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowDetailModal(false)} style={{ padding: '10px 20px', background: '#e5e7eb', borderRadius: '6px', border: 'none', cursor: 'pointer' }}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ManagerTasks
