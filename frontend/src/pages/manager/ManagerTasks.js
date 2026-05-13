import React, { useEffect, useState, useMemo } from 'react'
import { taskService, userService, seasonService, pondService } from '../../services/api'
import '../../styles/dashboard.css'
import '../../styles/manager/manager-common.css'
import '../../styles/manager/manager-tasks.css'

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
        userService.getWorkers(),
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
      name: `${season.season_name || `Mùa vụ ${season.season_id}`} - Ao ${season.pond_id}`,
      pondId: season.pond_id,
    }))
  }, [seasons])

  const filteredSeasonOptions = useMemo(() => {
    if (!form.pond_id) {
      return seasonOptions
    }

    return seasonOptions.filter((season) => String(season.pondId) === String(form.pond_id))
  }, [seasonOptions, form.pond_id])

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
    setForm((prev) => {
      if (field === 'pond_id') {
        return {
          ...prev,
          pond_id: value,
          season_id: '',
        }
      }

      return { ...prev, [field]: value }
    })
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

    if (form.season_id) {
      const selectedSeason = seasons.find((season) => String(season.season_id) === String(form.season_id))
      if (!selectedSeason) {
        setError('Mùa vụ không tồn tại')
        return
      }

      if (String(selectedSeason.pond_id) !== String(form.pond_id)) {
        setError('Mùa vụ phải thuộc đúng ao đã chọn')
        return
      }
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
      <div className="dashboard manager-page">
        <div className="flex-center manager-tasks__loading-container">
          <div className="spinner"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard manager-page">
      
      {error && (
        <div className="alert alert-error">
          {error}
          <button onClick={() => setError('')} className="manager-tasks__alert-close-btn">
            ×
          </button>
        </div>
      )}
      {success && (
        <div className="alert alert-success">
          {success}
          <button onClick={() => setSuccess('')} className="manager-tasks__alert-close-btn">
            ×
          </button>
        </div>
      )}

      <div className="manager-tasks__summary-cards">
        <div className="manager-tasks__summary-card manager-tasks__summary-card--total">
          <div className="manager-tasks__stat-label">Tổng công việc</div>
          <div className="manager-tasks__stat-value">{summary.total}</div>
        </div>
        <div className="manager-tasks__summary-card manager-tasks__summary-card--pending">
          <div className="manager-tasks__stat-label">Chờ làm</div>
          <div className="manager-tasks__stat-value">{summary.pending}</div>
        </div>
        <div className="manager-tasks__summary-card manager-tasks__summary-card--in-progress">
          <div className="manager-tasks__stat-label">Đang làm</div>
          <div className="manager-tasks__stat-value">{summary.inProgress}</div>
        </div>
        <div className="manager-tasks__summary-card manager-tasks__summary-card--completed">
          <div className="manager-tasks__stat-label">Hoàn thành</div>
          <div className="manager-tasks__stat-value">{summary.completed}</div>
        </div>
      </div>

      <div className="manager-tasks__filter-section">
        <div className="manager-tasks__filter-group">
          <div>
            <label className="manager-tasks__filter-label">Lọc ao nuôi:</label>
            <select value={filterPond} onChange={(e) => setFilterPond(e.target.value)} className="manager-tasks__filter-select">
              <option value="ALL">Tất cả</option>
              {pondOptions.map((pond) => (
                <option key={pond.id} value={pond.id}>
                  {pond.code} - {pond.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="manager-tasks__filter-label">Lọc trạng thái:</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="manager-tasks__filter-select">
              <option value="ALL">Tất cả</option>
              <option value="PENDING">⏳ Chờ làm</option>
              <option value="IN_PROGRESS">🔄 Đang làm</option>
              <option value="COMPLETED">✅ Hoàn thành</option>
            </select>
          </div>
        </div>
        <button onClick={openCreateModal} className="manager-tasks__create-btn">
          + Tạo công việc
        </button>
      </div>

      <div className="table-container">
        <div className="table-header">
          <h2>Danh sách công việc ({filteredTasks.length})</h2>
        </div>

        {filteredTasks.length === 0 ? (
          <div className="manager-tasks__empty-state">
            <p className="manager-tasks__empty-state-text">Không có công việc nào</p>
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
                  <th className="manager-tasks__actions-th">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map((task) => (
                  <tr key={task.task_id}>
                    <td className="manager-tasks__table-row-title">
                      <div className="manager-tasks__table-row-title-main">
                        {task.task_title || '-'}
                      </div>
                      {task.description && (
                        <div className="manager-tasks__table-row-title-desc">
                          {task.description.substring(0, 40)}...
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="manager-tasks__pond-code">{task.pond_code || '-'}</div>
                      <div className="manager-tasks__pond-name">{task.pond_name || '-'}</div>
                    </td>
                    <td>{getStaffName(task.assigned_to)}</td>
                    <td>{getSeasonName(task.season_id)}</td>
                    <td>{formatVietnameseDate(task.due_date)}</td>
                    <td>{getStatusBadge(task.status)}</td>
                    <td>{formatVietnameseDateTime(task.created_at)}</td>
                    <td>
                      <div className="manager-tasks__table-actions">
                        <button onClick={() => handleViewDetail(task.task_id)} title="Xem chi tiết" className="manager-tasks__action-btn manager-tasks__action-btn--view">
                          👁️
                        </button>
                        <button
                          onClick={() => openEditModal(task)}
                          title={task.status === 'COMPLETED' ? 'Công việc đã hoàn thành, không thể sửa' : 'Sửa'}
                          disabled={task.status === 'COMPLETED'}
                          className="manager-tasks__action-btn manager-tasks__action-btn--edit"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDeleteTask(task.task_id)}
                          title={task.status === 'COMPLETED' ? 'Công việc đã hoàn thành, không thể xóa' : 'Xóa'}
                          disabled={task.status === 'COMPLETED'}
                          className="manager-tasks__action-btn manager-tasks__action-btn--delete"
                        >
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
        <div className="manager-tasks__modal-overlay">
          <div className="manager-tasks__modal-content">
            <h2 className="manager-tasks__modal-title">{editingTask ? '✏️ Sửa công việc' : '➕ Tạo công việc mới'}</h2>

            <form onSubmit={handleSubmit}>
              <div className="manager-tasks__form-group">
                <label className="manager-tasks__form-label">Tiêu đề *</label>
                <input type="text" value={form.task_title} onChange={(e) => handleChange('task_title', e.target.value)} placeholder="Ví dụ: Siphon đáy ao A1" className="manager-tasks__form-input" />
              </div>

              <div className="manager-tasks__form-group">
                <label className="manager-tasks__form-label">Mô tả</label>
                <textarea value={form.description} onChange={(e) => handleChange('description', e.target.value)} placeholder="Mô tả chi tiết công việc..." className="manager-tasks__form-textarea" />
              </div>

              <div className="manager-tasks__form-group">
                <label className="manager-tasks__form-label">Ao nuôi *</label>
                <select value={form.pond_id} onChange={(e) => handleChange('pond_id', e.target.value)} className="manager-tasks__form-select">
                  <option value="">Chọn ao nuôi</option>
                  {pondOptions.map((pond) => (
                    <option key={pond.id} value={pond.id}>
                      {pond.code} - {pond.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="manager-tasks__form-group">
                <label className="manager-tasks__form-label">Mùa vụ</label>
                <select value={form.season_id} onChange={(e) => handleChange('season_id', e.target.value)} className="manager-tasks__form-select">
                  <option value="">Chọn mùa vụ (tùy chọn)</option>
                  {filteredSeasonOptions.map((season) => (
                    <option key={season.id} value={season.id}>
                      {season.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="manager-tasks__form-group">
                <label className="manager-tasks__form-label">Giao cho nhân viên *</label>
                <select value={form.assigned_to} onChange={(e) => handleChange('assigned_to', e.target.value)} className="manager-tasks__form-select">
                  <option value="">Chọn nhân viên</option>
                  {staffOptions.map((staff) => (
                    <option key={staff.id} value={staff.id}>
                      {staff.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="manager-tasks__form-group">
                <label className="manager-tasks__form-label">Hạn chót *</label>
                <input type="date" value={form.due_date} onChange={(e) => handleChange('due_date', e.target.value)} className="manager-tasks__form-input" />
              </div>

              <div className="manager-tasks__form-button-group">
                <button type="button" onClick={() => { setShowModal(false); setForm(emptyForm) }} className="manager-tasks__form-btn manager-tasks__form-btn--cancel">
                  Hủy
                </button>
                <button type="submit" disabled={saving} className="manager-tasks__form-btn manager-tasks__form-btn--submit">
                  {saving ? 'Đang lưu...' : 'Lưu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDetailModal && detailTask && (
        <div className="manager-tasks__modal-overlay">
          <div className="manager-tasks__detail-modal-content">
            <h2 className="manager-tasks__modal-title">📋 Chi tiết công việc</h2>

            <div className="manager-tasks__detail-field">
              <label className="manager-tasks__detail-label">Tiêu đề</label>
              <p className="manager-tasks__detail-value">{detailTask.task_title || '-'}</p>
            </div>

            <div className="manager-tasks__detail-field">
              <label className="manager-tasks__detail-label">Mô tả</label>
              <p className="manager-tasks__detail-value manager-tasks__detail-value--whitespace">{detailTask.description || '-'}</p>
            </div>

            <div className="manager-tasks__detail-field">
              <label className="manager-tasks__detail-label">Ao nuôi</label>
              <p className="manager-tasks__detail-value">
                <strong>{detailTask.pond_code || '-'}</strong> - {detailTask.pond_name || '-'}
              </p>
            </div>

            <div className="manager-tasks__detail-grid">
              <div>
                <label className="manager-tasks__detail-label">Giao cho</label>
                <p className="manager-tasks__detail-value">{detailTask.assigned_to_name || '-'}</p>
              </div>
              <div>
                <label className="manager-tasks__detail-label">Giao bởi</label>
                <p className="manager-tasks__detail-value">{detailTask.assigned_by_name || '-'}</p>
              </div>
            </div>

            <div className="manager-tasks__detail-grid">
              <div>
                <label className="manager-tasks__detail-label">Hạn chót</label>
                <p className="manager-tasks__detail-value">{formatVietnameseDate(detailTask.due_date)}</p>
              </div>
              <div>
                <label className="manager-tasks__detail-label">Trạng thái</label>
                <p className="manager-tasks__detail-value">{getStatusBadge(detailTask.status)}</p>
              </div>
            </div>

            <div className="manager-tasks__detail-field">
              <label className="manager-tasks__detail-label">Mùa vụ</label>
              <p className="manager-tasks__detail-value">{detailTask.season_name || '-'}</p>
            </div>

            <div className="manager-tasks__detail-field">
              <label className="manager-tasks__detail-label">Hình ảnh hoàn thành</label>
              {detailTask.images && detailTask.images.length > 0 ? (
                <div className="manager-tasks__image-gallery">
                  {detailTask.images.map((image) => (
                    <div key={image.image_id} className="manager-tasks__image-item">
                      <img src={image.image_url} alt="Task completion" onError={(e) => { e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="120" height="120"%3E%3Crect fill="%23f3f4f6" width="120" height="120"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="14" fill="%239ca3af"%3E📷%3C/text%3E%3C/svg%3E' }} />
                      <div className="manager-tasks__image-timestamp">
                        {formatVietnameseDateTime(image.uploaded_at)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="manager-tasks__no-images-text">Chưa có hình ảnh</p>
              )}
            </div>

            <div className="manager-tasks__detail-button-group">
              <button onClick={() => setShowDetailModal(false)} className="manager-tasks__detail-close-btn">
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
