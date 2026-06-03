import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { showToast } from '../../utils/toast'
import { useAuth } from '../../context/AuthContext'
import { taskService, productService } from '../../services/api'
import PondChartCard from '../../components/charts/PondChartCard'
import '../../styles/technician/technician-tasks.css'

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'Tất cả trạng thái công việc' },
  { value: 'PENDING', label: 'Chờ xử lý' },
  { value: 'IN_PROGRESS', label: 'Đang thực hiện' },
  { value: 'COMPLETED', label: 'Hoàn thành' },
  { value: 'CANCELLED', label: 'Đã hủy' },
  { value: 'OVERDUE', label: 'Quá hạn' },
]

const TASK_TYPE_OPTIONS = [
  { value: '1', label: 'Xử lý ao (POND_PROCESS)' },
  { value: '2', label: 'Cho ăn (FEEDING)' },
  { value: '3', label: 'Cho thuốc (TREATMENT)' },
  { value: '4', label: 'Kiểm tra môi trường (ENVIRONMENTAL_CHECK)' },
  { value: '5', label: 'Thu hoạch (HARVEST)' },
  { value: '6', label: 'Công việc khác (OTHER)' },
]

const normalize = (v) => String(v || '').trim().toUpperCase()
const formatDate = (v) => (v ? new Date(v).toLocaleString('vi-VN') : '-')

