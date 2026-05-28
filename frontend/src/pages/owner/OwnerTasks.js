import React, { useEffect, useState, useMemo } from 'react'
import { taskService, userService, seasonService, pondService } from '../../services/api'
import { showToast } from '../../utils/toast'
import '../../styles/owner/owner-tasks.css'

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

const OwnerTasks = () => {
  const [tasks, setTasks] = useState([])
  const [staffList, setStaffList] = useState([])
  const [seasons, setSeasons] = useState([])
  const [ponds, setPonds] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
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
    } catch (err) {
      showToast({ title: err?.response?.data?.message || 'Không tải được dữ liệu công việc', type: 'error' })
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
      showToast({ title: 'Tiêu đề công việc là bắt buộc', type: 'error' })
      return
    }

    if (!form.pond_id) {
      showToast({ title: 'Vui lòng chọn ao nuôi', type: 'error' })
      return
    }

    if (form.season_id) {
      const selectedSeason = seasons.find((season) => String(season.season_id) === String(form.season_id))
      if (!selectedSeason) {
        showToast({ title: 'Mùa vụ không tồn tại', type: 'error' })
        return
      }

      if (String(selectedSeason.pond_id) !== String(form.pond_id)) {
        showToast({ title: 'Mùa vụ phải thuộc đúng ao đã chọn', type: 'error' })
        return
      }
    }

    if (!form.assigned_to) {
      showToast({ title: 'Vui lòng chọn nhân viên', type: 'error' })
      return
    }

    if (!form.due_date) {
      showToast({ title: 'Vui lòng chọn hạn chót', type: 'error' })
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
        showToast({ title: 'Cập nhật công việc thành công', type: 'success' })
      } else {
        await taskService.createTask(payload)
        showToast({ title: 'Tạo công việc thành công', type: 'success' })
      }

      setShowModal(false)
      setForm(emptyForm)
      await fetchAllData()
    } catch (err) {
      showToast({ title: err?.response?.data?.message || 'Lỗi khi lưu công việc', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Bạn chắc chắn muốn xóa công việc này?')) return

    try {
      await taskService.deleteTask(taskId)
      showToast({ title: 'Xóa công việc thành công', type: 'success' })
      await fetchAllData()
    } catch (err) {
      showToast({ title: err?.response?.data?.message || 'Lỗi khi xóa công việc', type: 'error' })
    }
  }

  const handleViewDetail = async (taskId) => {
    try {
      const res = await taskService.getTaskById(taskId)
      setDetailTask(res?.data?.data || null)
      setShowDetailModal(true)
    } catch (err) {
      showToast({ title: 'Lỗi khi tải chi tiết công việc', type: 'error' })
    }
  }

  if (loading) {
    return (
      <div className="dashboard owner-page">
        <div className="flex-center owner-tasks_loading-container">
          <div className="spinner"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard owner-page">
      
      {/* Messages are shown via global toasts */}

      <div className="owner-tasks_summary-cards">
        <div className="owner-tasks_summary-card owner-tasks_summary-card--total">
          <div className="owner-tasks_stat-label">Tổng công việc</div>
          <div className="owner-tasks_stat-value">{summary.total}</div>
        </div>
        <div className="owner-tasks_summary-card owner-tasks_summary-card--pending">
          <div className="owner-tasks_stat-label">Chờ làm</div>
          <div className="owner-tasks_stat-value">{summary.pending}</div>
        </div>
        <div className="owner-tasks_summary-card owner-tasks_summary-card--in-progress">
          <div className="owner-tasks_stat-label">Đang làm</div>
          <div className="owner-tasks_stat-value">{summary.inProgress}</div>
        </div>
        <div className="owner-tasks_summary-card owner-tasks_summary-card--completed">
          <div className="owner-tasks_stat-label">Hoàn thành</div>
          <div className="owner-tasks_stat-value">{summary.completed}</div>
        </div>
      </div>

      <div className="owner-tasks_filter-section">
        <div className="owner-tasks_filter-group">
          <div>
            <label className="owner-tasks_filter-label">Lọc ao nuôi:</label>
            <select value={filterPond} onChange={(e) => setFilterPond(e.target.value)} className="owner-tasks_filter-select">
              <option value="ALL">Tất cả</option>
              {pondOptions.map((pond) => (
                <option key={pond.id} value={pond.id}>
                  {pond.code} - {pond.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="owner-tasks_filter-label">Lọc trạng thái:</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="owner-tasks_filter-select">
              <option value="ALL">Tất cả</option>
              <option value="PENDING">⏳ Chờ làm</option>
              <option value="IN_PROGRESS">🔄 Đang làm</option>
              <option value="COMPLETED">✅ Hoàn thành</option>
            </select>
          </div>
        </div>
        <button onClick={openCreateModal} className="owner-tasks_create-btn">
          + Tạo công việc
        </button>
      </div>

      <div className="table-container">
        <div className="table-header">
          <h2>Danh sách công việc ({filteredTasks.length})</h2>
        </div>

        {filteredTasks.length === 0 ? (
          <div className="owner-tasks_empty-state">
            <p className="owner-tasks_empty-state-text">Không có công việc nào</p>
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
                  <th className="owner-tasks_actions-th">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map((task) => (
                  <tr key={task.task_id}>
                    <td className="owner-tasks_table-row-title">
                      <div className="owner-tasks_table-row-title-main">
                        {task.task_title || '-'}
                      </div>
                      {task.description && (
                        <div className="owner-tasks_table-row-title-desc">
                          {task.description.substring(0, 40)}...
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="owner-tasks_pond-code">{task.pond_code || '-'}</div>
                      <div className="owner-tasks_pond-name">{task.pond_name || '-'}</div>
                    </td>
                    <td>{getStaffName(task.assigned_to)}</td>
                    <td>{getSeasonName(task.season_id)}</td>
                    <td>{formatVietnameseDate(task.due_date)}</td>
                    <td>{getStatusBadge(task.status)}</td>
                    <td>{formatVietnameseDateTime(task.created_at)}</td>
                    <td>
                      <div className="owner-tasks_table-actions">
                        <button onClick={() => handleViewDetail(task.task_id)} title="Xem chi tiết" className="btn btn-sm btn-primary">
                          👁️
                        </button>
                        <button
                          onClick={() => openEditModal(task)}
                          title={task.status === 'COMPLETED' ? 'Công việc đã hoàn thành, không thể sửa' : 'Sửa'}
                          disabled={task.status === 'COMPLETED'}
                          className="btn btn-sm btn-secondary"
                        >
                          ✎
                        </button>
                        <button
                          onClick={() => handleDeleteTask(task.task_id)}
                          title={task.status === 'COMPLETED' ? 'Công việc đã hoàn thành, không thể xóa' : 'Xóa'}
                          disabled={task.status === 'COMPLETED'}
                          className="btn btn-sm btn-danger"
                        >
                          🗑
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
        <div className="owner-tasks_modal-overlay">
          <div className="owner-tasks_modal-content">
            <h2 className="owner-tasks_modal-title">{editingTask ? '✏️ Sửa công việc' : '➕ Tạo công việc mới'}</h2>

            <form onSubmit={handleSubmit}>
              <div className="owner-tasks_form-group">
                <label className="owner-tasks_form-label">Tiêu đề *</label>
                <input type="text" value={form.task_title} onChange={(e) => handleChange('task_title', e.target.value)} placeholder="Ví dụ: Siphon đáy ao A1" className="owner-tasks_form-input" />
              </div>

              <div className="owner-tasks_form-group">
                <label className="owner-tasks_form-label">Mô tả</label>
                <textarea value={form.description} onChange={(e) => handleChange('description', e.target.value)} placeholder="Mô tả chi tiết công việc..." className="owner-tasks_form-textarea" />
              </div>

              <div className="owner-tasks_form-group">
                <label className="owner-tasks_form-label">Ao nuôi *</label>
                <select value={form.pond_id} onChange={(e) => handleChange('pond_id', e.target.value)} className="owner-tasks_form-select">
                  <option value="">Chọn ao nuôi</option>
                  {pondOptions.map((pond) => (
                    <option key={pond.id} value={pond.id}>
                      {pond.code} - {pond.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="owner-tasks_form-group">
                <label className="owner-tasks_form-label">Mùa vụ</label>
                <select value={form.season_id} onChange={(e) => handleChange('season_id', e.target.value)} className="owner-tasks_form-select">
                  <option value="">Chọn mùa vụ (tùy chọn)</option>
                  {filteredSeasonOptions.map((season) => (
                    <option key={season.id} value={season.id}>
                      {season.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="owner-tasks_form-group">
                <label className="owner-tasks_form-label">Giao cho nhân viên *</label>
                <select value={form.assigned_to} onChange={(e) => handleChange('assigned_to', e.target.value)} className="owner-tasks_form-select">
                  <option value="">Chọn nhân viên</option>
                  {staffOptions.map((staff) => (
                    <option key={staff.id} value={staff.id}>
                      {staff.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="owner-tasks_form-group">
                <label className="owner-tasks_form-label">Hạn chót *</label>
                <input type="date" value={form.due_date} onChange={(e) => handleChange('due_date', e.target.value)} className="owner-tasks_form-input" />
              </div>

              <div className="owner-tasks_form-button-group">
                <button type="button" onClick={() => { setShowModal(false); setForm(emptyForm) }} className="owner-tasks_form-btn owner-tasks_form-btn--cancel">
                  Hủy
                </button>
                <button type="submit" disabled={saving} className="owner-tasks_form-btn owner-tasks_form-btn--submit">
                  {saving ? 'Đang lưu...' : 'Lưu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDetailModal && detailTask && (
        <div className="owner-tasks_modal-overlay">
          <div className="owner-tasks_detail-modal-content">
            <h2 className="owner-tasks_modal-title">📋 Chi tiết công việc</h2>

            <div className="owner-tasks_detail-field">
              <label className="owner-tasks_detail-label">Tiêu đề</label>
              <p className="owner-tasks_detail-value">{detailTask.task_title || '-'}</p>
            </div>

            <div className="owner-tasks_detail-field">
              <label className="owner-tasks_detail-label">Mô tả</label>
              <p className="owner-tasks_detail-value owner-tasks_detail-value--whitespace">{detailTask.description || '-'}</p>
            </div>

            <div className="owner-tasks_detail-field">
              <label className="owner-tasks_detail-label">Ao nuôi</label>
              <p className="owner-tasks_detail-value">
                <strong>{detailTask.pond_code || '-'}</strong> - {detailTask.pond_name || '-'}
              </p>
            </div>

            <div className="owner-tasks_detail-grid">
              <div>
                <label className="owner-tasks_detail-label">Giao cho</label>
                <p className="owner-tasks_detail-value">{detailTask.assigned_to_name || '-'}</p>
              </div>
              <div>
                <label className="owner-tasks_detail-label">Giao bởi</label>
                <p className="owner-tasks_detail-value">{detailTask.assigned_by_name || '-'}</p>
              </div>
            </div>

            <div className="owner-tasks_detail-grid">
              <div>
                <label className="owner-tasks_detail-label">Hạn chót</label>
                <p className="owner-tasks_detail-value">{formatVietnameseDate(detailTask.due_date)}</p>
              </div>
              <div>
                <label className="owner-tasks_detail-label">Trạng thái</label>
                <p className="owner-tasks_detail-value">{getStatusBadge(detailTask.status)}</p>
              </div>
            </div>

            <div className="owner-tasks_detail-field">
              <label className="owner-tasks_detail-label">Mùa vụ</label>
              <p className="owner-tasks_detail-value">{detailTask.season_name || '-'}</p>
            </div>

            <div className="owner-tasks_detail-field">
              <label className="owner-tasks_detail-label">Hình ảnh hoàn thành</label>
              {detailTask.images && detailTask.images.length > 0 ? (
                <div className="owner-tasks_image-gallery">
                  {detailTask.images.map((image) => (
                    <div key={image.image_id} className="owner-tasks_image-item">
                      <img src={image.image_url} alt="Task completion" onError={(e) => { e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="120" height="120"%3E%3Crect fill="%23f3f4f6" width="120" height="120"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="14" fill="%239ca3af"%3E📷%3C/text%3E%3C/svg%3E' }} />
                      <div className="owner-tasks_image-timestamp">
                        {formatVietnameseDateTime(image.uploaded_at)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="owner-tasks_no-images-text">Chưa có hình ảnh</p>
              )}
            </div>

            <div className="owner-tasks_detail-button-group">
              <button onClick={() => setShowDetailModal(false)} className="owner-tasks_detail-close-btn">
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default OwnerTasks

