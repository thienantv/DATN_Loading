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

const WorkerTasks = () => {
  const [loading, setLoading] = useState(true)
  const [tasks, setTasks] = useState([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [sortBy, setSortBy] = useState(SORT_OPTIONS.OVERDUE_PRIORITY)
  const [updatingTaskId, setUpdatingTaskId] = useState('')
  
  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState(null)
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
      setError('')
      setSuccess('')
    } catch (loadError) {
      setTasks([])
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

  const openModal = async (task) => {
    setSelectedTask(task)
    setModalOpen(true)
    setSelectedImageFile(null)
    if (imageInputRef.current) imageInputRef.current.value = ''
    await loadTaskImages(task.task_id)
  }

  const closeModal = () => {
    setModalOpen(false)
    setSelectedTask(null)
    setSelectedImageFile(null)
    setSelectedTaskImages([])
    if (imageInputRef.current) imageInputRef.current.value = ''
  }

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
    if (!selectedTask) {
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
      await taskService.uploadTaskImage(selectedTask.task_id, { imageUrl })
      setSuccess('Upload ảnh minh chứng thành công')
      setError('')
      setSelectedImageFile(null)
      if (imageInputRef.current) imageInputRef.current.value = ''
      await loadTaskImages(selectedTask.task_id)
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
      
      // Auto-upload image when marking as COMPLETED if image is selected for this task
      if (nextStatus === 'COMPLETED' && selectedImageFile) {
        const imageUrl = await fileToDataUrl(selectedImageFile)
        await taskService.uploadTaskImage(task.task_id, { imageUrl })
        setSelectedImageFile(null)
        if (imageInputRef.current) imageInputRef.current.value = ''
        await loadTaskImages(task.task_id)
        setSuccess('Đã cập nhật trạng thái công việc và upload ảnh minh chứng thành công')
      } else {
        setSuccess('Đã cập nhật trạng thái công việc')
      }
      
      setError('')
      await fetchTasks()
      
      // Refresh modal if open
      if (modalOpen && selectedTask) {
        const updatedTask = (await taskService.getTaskById(task.task_id))?.data?.data
        if (updatedTask) setSelectedTask(updatedTask)
        await loadTaskImages(task.task_id)
      }
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
                  <th>Hạn hoàn thành</th>
                  <th>Trạng thái</th>
                  <th style={{ textAlign: 'center' }}>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map((task) => (
                  <tr key={task.task_id}>
                    <td style={{ fontWeight: 600 }}>{task.task_title || '-'}</td>
                    <td>{formatDate(task.due_date)}</td>
                    <td>{getStatusChip(task.status)}</td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => openModal(task)}
                        style={{
                          border: 'none',
                          backgroundColor: '#6366f1',
                          color: '#fff',
                          padding: '6px 12px',
                          borderRadius: 6,
                          fontWeight: 600,
                          cursor: 'pointer',
                          fontSize: '14px',
                        }}
                      >
                        Xem chi tiết
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && selectedTask && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 20,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal()
          }}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: 12,
              padding: 24,
              maxWidth: 500,
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ margin: '0 0 16px 0', fontSize: 20, fontWeight: 700 }}>
                {selectedTask.task_title}
              </h2>
              
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, color: '#666', marginBottom: 4 }}>Mô tả công việc</div>
                <div style={{ fontSize: 14, color: '#1a1a1a' }}>{selectedTask.description || '-'}</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 13, color: '#666', marginBottom: 4 }}>Hạn hoàn thành</div>
                  <div style={{ fontSize: 14, color: '#1a1a1a', fontWeight: 600 }}>
                    {formatDate(selectedTask.due_date)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 13, color: '#666', marginBottom: 4 }}>Ưu tiên hạn</div>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '4px 10px',
                      borderRadius: '999px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      color: getDueLabel(selectedTask.due_date).color,
                      backgroundColor: getDueLabel(selectedTask.due_date).bg,
                    }}
                  >
                    {getDueLabel(selectedTask.due_date).text}
                  </span>
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, color: '#666', marginBottom: 4 }}>Trạng thái hiện tại</div>
                <div>{getStatusChip(selectedTask.status)}</div>
              </div>

              {String(selectedTask.status || 'PENDING').toUpperCase() === 'PENDING' && (
                <button
                  type="button"
                  onClick={() => handleAdvanceStatus(selectedTask)}
                  disabled={updatingTaskId === String(selectedTask.task_id)}
                  style={{
                    width: '100%',
                    border: 'none',
                    backgroundColor: '#2563eb',
                    color: '#fff',
                    padding: '10px 16px',
                    borderRadius: 6,
                    fontWeight: 600,
                    cursor: updatingTaskId === String(selectedTask.task_id) ? 'not-allowed' : 'pointer',
                    opacity: updatingTaskId === String(selectedTask.task_id) ? 0.7 : 1,
                    marginBottom: 16,
                  }}
                >
                  {updatingTaskId === String(selectedTask.task_id) ? 'Đang bắt đầu...' : 'Bắt đầu làm'}
                </button>
              )}

              {String(selectedTask.status || 'PENDING').toUpperCase() === 'IN_PROGRESS' && (
                <>
                  <div style={{ marginBottom: 16, paddingTop: 16, borderTop: '1px solid #e5e7eb' }}>
                    <div style={{ fontSize: 13, color: '#666', marginBottom: 8, fontWeight: 600 }}>
                      Upload ảnh minh chứng
                    </div>
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: '1px solid #d1d5db',
                        borderRadius: 6,
                        marginBottom: 12,
                      }}
                      disabled={uploadingImage}
                    />
                    {selectedImageFile && (
                      <div style={{ fontSize: 12, color: '#059669', marginBottom: 12 }}>
                        ✓ Đã chọn: {selectedImageFile.name}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={handleUploadTaskImage}
                      disabled={!selectedImageFile || uploadingImage}
                      style={{
                        width: '100%',
                        border: 'none',
                        backgroundColor: '#10b981',
                        color: '#fff',
                        padding: '8px 12px',
                        borderRadius: 6,
                        fontWeight: 600,
                        cursor: !selectedImageFile || uploadingImage ? 'not-allowed' : 'pointer',
                        opacity: !selectedImageFile || uploadingImage ? 0.7 : 1,
                        marginBottom: 16,
                      }}
                    >
                      {uploadingImage ? 'Đang upload...' : 'Upload ảnh'}
                    </button>
                  </div>

                  {loadingImages ? (
                    <div style={{ fontSize: 13, color: '#666', marginBottom: 16 }}>Đang tải ảnh...</div>
                  ) : selectedTaskImages.length > 0 ? (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 13, color: '#666', marginBottom: 8, fontWeight: 600 }}>
                        Ảnh đã tải lên ({selectedTaskImages.length})
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                        {selectedTaskImages.map((image) => (
                          <div
                            key={image.image_id}
                            style={{ border: '1px solid #e5e7eb', borderRadius: 6, overflow: 'hidden' }}
                          >
                            <img
                              src={image.image_url}
                              alt={`Ảnh #${image.image_id}`}
                              style={{ width: '100%', height: 100, objectFit: 'cover', backgroundColor: '#f3f4f6' }}
                            />
                            <div style={{ padding: 6, fontSize: 10, color: '#666' }}>
                              {formatDateTime(image.uploaded_at)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: '#999', marginBottom: 16, textAlign: 'center', padding: '12px 0' }}>
                      Chưa có ảnh minh chứng
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => handleAdvanceStatus(selectedTask)}
                    disabled={updatingTaskId === String(selectedTask.task_id)}
                    style={{
                      width: '100%',
                      border: 'none',
                      backgroundColor: '#16a34a',
                      color: '#fff',
                      padding: '10px 16px',
                      borderRadius: 6,
                      fontWeight: 600,
                      cursor: updatingTaskId === String(selectedTask.task_id) ? 'not-allowed' : 'pointer',
                      opacity: updatingTaskId === String(selectedTask.task_id) ? 0.7 : 1,
                    }}
                  >
                    {updatingTaskId === String(selectedTask.task_id) ? 'Đang hoàn thành...' : 'Đánh dấu hoàn thành'}
                  </button>
                </>
              )}

              {String(selectedTask.status || 'PENDING').toUpperCase() === 'COMPLETED' && (
                <div style={{ padding: 12, backgroundColor: '#dcfce7', borderRadius: 6, textAlign: 'center' }}>
                  <div style={{ color: '#166534', fontWeight: 600 }}>✅ Công việc đã hoàn thành</div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={closeModal}
                style={{
                  border: '1px solid #d1d5db',
                  backgroundColor: '#fff',
                  color: '#1a1a1a',
                  padding: '8px 16px',
                  borderRadius: 6,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default WorkerTasks