const TechnicianTasks = () => {
  const { user } = useAuth()

  // ===== DATA STATE =====
  const [tasks, setTasks] = useState([])
  const [ponds, setPonds] = useState([])
  const [products, setProducts] = useState([])
  const [workers, setWorkers] = useState([])
  const [matrixPonds, setMatrixPonds] = useState([])

  // ===== UI STATE =====
  const [loading, setLoading] = useState(true)
  const [loadingPonds, setLoadingPonds] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [selectedTask, setSelectedTask] = useState(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  // Filters State
  const [filterType, setFilterType] = useState('')
  const [filterPond, setFilterPond] = useState('')
  const [filterSeason, setFilterSeason] = useState('')
  const [filterWorker, setFilterWorker] = useState('')
  const [filterStatus, setFilterStatus] = useState('ALL')

  // Gom nhóm mùa vụ
  const seasons = useMemo(() => {
    const unique = [...new Set(tasks.map(t => t.season_id).filter(Boolean))];
    return unique.map(id => ({
      id,
      name: tasks.find(t => t.season_id === id)?.season_name || `Mùa vụ ${id}`
    }));
  }, [tasks]);

  // ===== FORM STATE =====
  const initialForm = {
    task_type: '',
    assignments: [],
    task_title: '',
    description: '',
    start_date: '',
    due_date: '',
    product_id: '',
    quantity: '',
  }
  const [form, setForm] = useState(initialForm)

  const getComputedStatus = (task) => {
    const baseStatus = normalize(task.status)
    if (['COMPLETED', 'CANCELLED'].includes(baseStatus)) {
      return baseStatus
    }
    if (task.due_date && new Date(task.due_date) < new Date()) {
      return 'OVERDUE'
    }
    return baseStatus
  }

  const getStatusLabel = (statusValue) => {
    const computed = normalize(statusValue)
    switch (computed) {
      case 'PENDING': return 'Chờ xử lý'
      case 'IN_PROGRESS': return 'Đang thực hiện'
      case 'COMPLETED': return 'Hoàn thành'
      case 'CANCELLED': return 'Đã hủy'
      case 'OVERDUE': return 'Quá hạn'
      default: return statusValue || '-'
    }
  }

  const getStatusBadgeClass = (task) => {
    const computed = getComputedStatus(task)
    switch (computed) {
      case 'IN_PROGRESS': return 'technician-ponds_status technician-ponds_status--farming'
      case 'PENDING': return 'technician-ponds_status technician-ponds_status--paused'
      case 'COMPLETED': return 'technician-ponds_status technician-ponds_status--renovating'
      case 'CANCELLED': return 'technician-ponds_status bg-gray-400 text-white'
      case 'OVERDUE': return 'technician-ponds_status bg-red-500 text-white font-bold'
      default: return 'technician-ponds_status bg-slate-500 text-white'
    }
  }

  const fetchTasks = useCallback(async () => {
    try {
      const res = await taskService.getAllTasks()
      setTasks(res?.data?.data || [])
    } catch {
      showToast({ title: 'Không tải được danh sách công việc', type: 'error' })
    }
  }, [])

  const fetchProducts = useCallback(async () => {
    try {
      const res = await productService.getProducts()
      setProducts(res?.data?.data || [])
    } catch {
      showToast({ title: 'Không tải được danh mục sản phẩm', type: 'error' })
    }
  }, [])

  const fetchWorkersStatus = useCallback(async () => {
    try {
      const res = await taskService.getWorkersStatus()
      setWorkers(res?.data?.data || [])
    } catch {
      showToast({ title: 'Không tải được trạng thái nhân công', type: 'error' })
    }
  }, [])

  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true)
      try {
        await Promise.all([
          fetchTasks(),
          fetchProducts(),
          fetchWorkersStatus()
        ])

        // FIX TẠI ĐÂY: Truyền trực tiếp số 6 vào thay vì bọc object cồng kềnh
        const pondRes = await taskService.getPondsByType(6)
        setPonds(pondRes?.data?.data || [])
      } catch (err) {
        console.error("Lỗi khi tải dữ liệu khởi tạo:", err)
      } finally {
        setLoading(false)
      }
    }
    loadInitialData()
  }, [fetchTasks, fetchProducts, fetchWorkersStatus])

  // FIX LỖI: Đồng bộ object cấu trúc params gửi lên Backend không làm mất giao diện ma trận
  const handleTypeChange = async (e) => {
  const typeCode = e.target.value ? e.target.value.trim() : ''
  setForm(prev => ({
    ...prev,
    task_type: typeCode,
    assignments: [],
    product_id: '',
    quantity: ''
  }))
  setMatrixPonds([])

  if (!typeCode) return

  setLoadingPonds(true)
  try {
    // FIX TẠI ĐÂY: Truyền thẳng ID đã được parse sang kiểu số
    const res = await taskService.getPondsByType(parseInt(typeCode, 10))
    setMatrixPonds(res?.data?.data || [])
  } catch (err) {
    showToast({ title: 'Lỗi khi tự động lọc danh sách ao tương ứng', type: 'error' })
  } finally {
    setLoadingPonds(false)
  }
}

  const toggleAssignment = (workerId, pondId) => {
    setForm(prev => {
      const isAlreadyChecked = prev.assignments.some(a => a.worker_id === workerId && a.pond_id === pondId);
      if (isAlreadyChecked) {
        return {
          ...prev,
          assignments: prev.assignments.filter(a => !(a.worker_id === workerId && a.pond_id === pondId))
        };
      }
      const otherTasks = prev.assignments.filter(a => a.worker_id !== workerId);
      return {
        ...prev,
        assignments: [...otherTasks, { worker_id: workerId, pond_id: pondId }]
      };
    });
  };

  // ===== TÍNH TOÁN SỐ LIỆU THỐNG KÊ =====
  const stats = useMemo(() => {
    const computedTasks = tasks.map(t => ({ ...t, computedStatus: getComputedStatus(t) }))
    return {
      total: computedTasks.length,
      pending: computedTasks.filter(t => t.computedStatus === 'PENDING').length,
      progress: computedTasks.filter(t => t.computedStatus === 'IN_PROGRESS').length,
      completed: computedTasks.filter(t => t.computedStatus === 'COMPLETED').length,
      overdue: computedTasks.filter(t => t.computedStatus === 'OVERDUE').length,
    }
  }, [tasks])

  const taskStatusChartData = [
    { label: 'Chờ xử lý', value: stats.pending, color: '#f59e0b' },
    { label: 'Đang thực hiện', value: stats.progress, color: '#3b82f6' },
    { label: 'Hoàn thành', value: stats.completed, color: '#22c55e' },
    { label: 'Quá hạn', value: stats.overdue, color: '#ef4444' },
  ]

  const taskTypeChartData = useMemo(() => {
    const typeCounts = {}
    tasks.forEach(t => {
      const typeLabel = t.type_name || t.task_type || 'Khác'
      typeCounts[typeLabel] = (typeCounts[typeLabel] || 0) + 1
    })
    const colorPalette = ['#3b82f6', '#06b6d4', '#7c3aed', '#ef4444', '#f59e0b', '#10b981']
    return Object.keys(typeCounts).map((key, idx) => ({
      label: key,
      value: typeCounts[key],
      color: colorPalette[idx % colorPalette.length]
    }))
  }, [tasks])

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchType = !filterType || String(task.type_id) === String(filterType);
      const matchPond = !filterPond || String(task.pond_id) === String(filterPond);
      const matchSeason = !filterSeason || String(task.season_id) === String(filterSeason);
      const matchWorker = !filterWorker || (
        task.assigned_workers_list &&
        task.assigned_workers_list.some(w => String(w.worker_id) === String(filterWorker))
      );
      const matchStatus = filterStatus === 'ALL' || String(getComputedStatus(task)) === String(filterStatus);

      return matchType && matchPond && matchSeason && matchWorker && matchStatus;
    });
  }, [tasks, filterType, filterPond, filterSeason, filterWorker, filterStatus]);

  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / pageSize))
  const safePage = Math.min(currentPage, totalPages)
  const startIndex = (safePage - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, filteredTasks.length)
  const paginatedTasks = filteredTasks.slice(startIndex, endIndex)

  const isProductRequired = useMemo(() => {
    return ['1', '2', '3', 1, 2, 3].includes(parseInt(form.task_type, 10))
  }, [form.task_type])

  const handleCreateTask = async () => {
    if (!form.assignments || form.assignments.length === 0) {
      showToast({ title: 'Vui lòng chọn ít nhất một phân công trong ma trận', type: 'warning' })
      return
    }
    if (!form.description?.trim()) {
      showToast({ title: 'Vui lòng nhập hướng dẫn kỹ thuật', type: 'warning' })
      return
    }

    const confirmAction = window.confirm(`Xác nhận tạo ${form.assignments.length} dòng công việc độc lập?`)
    if (!confirmAction) return

    setLoading(true)
    try {
      let finalTitle = form.task_title?.trim()
      if (!finalTitle) {
        const typeOpt = TASK_TYPE_OPTIONS.find(o => o.value === form.task_type)
        finalTitle = typeOpt ? `Công tác ${typeOpt.label.split(' (')[0]}` : 'Công việc kỹ thuật'
      }

      const numericTypeId = parseInt(form.task_type, 10);

      if (isNaN(numericTypeId)) {
        showToast({ title: 'Loại công việc không hợp lệ, vui lòng chọn lại!', type: 'error' });
        setLoading(false);
        return;
      }

      for (const assignment of form.assignments) {
        const selectedPondObj = matrixPonds.find(p => Number(p.pond_id) === Number(assignment.pond_id))

        const singleTaskData = {
          type_id: numericTypeId,
          pond_id: Number(assignment.pond_id),
          task_title: finalTitle,
          description: form.description.trim(),
          start_date: form.start_date,
          due_date: form.due_date,
          assigned_workers: [Number(assignment.worker_id)]
        }

        if (selectedPondObj?.season_id) {
          singleTaskData.season_id = Number(selectedPondObj.season_id)
        }

        if (['1', '2', '3', 1, 2, 3].includes(numericTypeId) && form.product_id) {
          singleTaskData.product_id = Number(form.product_id)
          singleTaskData.quantity = parseFloat(form.quantity) || 0
        }

        await taskService.createTask(singleTaskData)
      }

      showToast({ title: `Đã kích hoạt thành công ${form.assignments.length} công việc!`, type: 'success' })
      setForm(initialForm)
      setIsCreateOpen(false)
      await fetchTasks()
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.response?.data?.message || 'Lỗi hệ thống'
      showToast({ title: 'Không thể tạo công việc: ' + errorMsg, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleCancelTask = async (taskId) => {
    const confirmCancel = window.confirm("Bạn có chắc chắn muốn HỦY bỏ hoàn toàn công việc này không?")
    if (!confirmCancel) return

    try {
      await taskService.cancelTask(taskId)
      showToast({ title: 'Đã hủy công việc thành công', type: 'success' })
      setSelectedTask(null)
      await Promise.all([fetchTasks(), fetchWorkersStatus()])
    } catch (err) {
      showToast({ title: err.response?.data?.message || 'Không thể hủy công việc', type: 'error' })
    }
  }

  const getAssignedWorkersName = (task) => {
    if (task.assigned_workers_list && Array.isArray(task.assigned_workers_list)) {
      return task.assigned_workers_list.map(w => w.full_name).join(', ');
    }
    return 'Chưa phân công';
  };

  if (loading) {
    return (
      <div className="dashboard admin-page technician-seasons_page technician-tasks_page">
        <div className="flex-center table-loading-container">
          <div className="spinner" />
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard admin-page technician-seasons_page technician-tasks_page">
      <div className="table-container table-panel">

        {/* TIÊU ĐỀ CHÍNH TRANG */}
        <div className="table-header">
          <div>
            <h2>Quản lý công việc</h2>
            <p className="table-subtitle">Giám sát và phân phối ma trận việc làm cho Công nhân kỹ thuật</p>
          </div>
          <button type="button" className="btn btn-primary" onClick={() => setIsCreateOpen(true)}>
            + Phân công việc (Hệ Ma trận)
          </button>
        </div>

        {/* THẺ TỔNG QUAN CHUẨN Y ĐÚNG HÌNH ẢNH MẪU BẠN GỬI */}
        <div className="stats-grid">

          <div className="stats-card stats-card--neutral">
            <span className="stats-card-label">Tổng công việc</span>
            <strong className="stats-card-value">{stats.total}</strong>
          </div>

          <div className="stats-card stats-card--warning">
            <span className="stats-card-label">Chờ xử lý</span>
            <strong className="stats-card-value">{stats.pending}</strong>
          </div>

          <div className="stats-card stats-card--primary">
            <span className="stats-card-label">Đang thực hiện</span>
            <strong className="stats-card-value">{stats.progress}</strong>
          </div>

          <div className="stats-card stats-card--success">
            <span className="stats-card-label">Hoàn thành</span>
            <strong className="stats-card-value">{stats.completed}</strong>
          </div>

          <div className="stats-card stats-card--danger">
            <span className="stats-card-label">Quá hạn</span>
            <strong className="stats-card-value">{stats.overdue}</strong>
          </div>

        </div>

        {/* LƯỚI BIỂU ĐỒ THỐNG KÊ ĐỒNG BỘ */}
        <div className="technician-ponds_charts-grid">
          <PondChartCard
            prefix="technician-ponds"
            title="Công việc theo trạng thái"
            type="bar"
            data={taskStatusChartData}
          />
          <PondChartCard
            prefix="technician-ponds"
            title="Tỷ lệ phân loại công việc"
            type="bar"
            data={taskTypeChartData}
          />
        </div>

        {/* THANH BỘ LỌC CÔNG CỤ */}
        <div className="table-toolbar technician-ponds_toolbar">
          <select
            className="table-filter"
            value={filterType}
            onChange={(e) => { setFilterType(e.target.value); setCurrentPage(1); }}
          >
            <option value="">Tất cả loại công việc</option>
            {TASK_TYPE_OPTIONS.map((type) => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>

          <select className="table-filter" value={filterPond} onChange={(e) => { setFilterPond(e.target.value); setCurrentPage(1); }}>
            <option value="">Tất cả ao nuôi</option>
            {ponds.map(pond => (
              <option key={pond.pond_id} value={pond.pond_id}>{pond.pond_name}</option>
            ))}
          </select>

          <select className="table-filter" value={filterSeason} onChange={(e) => { setFilterSeason(e.target.value); setCurrentPage(1); }}>
            <option value="">Tất cả mùa vụ</option>
            {seasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>

          <select className="table-filter" value={filterWorker} onChange={(e) => { setFilterWorker(e.target.value); setCurrentPage(1); }}>
            <option value="">Tất cả nhân viên</option>
            {workers.map(w => <option key={w.worker_id} value={w.worker_id}>{w.full_name}</option>)}
          </select>

          <select className="table-filter" value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}>
            <option value="ALL">Tất cả trạng thái</option>
            {STATUS_OPTIONS.filter(s => s.value !== 'ALL').map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        {/* BẢNG DANH SÁCH */}
        <div className="table-wrapper">
          <table className="table-base">
            <thead>
              <tr>
                <th>Loại công việc</th>
                <th>Ao nuôi</th>
                <th>Mùa vụ</th>
                <th>Người thực hiện</th>
                <th>Hạn hoàn thành</th>
                <th>Trạng thái</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {paginatedTasks.length === 0 ? (
                <tr>
                  <td className="table-empty-row" colSpan="7" style={{ textAlign: 'center', padding: '24px' }}>Không có dữ liệu công việc trùng khớp...</td>
                </tr>
              ) : (
                paginatedTasks.map((t, idx) => (
                  <tr key={`task-row-${t.task_id || idx}`}>
                    <td>
                      <div className="technician-ponds_name-block">
                        <strong>{t.type_name || t.task_type}</strong>
                        <div style={{ fontSize: '0.85em', color: '#64748b', fontWeight: 'normal' }}>{t.task_title}</div>
                      </div>
                    </td>
                    <td>{t.pond_name || '-'}</td>
                    <td>{t.season_name || '-'}</td>
                    <td><strong>{getAssignedWorkersName(t)}</strong></td>
                    <td>{formatDate(t.due_date)}</td>
                    <td>
                      <span className={getStatusBadgeClass(t)}>
                        {getStatusLabel(getComputedStatus(t))}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button type="button" className="table-action-btn table-action-btn--view" title="Xem chi tiết" onClick={() => setSelectedTask(t)}>
                          ⓘ
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PHÂN TRANG */}
        <div className="table-pagination">
          <div className="table-pagination-left">
            <span>Số mục trên trang</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value) || 10)
                setCurrentPage(1)
              }}
            >
              {[5, 10, 20, 50].map((size) => (
                <option key={`page-size-${size}`} value={size}>{size}</option>
              ))}
            </select>
            <span>{filteredTasks.length === 0 ? 0 : startIndex + 1}-{endIndex} / {filteredTasks.length}</span>
          </div>

          <div className="table-pagination-right">
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              disabled={safePage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              ‹
            </button>
            <span className="table-page-pill">{safePage}</span>
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              disabled={safePage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              ›
            </button>
          </div>
        </div>
      </div>

      {/* MODAL XEM CHI TIẾT CÔNG VIỆC CHUẨN GRID ĐỒNG BỘ 100% POND/SEASON */}
      {selectedTask && (
        <div className="modal" onClick={() => setSelectedTask(null)}>
          <div className="modal-content technician-seasons_modal" style={{ maxWidth: '800px' }} onClick={(e) => e.stopPropagation()}>
            <h3 className="technician-seasons_modal-title">Chi tiết tiến độ công việc</h3>

            {/* Áp dụng class lưới cấu trúc của trang Season */}
            <div className="technician-seasons_detail-grid">

              {/* --- KHỐI THÔNG TIN CHUNG (BẢNG tasks & task_types) --- */}
              <div>
                <strong>Mã công việc:</strong>
                <p style={{ color: '#0284c7', fontWeight: '600' }}>{selectedTask.task_code || '-'}</p>
              </div>
              <div>
                <strong>Loại công việc:</strong>
                <p><strong>{selectedTask.type_name || selectedTask.task_type || '-'}</strong></p>
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <strong>Tiêu đề công việc:</strong>
                <p style={{ fontWeight: '500', color: '#1e293b' }}>{selectedTask.task_title || '-'}</p>
              </div>

              {/* --- LIÊN KẾT ĐỊA ĐIỂM & BỐ CẢNH --- */}
              <div>
                <strong>Ao nuôi thực hiện:</strong>
                <p>{selectedTask.pond_name || '-'} {selectedTask.pond_code ? `(${selectedTask.pond_code})` : ''}</p>
              </div>
              <div>
                <strong>Thuộc mùa vụ:</strong>
                <p>{selectedTask.season_name || 'Công việc chung (Không gắn với mùa vụ)'}</p>
              </div>

              {/* --- TIẾN TRÌNH THỜI GIAN THEO KẾ HOẠCH --- */}
              <div>
                <strong>Thời gian bắt đầu kế hoạch:</strong>
                <p>{formatDate(selectedTask.start_date)}</p>
              </div>
              <div>
                <strong>Hạn chót hoàn thành:</strong>
                <p>{formatDate(selectedTask.due_date)}</p>
              </div>

              {/* --- NHÂN SỰ GIAO VIỆC & TRẠNG THÁI TỔNG --- */}
              <div>
                <strong>Kỹ sư giao việc:</strong>
                <p>{selectedTask.creator_name || `Kỹ sư hệ thống (ID: ${selectedTask.assigned_by})`}</p>
              </div>
              <div>
                <strong>Trạng thái công việc tổng:</strong>
                <p style={{ marginTop: '4px' }}>
                  <span className={getStatusBadgeClass(selectedTask)}>
                    {getStatusLabel(getComputedStatus(selectedTask))}
                  </span>
                </p>
              </div>

              {/* --- DỮ LIỆU LOG THỜI GIAN HỆ THỐNG --- */}
              <div>
                <strong>Ngày tạo bản ghi:</strong>
                <p style={{ color: '#64748b', fontSize: '0.85rem' }}>{formatDate(selectedTask.created_at)}</p>
              </div>
              <div>
                <strong>Cập nhật cuối lúc:</strong>
                <p style={{ color: '#64748b', fontSize: '0.85rem' }}>{formatDate(selectedTask.updated_at)}</p>
              </div>

              {/* --- VẬT TƯ CHỈ ĐỊNH (BẢNG task_product_usage - LOẠI BỎ ĐƠN GIÁ VÀ THÀNH TIỀN) --- */}
              {selectedTask.product_info ? (
                <div style={{ gridColumn: '1 / -1', background: '#f0f9ff', borderColor: '#bae6fd' }}>
                  <strong style={{ color: '#0369a1' }}>Vật tư chỉ định sử dụng:</strong>
                  <p style={{ marginTop: '6px', color: '#1e293b' }}>
                    Sản phẩm: <strong style={{ color: '#0369a1' }}>{selectedTask.product_info.product_name}</strong>
                    &nbsp;—&nbsp; Số lượng định mức (quantity): <strong style={{ color: '#0284c7', fontSize: '1.05rem' }}>{selectedTask.product_info.quantity}</strong> {selectedTask.product_info.unit || ''}
                  </p>
                </div>
              ) : (
                <div style={{ gridColumn: '1 / -1', background: '#f8fafc', borderStyle: 'dashed', color: '#64748b' }}>
                  <span style={{ fontSize: '0.85rem', fontStyle: 'italic' }}>Công việc này không yêu cầu xuất vật tư từ kho đi kèm.</span>
                </div>
              )}

              {/* --- CHI TIẾT PHÂN CÔNG & TIẾN ĐỘ THỰC TẾ (BẢNG task_workers) --- */}
              <div style={{ gridColumn: '1 / -1', background: '#fcf8f2', borderColor: '#fed7aa' }}>
                <strong style={{ color: '#c2410c' }}>Chi tiết phân công & Tiến độ thực tế của Công nhân:</strong>
                <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedTask.assigned_workers_list && selectedTask.assigned_workers_list.length > 0 ? (
                    selectedTask.assigned_workers_list.map((worker, idx) => (
                      <div key={`detail-worker-${worker.worker_id || idx}`} style={{ background: '#ffffff', padding: '10px 14px', borderRadius: '8px', border: '1px solid #ffedd5' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <strong>Công nhân phụ trách: <span style={{ color: '#ea580c', fontSize: '0.95rem' }}>{worker.full_name}</span></strong>
                          <span style={{
                            fontSize: '11px',
                            padding: '3px 10px',
                            borderRadius: '20px',
                            background: worker.worker_status === 'DONE' ? '#d1fae5' : '#fef3c7',
                            color: worker.worker_status === 'DONE' ? '#065f46' : '#d97706',
                            fontWeight: '600'
                          }}>
                            {worker.worker_status || 'ASSIGNED'}
                          </span>
                        </div>

                        {/* Hiển thị các trường thời gian thực tế của công nhân */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px', fontSize: '0.85rem', color: '#475569' }}>
                          <div>⏱ Nhận việc thực tế (started_at): <span style={{ color: '#0f172a', fontWeight: '500' }}>{formatDate(worker.started_at)}</span></div>
                          <div>✓ Bấm xong thực tế (completed_at): <span style={{ color: '#0f172a', fontWeight: '500' }}>{formatDate(worker.completed_at)}</span></div>
                        </div>

                        {/* Giải trình/Ghi chú báo cáo từ thực địa */}
                        {worker.note && (
                          <div style={{ marginTop: '8px', padding: '6px 10px', background: '#f8fafc', borderRadius: '6px', borderLeft: '3px solid #cbd5e1', fontSize: '0.85rem', color: '#334155' }}>
                            <strong>Báo cáo/Ghi chú từ công nhân (note):</strong> {worker.note}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <p style={{ color: '#ef4444', fontStyle: 'italic', margin: 0, fontSize: '0.85rem' }}>Chưa cấu hình danh sách công nhân phụ trách.</p>
                  )}
                </div>
              </div>

              {/* --- HƯỚNG DẪN KỸ THUẬT CHI TIẾT --- */}
              <div style={{ gridColumn: '1 / -1' }}>
                <strong>Hướng dẫn kỹ thuật / Mô tả nghiệp vụ:</strong>
                <p className="technical-instruction-text" style={{ whiteSpace: 'pre-line', color: '#334155', background: '#ffffff', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '6px', lineHeight: '1.5', fontSize: '0.9rem' }}>
                  {selectedTask.description || 'Không có mô tả hoặc hướng dẫn cụ thể.'}
                </p>
              </div>
            </div>

            {/* --- MỤC HÌNH ẢNH MINH CHỨNG BÁO CÁO THỰC ĐỊA --- */}
            {selectedTask.task_images && selectedTask.task_images.length > 0 && (
              <div style={{ marginTop: '16px', padding: '0 4px' }}>
                <span style={{ fontWeight: '600', fontSize: '0.85rem', color: '#475569' }}>Hình ảnh minh chứng thực địa (task_images):</span>
                <div style={{ display: 'flex', gap: '12px', marginTop: '8px', flexWrap: 'wrap' }}>
                  {selectedTask.task_images.map((imgUrl, i) => (
                    <img
                      key={`task-img-view-${i}`}
                      src={imgUrl}
                      alt={`Báo cáo thực địa ${i + 1}`}
                      style={{ width: '90px', height: '90px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #cbd5e1', cursor: 'pointer', transition: 'transform 0.2s' }}
                      onClick={() => window.open(imgUrl, '_blank')}
                      onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
                      onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* --- CỤM HÀNH ĐỘNG PHÍA CUỐI MODAL --- */}
            <div className="technician-seasons_actions" style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                {normalize(selectedTask.status) === 'PENDING' && (
                  <button type="button" className="btn btn-danger" onClick={() => handleCancelTask(selectedTask.task_id)}>
                    Hủy bỏ công việc
                  </button>
                )}
              </div>
              <button type="button" className="btn btn-secondary" onClick={() => setSelectedTask(null)}>Đóng hộp thoại</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FORM TẠO MỚI MA TRẬN CHUẨN ĐỒNG BỘ HOÀN TOÀN INPUT SEASON */}
      {isCreateOpen && (
        <div className="modal" onClick={() => setIsCreateOpen(false)}>
          <div className="modal-content technician-seasons_modal" style={{ maxWidth: '780px' }} onClick={(e) => e.stopPropagation()}>
            <h3 className="technician-seasons_modal-title">Phân công công việc (Hệ Ma Trận)</h3>

            <div className="technician-seasons_form-box" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              <div className="technician-seasons_input-group">
                <label className="technician-seasons_input-label">Loại công việc kỹ thuật <span style={{ color: 'red' }}>*</span></label>
                <select className="technician-seasons_input-field" value={form.task_type} onChange={handleTypeChange}>
                  <option value="">-- Chọn loại công việc để tải ma trận ao thích hợp --</option>
                  {TASK_TYPE_OPTIONS.map((opt) => (
                    <option key={`modal-type-${opt.value}`} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* MA TRẬN PHÂN CÔNG ĐỒNG BỘ BOX */}
              {form.task_type && (
                <div className="matrix-wrapper-container" style={{ border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden' }}>
                  <div style={{ background: '#f8fafc', padding: '10px 14px', borderBottom: '1px solid #cbd5e1', fontWeight: '600', fontSize: '13px', color: '#1e293b' }}>
                    MA TRẬN PHÂN PHỐI (NHÂN VIÊN × AO NUÔI ĐANG HOẠT ĐỘNG)
                  </div>
                  <div style={{ overflowX: 'auto', width: '100%', maxHeight: '240px' }}>
                    <table className="matrix-table-base" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ background: '#f1f5f9' }}>
                          <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Nhân công / Ao</th>
                          {matrixPonds.map(p => (
                            <th key={`matrix-head-p-${p.pond_id}`} style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #e2e8f0', borderLeft: '1px solid #e2e8f0' }}>
                              {p.pond_name}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {workers.map((w) => {
                          const wId = Number(w.worker_id || w.user_id);
                          const isBusy = normalize(w.work_status) === 'BUSY';
                          return (
                            <tr key={`matrix-row-w-${wId}`} style={{ borderBottom: '1px solid #e2e8f0', background: isBusy ? '#f8fafc' : '#ffffff' }}>
                              <td style={{ padding: '10px', fontWeight: '500' }}>
                                {w.full_name}
                                <span style={{ fontSize: '10px', display: 'block', color: isBusy ? '#ef4444' : '#22c55e' }}>
                                  {isBusy ? '● Đang bận việc khác' : '● Sẵn sàng'}
                                </span>
                              </td>
                              {matrixPonds.map(p => {
                                const pId = Number(p.pond_id);
                                const isChecked = form.assignments.some(a => a.worker_id === wId && a.pond_id === pId);
                                return (
                                  <td key={`matrix-cell-${wId}-${pId}`} style={{ textAlign: 'center', padding: '10px', borderLeft: '1px solid #e2e8f0' }}>
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      disabled={isBusy && !isChecked}
                                      style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                      onChange={() => toggleAssignment(wId, pId)}
                                    />
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="technician-seasons_input-group">
                <label className="technician-seasons_input-label">Tiêu đề mẫu công việc</label>
                <input type="text" className="technician-seasons_input-field" placeholder="Ví dụ: Cho tôm ăn cử sáng, Kiểm tra pH nước..." value={form.task_title} onChange={(e) => setForm({ ...form, task_title: e.target.value })} />
              </div>

              <div className="technician-seasons_input-group">
                <label className="technician-seasons_input-label">Hướng dẫn kỹ thuật / Ghi chú thực hiện <span style={{ color: 'red' }}>*</span></label>
                <textarea className="technician-seasons_input-field" rows="3" placeholder="Nhập chi tiết các bước thực hiện, liều lượng chuẩn..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>

              {isProductRequired && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', background: '#f0f9ff', padding: '14px', borderRadius: '12px', border: '1px dashed #0284c7' }}>
                  <div className="technician-seasons_input-group">
                    <label className="technician-seasons_input-label">Vật tư kho chỉ định sử dụng</label>
                    <select className="technician-seasons_input-field" value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })}>
                      <option value="">-- Chọn sản phẩm trong kho --</option>
                      {products.map((p) => (
                        <option key={`modal-prod-${p.product_id}`} value={p.product_id}>{p.product_name} ({p.unit})</option>
                      ))}
                    </select>
                  </div>
                  <div className="technician-seasons_input-group">
                    <label className="technician-seasons_input-label">Số lượng định mức / mỗi ao</label>
                    <input type="number" className="technician-seasons_input-field" step="0.01" min="0" placeholder="0.00" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="technician-seasons_input-group">
                  <label className="technician-seasons_input-label">Thời gian bắt đầu <span style={{ color: 'red' }}>*</span></label>
                  <input type="datetime-local" className="technician-seasons_input-field" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
                </div>
                <div className="technician-seasons_input-group">
                  <label className="technician-seasons_input-label">Hạn chót hoàn thành <span style={{ color: 'red' }}>*</span></label>
                  <input type="datetime-local" className="technician-seasons_input-field" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
                </div>
              </div>

            </div>

            <div className="technician-seasons_actions" style={{ marginTop: '24px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsCreateOpen(false)}>Hủy bỏ</button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleCreateTask}
                disabled={form.assignments.length === 0 || !form.start_date || !form.due_date}
              >
                Kích hoạt {form.assignments.length} công việc
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TechnicianTasks