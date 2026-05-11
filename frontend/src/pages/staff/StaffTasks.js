import React, { useEffect, useMemo, useRef, useState } from 'react'
import { taskService } from '../../services/api'
import '../../styles/dashboard.css'

const STATUS_META = {
  PENDING: { label: '⏳ Chờ làm', color: '#92400e', bg: '#fef3c7' },
  IN_PROGRESS: { label: '🔄 Đang làm', color: '#0c4a6e', bg: '#dbeafe' },
  COMPLETED: { label: '✅ Hoàn thành', color: '#166534', bg: '#dcfce7' },
}

const STATUS_FLOW = {
  PENDING: 'IN_PROGRESS',
  IN_PROGRESS: 'COMPLETED',
  COMPLETED: null,
}

const SORT_OPTIONS = {
  OVERDUE_PRIORITY: 'OVERDUE_PRIORITY',
  NEAREST_DUE: 'NEAREST_DUE',
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

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Không đọc được file ảnh'))
    reader.readAsDataURL(file)
  })

const getDateStart = (value) => {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

const getDuePriority = (value) => {
  const dueDate = getDateStart(value)
  if (!dueDate) return 3

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (dueDate < today) return 0
  if (dueDate.getTime() === today.getTime()) return 1
  return 2
}

const getDueLabel = (value) => {
  const dueDate = getDateStart(value)
  if (!dueDate) return { text: 'Không có hạn', color: '#6b7280', bg: '#f3f4f6' }

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (dueDate < today) return { text: 'Quá hạn', color: '#991b1b', bg: '#fee2e2' }
  if (dueDate.getTime() === today.getTime()) return { text: 'Đến hạn hôm nay', color: '#92400e', bg: '#fef3c7' }
  return { text: 'Chưa đến hạn', color: '#1f2937', bg: '#e5e7eb' }
}

const getNextStatusLabel = (status) => {
  const normalizedStatus = String(status || 'PENDING').toUpperCase()
  if (normalizedStatus === 'PENDING') return 'Bắt đầu làm'
  if (normalizedStatus === 'IN_PROGRESS') return 'Đánh dấu hoàn thành'
  return null
}

const getActionButtonColor = (status) => {
  const normalizedStatus = String(status || 'PENDING').toUpperCase()
  return normalizedStatus === 'PENDING' ? '#2563eb' : '#16a34a'
}

const getStatusChip = (status) => {
  const normalizedStatus = String(status || 'PENDING').toUpperCase()
  const meta = STATUS_META[normalizedStatus] || STATUS_META.PENDING

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '4px 10px',
        borderRadius: '999px',
        backgroundColor: meta.bg,
        color: meta.color,
        fontWeight: 600,
        fontSize: '0.85rem',
      }}
    >
      {meta.label}
    </span>
  )
}

