import React, { useEffect, useMemo, useRef, useState } from 'react'
import { taskService } from '../../services/api'
import { showToast } from '../../utils/toast'
import '../../styles/dashboard.css'
// import '../../styles/worker/worker-tasks.css'

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
      className="status-chip"
      style={{ '--status-bg': meta.bg, '--status-color': meta.color }}
    >
      {meta.label}
    </span>
  )
}

const WorkerTasks = () => {
  const [loading, setLoading] = useState(true)
  const [tasks, setTasks] = useState([])
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [sortBy, setSortBy] = useState(SORT_OPTIONS.OVERDUE_PRIORITY)
  const [updatingTaskId, setUpdatingTaskId] = useState('')
  
  // Trạng thái modal
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
    } catch (loadError) {
      setTasks([])
      setSelectedTaskImages([])
      showToast({ title: loadError?.response?.data?.message || 'Không tải được danh sách công việc', type: 'error' })
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
      showToast({ title: loadError?.response?.data?.message || 'Không tải được ảnh minh chứng của công việc', type: 'error' })
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
      showToast({ title: 'Vui lòng chọn file ảnh hợp lệ (jpg, png, webp, ...)', type: 'error' })
      event.target.value = ''
      return
    }

    setSelectedImageFile(file)
  }

  const handleUploadTaskImage = async () => {
    if (!selectedTask) {
      showToast({ title: 'Vui lòng chọn công việc trước khi upload ảnh', type: 'error' })
      return
    }

    if (!selectedImageFile) {
      showToast({ title: 'Vui lòng chọn ảnh minh chứng', type: 'error' })
      return
    }

    try {
      setUploadingImage(true)
      const imageUrl = await fileToDataUrl(selectedImageFile)
      await taskService.uploadTaskImage(selectedTask.task_id, { imageUrl })
      showToast({ title: 'Upload ảnh minh chứng thành công', type: 'success' })
      setSelectedImageFile(null)
      if (imageInputRef.current) imageInputRef.current.value = ''
      await loadTaskImages(selectedTask.task_id)
    } catch (uploadError) {
      showToast({ title: uploadError?.response?.data?.message || 'Không thể upload ảnh minh chứng', type: 'error' })
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
      
      // Tự động tải ảnh lên khi đánh dấu HOÀN THÀNH nếu tác vụ này có ảnh được chọn
        if (nextStatus === 'COMPLETED' && selectedImageFile) {
        const imageUrl = await fileToDataUrl(selectedImageFile)
        await taskService.uploadTaskImage(task.task_id, { imageUrl })
        setSelectedImageFile(null)
        if (imageInputRef.current) imageInputRef.current.value = ''
        await loadTaskImages(task.task_id)
        showToast({ title: 'Đã cập nhật trạng thái công việc và upload ảnh minh chứng thành công', type: 'success' })
      } else {
        showToast({ title: 'Đã cập nhật trạng thái công việc', type: 'success' })
      }
      
      await fetchTasks()
      
      // Làm mới modal nếu đang mở
      if (modalOpen && selectedTask) {
        const updatedTask = (await taskService.getTaskById(task.task_id))?.data?.data
        if (updatedTask) setSelectedTask(updatedTask)
        await loadTaskImages(task.task_id)
      }
    } catch (updateError) {
      showToast({ title: updateError?.response?.data?.message || 'Không thể cập nhật trạng thái công việc', type: 'error' })
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

      {/* Notifications shown via global toast */}

      <div className="worker-tasks_summary-grid">
        <div className="worker-tasks_summary-card">
          <div className="worker-tasks_summary-card-label">Tổng công việc</div>
          <div className="worker-tasks_summary-card-value">{summary.total}</div>
        </div>
        <div className="worker-tasks_summary-card worker-tasks_summary-card--pending">
          <div className="worker-tasks_summary-card-label">Chờ làm</div>
          <div className="worker-tasks_summary-card-value">{summary.pending}</div>
        </div>
        <div className="worker-tasks_summary-card worker-tasks_summary-card--in-progress">
          <div className="worker-tasks_summary-card-label">Đang làm</div>
          <div className="worker-tasks_summary-card-value">{summary.inProgress}</div>
        </div>
        <div className="worker-tasks_summary-card worker-tasks_summary-card--completed">
          <div className="worker-tasks_summary-card-label">Hoàn thành</div>
          <div className="worker-tasks_summary-card-value">{summary.completed}</div>
        </div>
      </div>

      <div className="table-container">
        <div className="table-header worker-tasks_table-header">
          <h2>Danh sách công việc ({filteredTasks.length})</h2>
          <div className="worker-tasks_table-controls">
            <label className="worker-tasks_filter-label">Lọc trạng thái:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="worker-tasks_filter-select"
            >
              <option value="ALL">Tất cả</option>
              <option value="PENDING">PENDING</option>
              <option value="IN_PROGRESS">IN_PROGRESS</option>
              <option value="COMPLETED">COMPLETED</option>
            </select>
            <label className="worker-tasks_filter-label">Sắp xếp hạn:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="worker-tasks_filter-select"
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
          <div className="worker-tasks_table-loading">Đang tải danh sách công việc...</div>
        ) : filteredTasks.length === 0 ? (
          <div className="worker-tasks_table-empty">Chưa có công việc nào được giao.</div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Tiêu đề công việc</th>
                  <th>Hạn hoàn thành</th>
                  <th>Trạng thái</th>
                  <th className="text-center">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map((task) => (
                  <tr key={task.task_id}>
                    <td className="task-title">{task.task_title || '-'}</td>
                    <td>{formatDate(task.due_date)}</td>
                    <td>{getStatusChip(task.status)}</td>
                    <td className="text-center">
                      <div className="worker-tasks_table-actions">
                        <button
                          type="button"
                          onClick={() => openModal(task)}
                          className="btn btn-sm"
                          title="Xem chi tiết"
                        >
                          🔍
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

      {modalOpen && selectedTask && (
        <div
          className="worker-tasks_modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal()
          }}
        >
          <div className="worker-tasks_modal-content">
            <div className="worker-tasks_modal-section">
              <h2 className="worker-tasks_modal-title">
                {selectedTask.task_title}
              </h2>
              
              <div className="worker-tasks_modal-section">
                <div className="worker-tasks_section-label">Mô tả công việc</div>
                <div className="worker-tasks_section-content">{selectedTask.description || '-'}</div>
              </div>

              <div className="worker-tasks_modal-grid">
                <div>
                  <div className="worker-tasks_section-label">Hạn hoàn thành</div>
                  <div className="worker-tasks_section-content worker-tasks_section-content--strong">
                    {formatDate(selectedTask.due_date)}
                  </div>
                </div>
                <div>
                  <div className="worker-tasks_section-label">Ưu tiên hạn</div>
                  <span
                    className="worker-tasks_status-chip"
                    style={{ '--due-color': getDueLabel(selectedTask.due_date).color, '--due-bg': getDueLabel(selectedTask.due_date).bg }}
                  >
                    {getDueLabel(selectedTask.due_date).text}
                  </span>
                </div>
              </div>

              {selectedTask.assigned_by_name && (
                <div className="worker-tasks_modal-section">
                  <div className="worker-tasks_section-label">Được giao bởi</div>
                  <div className="worker-tasks_section-content">{selectedTask.assigned_by_name}</div>
                </div>
              )}

              {selectedTask.pond_code && (
                <div className="worker-tasks_modal-section">
                  <div className="worker-tasks_section-label">Ao nuôi</div>
                  <div className="worker-tasks_section-content">
                    {selectedTask.pond_code} - {selectedTask.pond_name}
                  </div>
                </div>
              )}

              {selectedTask.season_name && (
                <div className="worker-tasks_modal-section">
                  <div className="worker-tasks_section-label">Mùa vụ</div>
                  <div className="worker-tasks_section-content">{selectedTask.season_name}</div>
                </div>
              )}

              {selectedTask.created_at && (
                <div className="worker-tasks_modal-section">
                  <div className="worker-tasks_section-label">Ngày tạo</div>
                  <div className="worker-tasks_section-content">{formatDateTime(selectedTask.created_at)}</div>
                </div>
              )}

              <div className="worker-tasks_modal-section">
                <div className="worker-tasks_section-label">Trạng thái hiện tại</div>
                <div>{getStatusChip(selectedTask.status)}</div>
              </div>

              <div className="worker-tasks_modal-section">
                <div className="worker-tasks_section-label">Ảnh minh chứng</div>
                {loadingImages ? (
                  <div className="worker-tasks_image-loading">Đang tải ảnh...</div>
                ) : selectedTaskImages.length > 0 ? (
                  <div className="worker-tasks_image-grid">
                    {selectedTaskImages.map((image) => (
                      <div
                        key={image.image_id}
                        className="worker-tasks_image-item"
                      >
                        <img
                          src={image.image_url}
                          alt={`Ảnh #${image.image_id}`}
                        />
                        <div className="worker-tasks_image-timestamp">
                          {formatDateTime(image.uploaded_at)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="worker-tasks_no-images">
                    Chưa có ảnh minh chứng
                  </div>
                )}
              </div>

              {String(selectedTask.status || 'PENDING').toUpperCase() === 'PENDING' && (
                <button
                  type="button"
                  onClick={() => handleAdvanceStatus(selectedTask)}
                  disabled={updatingTaskId === String(selectedTask.task_id)}
                  className="worker-tasks_action-btn worker-tasks_action-btn--start"
                >
                  {updatingTaskId === String(selectedTask.task_id) ? 'Đang bắt đầu...' : 'Bắt đầu làm'}
                </button>
              )}

              {String(selectedTask.status || 'PENDING').toUpperCase() === 'IN_PROGRESS' && (
                <>
                  <div className="worker-tasks_image-upload">
                    <label className="worker-tasks_image-upload-label">
                      Upload ảnh minh chứng
                    </label>
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="worker-tasks_image-input"
                      disabled={uploadingImage}
                    />
                    {selectedImageFile && (
                      <div className="worker-tasks_file-selected">
                        ✓ Đã chọn: {selectedImageFile.name}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={handleUploadTaskImage}
                      disabled={!selectedImageFile || uploadingImage}
                      className="worker-tasks_upload-btn"
                    >
                      {uploadingImage ? 'Đang upload...' : 'Upload ảnh'}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAdvanceStatus(selectedTask)}
                    disabled={updatingTaskId === String(selectedTask.task_id)}
                    className="worker-tasks_action-btn worker-tasks_action-btn--complete"
                  >
                    {updatingTaskId === String(selectedTask.task_id) ? 'Đang hoàn thành...' : 'Đánh dấu hoàn thành'}
                  </button>
                </>
              )}

              {String(selectedTask.status || 'PENDING').toUpperCase() === 'COMPLETED' && (
                <div className="worker-tasks_completed-alert">
                  ✅ Công việc đã hoàn thành
                </div>
              )}
            </div>

            <div className="worker-tasks_modal-footer">
              <button
                type="button"
                onClick={closeModal}
                className="worker-tasks_modal-close-btn"
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