const StaffTasks = () => {
  const [loading, setLoading] = useState(true)
  const [tasks, setTasks] = useState([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [sortBy, setSortBy] = useState(SORT_OPTIONS.OVERDUE_PRIORITY)
  const [updatingTaskId, setUpdatingTaskId] = useState('')
  const [selectedTaskIdForImage, setSelectedTaskIdForImage] = useState('')
  const [selectedImageFile, setSelectedImageFile] = useState(null)
  const [selectedTaskImages, setSelectedTaskImages] = useState([])
  const [loadingImages, setLoadingImages] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const imageInputRef = useRef(null)

  const fetchTasks = async () => {
    try {
      setLoading(true)
      const response = await taskService.getAllTasks()
      const taskList = response?.data?.data || []
      setTasks(taskList)
      setSelectedTaskIdForImage((prev) => {
        if (!taskList.length) return ''
        if (prev && taskList.some((task) => String(task.task_id) === String(prev))) return prev
        return String(taskList[0].task_id)
      })
      setError('')
      setSuccess('')
    } catch (loadError) {
      setTasks([])
      setSelectedTaskIdForImage('')
      setSelectedTaskImages([])
      setError(loadError?.response?.data?.message || 'Không tải được danh sách công việc')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTasks()
  }, [])

  const loadTaskImages = async (taskId) => {
    if (!taskId) {
      setSelectedTaskImages([])
      return
    }

    try {
      setLoadingImages(true)
      const response = await taskService.getTaskById(taskId)
      setSelectedTaskImages(response?.data?.data?.images || [])
    } catch (loadError) {
      setSelectedTaskImages([])
      setError(loadError?.response?.data?.message || 'Không tải được ảnh minh chứng của công việc')
    } finally {
      setLoadingImages(false)
    }
  }

  useEffect(() => {
    loadTaskImages(selectedTaskIdForImage)
  }, [selectedTaskIdForImage])

  const handleImageChange = (event) => {
    const file = event.target.files?.[0] || null
    if (!file) {
      setSelectedImageFile(null)
      return
    }

    if (!String(file.type || '').startsWith('image/')) {
      setSelectedImageFile(null)
      setError('Vui lòng chọn file ảnh hợp lệ (jpg, png, webp, ...)')
      event.target.value = ''
      return
    }

    setSelectedImageFile(file)
    setError('')
  }

  const handleUploadTaskImage = async () => {
    if (!selectedTaskIdForImage) {
      setError('Vui lòng chọn công việc trước khi upload ảnh')
      return
    }

    if (!selectedImageFile) {
      setError('Vui lòng chọn ảnh minh chứng')
      return
    }

    try {
      setUploadingImage(true)
      const imageUrl = await fileToDataUrl(selectedImageFile)
      await taskService.uploadTaskImage(selectedTaskIdForImage, { imageUrl })
      setSuccess('Upload ảnh minh chứng thành công')
      setError('')
      setSelectedImageFile(null)
      if (imageInputRef.current) imageInputRef.current.value = ''
      await loadTaskImages(selectedTaskIdForImage)
    } catch (uploadError) {
      setError(uploadError?.response?.data?.message || 'Không thể upload ảnh minh chứng')
      setSuccess('')
    } finally {
      setUploadingImage(false)
    }
  }

  const filteredTasks = useMemo(() => {
    const filtered =
      statusFilter === 'ALL'
        ? [...tasks]
        : tasks.filter((task) => String(task.status || 'PENDING').toUpperCase() === statusFilter)

    filtered.sort((a, b) => {
      const dateA = getDateStart(a.due_date)
      const dateB = getDateStart(b.due_date)
      const timeA = dateA ? dateA.getTime() : Number.MAX_SAFE_INTEGER
      const timeB = dateB ? dateB.getTime() : Number.MAX_SAFE_INTEGER

      if (sortBy === SORT_OPTIONS.NEAREST_DUE) {
        return timeA - timeB
      }

      const priorityA = getDuePriority(a.due_date)
      const priorityB = getDuePriority(b.due_date)
      if (priorityA !== priorityB) return priorityA - priorityB
      return timeA - timeB
    })

    return filtered
  }, [tasks, statusFilter, sortBy])

  const handleAdvanceStatus = async (task) => {
    const currentStatus = String(task.status || 'PENDING').toUpperCase()
    const nextStatus = STATUS_FLOW[currentStatus]

    if (!nextStatus) return

    try {
      setUpdatingTaskId(String(task.task_id))
      await taskService.updateTaskStatus(task.task_id, nextStatus)
      setSuccess('Đã cập nhật trạng thái công việc')
      setError('')
      await fetchTasks()
    } catch (updateError) {
      setError(updateError?.response?.data?.message || 'Không thể cập nhật trạng thái công việc')
      setSuccess('')
    } finally {
      setUpdatingTaskId('')
    }
  }

  const summary = useMemo(() => {
    return {
      total: tasks.length,
      pending: tasks.filter((task) => String(task.status || 'PENDING').toUpperCase() === 'PENDING').length,
      inProgress: tasks.filter((task) => String(task.status || 'PENDING').toUpperCase() === 'IN_PROGRESS').length,
      completed: tasks.filter((task) => String(task.status || 'PENDING').toUpperCase() === 'COMPLETED').length,
    }
  }, [tasks])

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>📋 Công việc được giao</h1>
        <p>Xem danh sách công việc của bạn theo tiêu đề, mô tả, hạn hoàn thành và trạng thái.</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
        <div style={{ background: '#f3f4f6', borderRadius: 8, padding: 14 }}>
          <div style={{ color: '#6b7280', fontSize: 13 }}>Tổng công việc</div>
          <div style={{ fontSize: 30, fontWeight: 700 }}>{summary.total}</div>
        </div>
        <div style={{ background: '#fef3c7', borderRadius: 8, padding: 14 }}>
          <div style={{ color: '#6b7280', fontSize: 13 }}>Chờ làm</div>
          <div style={{ fontSize: 30, fontWeight: 700, color: '#92400e' }}>{summary.pending}</div>
        </div>
        <div style={{ background: '#dbeafe', borderRadius: 8, padding: 14 }}>
          <div style={{ color: '#6b7280', fontSize: 13 }}>Đang làm</div>
          <div style={{ fontSize: 30, fontWeight: 700, color: '#0c4a6e' }}>{summary.inProgress}</div>
        </div>
        <div style={{ background: '#dcfce7', borderRadius: 8, padding: 14 }}>
          <div style={{ color: '#6b7280', fontSize: 13 }}>Hoàn thành</div>
          <div style={{ fontSize: 30, fontWeight: 700, color: '#166534' }}>{summary.completed}</div>
        </div>
      </div>

      <div className="table-container" style={{ marginBottom: 24 }}>
        <div className="table-header">
          <h2>Upload ảnh công việc</h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12, marginBottom: 16 }}>
          <div>
            <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Chọn task</label>
            <select
              value={selectedTaskIdForImage}
              onChange={(e) => setSelectedTaskIdForImage(e.target.value)}
              style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 6, padding: '8px 10px' }}
              disabled={!tasks.length}
            >
              {tasks.length === 0 ? (
                <option value="">Chưa có task để upload</option>
              ) : (
                tasks.map((task) => (
                  <option key={task.task_id} value={task.task_id}>
                    #{task.task_id} - {task.task_title}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Chọn ảnh minh chứng</label>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              style={{ width: '100%' }}
              disabled={!selectedTaskIdForImage || uploadingImage}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'end' }}>
            <button
              type="button"
              onClick={handleUploadTaskImage}
              className="btn btn-primary"
              disabled={!selectedTaskIdForImage || !selectedImageFile || uploadingImage}
            >
              {uploadingImage ? 'Đang upload...' : 'Upload ảnh'}
            </button>
          </div>
        </div>

        <div>
          <div style={{ fontWeight: 600, marginBottom: 10 }}>Ảnh đã tải lên</div>
          {loadingImages ? (
            <div>Đang tải ảnh...</div>
          ) : selectedTaskImages.length === 0 ? (
            <div>Task này chưa có ảnh minh chứng.</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              {selectedTaskImages.map((image) => (
                <div key={image.image_id} style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
                  <img
                    src={image.image_url}
                    alt={`Ảnh minh chứng #${image.image_id}`}
                    style={{ width: '100%', height: 140, objectFit: 'cover', background: '#f3f4f6' }}
                  />
                  <div style={{ padding: 10, fontSize: 12, color: '#4b5563' }}>
                    Tải lên: {formatDateTime(image.uploaded_at)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="table-container">
        <div className="table-header" style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <h2>Danh sách công việc ({filteredTasks.length})</h2>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ fontWeight: 600 }}>Lọc trạng thái:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ border: '1px solid #d1d5db', borderRadius: 6, padding: '6px 10px' }}
            >
              <option value="ALL">Tất cả</option>
              <option value="PENDING">PENDING</option>
              <option value="IN_PROGRESS">IN_PROGRESS</option>
              <option value="COMPLETED">COMPLETED</option>
            </select>
            <label style={{ fontWeight: 600 }}>Sắp xếp hạn:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{ border: '1px solid #d1d5db', borderRadius: 6, padding: '6px 10px' }}
            >
              <option value={SORT_OPTIONS.OVERDUE_PRIORITY}>Ưu tiên quá hạn, rồi gần nhất</option>
              <option value={SORT_OPTIONS.NEAREST_DUE}>Hạn gần nhất trước</option>
            </select>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={fetchTasks}
              disabled={loading}
            >
              {loading ? 'Đang tải...' : 'Làm mới'}
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 30 }}>Đang tải danh sách công việc...</div>
        ) : filteredTasks.length === 0 ? (
          <div style={{ padding: 30 }}>Chưa có công việc nào được giao.</div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Tiêu đề công việc</th>
                  <th>Mô tả công việc</th>
                  <th>Hạn hoàn thành</th>
                  <th>Ưu tiên hạn</th>
                  <th>Trạng thái</th>
                  <th>Cập nhật</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map((task) => (
                  <tr key={task.task_id}>
                    <td style={{ fontWeight: 600 }}>{task.task_title || '-'}</td>
                    <td style={{ maxWidth: 480 }}>{task.description || '-'}</td>
                    <td>{formatDate(task.due_date)}</td>
                    <td>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          borderRadius: '999px',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          color: getDueLabel(task.due_date).color,
                          backgroundColor: getDueLabel(task.due_date).bg,
                        }}
                      >
                        {getDueLabel(task.due_date).text}
                      </span>
                    </td>
                    <td>{getStatusChip(task.status)}</td>
                    <td>
                      {STATUS_FLOW[String(task.status || 'PENDING').toUpperCase()] ? (
                        <button
                          type="button"
                          onClick={() => handleAdvanceStatus(task)}
                          disabled={updatingTaskId === String(task.task_id)}
                          style={{
                            border: 'none',
                            color: '#fff',
                            padding: '6px 10px',
                            borderRadius: 6,
                            fontWeight: 600,
                            cursor: updatingTaskId === String(task.task_id) ? 'not-allowed' : 'pointer',
                            backgroundColor: getActionButtonColor(task.status),
                            opacity: updatingTaskId === String(task.task_id) ? 0.7 : 1,
                          }}
                        >
                          {updatingTaskId === String(task.task_id)
                            ? 'Đang cập nhật...'
                            : getNextStatusLabel(task.status)}
                        </button>
                      ) : (
                        <span style={{ color: '#6b7280' }}>Đã hoàn tất</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default StaffTasks
