import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { showToast } from '../../utils/toast'
import { taskService, productService, pondService, userService } from '../../services/api'
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

const TaskManagementPage = ({
    mode = 'technician',
    readOnly = false,
    canComplete = false,
    showWorkerFilter = true,
    showEngineerFilter = false,
    showEngineerColumn = false,
    pageTitle = 'Quản lý công việc',
    pageSubtitle = 'Giám sát và phân phối ma trận việc làm'
}) => {

    // ===== DATA STATE =====
    const [tasks, setTasks] = useState([])
    const [ponds, setPonds] = useState([])
    const [products, setProducts] = useState([])
    const [workers, setWorkers] = useState([])
    const [matrixPonds, setMatrixPonds] = useState([])
    const [engineersList, setEngineersList] = useState([])

    // ===== UI STATE =====
    const [loading, setLoading] = useState(true)
    const [, setLoadingPonds] = useState(false)
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize] = useState(10)
    const [selectedTask, setSelectedTask] = useState(null)
    const [isCreateOpen, setIsCreateOpen] = useState(false)

    // ===== FILTERS STATE =====
    const [filterType, setFilterType] = useState('')
    const [filterPond, setFilterPond] = useState('')
    const [filterSeason, setFilterSeason] = useState('')
    const [filterWorker, setFilterWorker] = useState('')
    const [filterEngineer, setFilterEngineer] = useState('') // Filter mới cho Owner
    const [filterStatus, setFilterStatus] = useState('ALL')

    const [reportNote, setReportNote] = useState('') // BỔ SUNG STATE GHI CHÚ

    // Gom nhóm dữ liệu cho bộ lọc
    const seasons = useMemo(() => {
        const unique = [...new Set(tasks.map(t => t.season_id).filter(Boolean))];
        return unique.map(id => ({
            id,
            name: tasks.find(t => t.season_id === id)?.season_name || `Mùa vụ ${id}`
        }));
    }, [tasks]);

    const engineers = useMemo(() => {
        const unique = [...new Set(tasks.map(t => t.assigned_by).filter(Boolean))];
        return unique.map(id => ({
            id,
            name: tasks.find(t => t.assigned_by === id)?.creator_name || `Kỹ sư ID: ${id}`
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

    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editForm, setEditForm] = useState({
        task_id: '',
        task_title: '',
        description: '',
        start_date: '',
        due_date: ''
    });

    // Hàm hỗ trợ format chuỗi thời gian chuẩn ISO cho thẻ <input type="datetime-local">
    const formatForInput = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const offset = date.getTimezoneOffset() * 60000;
        return (new Date(date - offset)).toISOString().slice(0, 16);
    }

    const getComputedStatus = (task) => {
        const baseStatus = normalize(task.status)
        if (['COMPLETED', 'CANCELLED'].includes(baseStatus)) return baseStatus
        if (task.due_date && new Date(task.due_date) < new Date()) return 'OVERDUE'
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

    useEffect(() => {
        const loadInitialData = async () => {
            setLoading(true)
            try {
                await fetchTasks()

                if (!readOnly && mode === 'technician') {
                    // LOGIC CỦA TECHNICIAN: Lấy dữ liệu phục vụ tạo mới công việc (Ma trận)
                    const [prodRes, workerRes, pondRes] = await Promise.all([
                        productService.getProducts(),
                        taskService.getWorkersStatus(),
                        taskService.getPondsByType(6)
                    ])
                    setProducts(prodRes?.data?.data || [])
                    setWorkers(workerRes?.data?.data || [])
                    setPonds(pondRes?.data?.data || [])
                } else if (mode === 'owner') {
                    // LOGIC CỦA OWNER: Lấy Master Data bằng 1 lần gọi API
                    const [pondRes, userRes] = await Promise.all([
                        pondService.getAllPonds(),
                        userService.getAllUsers() // Lấy tất cả nhân sự trong trại
                    ])

                    setPonds(pondRes?.data?.data || [])

                    const allUsers = userRes?.data?.data || []

                    // 1. LỌC CHUẨN KỸ SƯ (TECHNICIAN)
                    const techs = allUsers.filter(u =>
                        String(u.role_name).toUpperCase() === 'TECHNICIAN' ||
                        String(u.role).toUpperCase() === 'TECHNICIAN'
                    )
                    setEngineersList(techs)

                    // 2. LỌC CHUẨN CÔNG NHÂN (WORKER)
                    const pureWorkers = allUsers.filter(u =>
                        String(u.role_name).toUpperCase() === 'WORKER' ||
                        String(u.role).toUpperCase() === 'WORKER'
                    )
                    setWorkers(pureWorkers) // Chỉ lưu đúng những người là Worker vào state này
                } else if (mode === 'worker') {

                }
            } catch (err) {
                console.error("Lỗi khi tải dữ liệu khởi tạo:", err)
            } finally {
                setLoading(false)
            }
        }
        loadInitialData()
    }, [fetchTasks, readOnly, mode])

    const handleTypeChange = async (e) => {
        if (readOnly) return; // Bảo vệ
        const typeCode = e.target.value ? e.target.value.trim() : ''
        setForm(prev => ({
            ...prev, task_type: typeCode, assignments: [], product_id: '', quantity: ''
        }))
        setMatrixPonds([])

        if (!typeCode) return

        setLoadingPonds(true)
        try {
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
                return { ...prev, assignments: prev.assignments.filter(a => !(a.worker_id === workerId && a.pond_id === pondId)) };
            }
            const otherTasks = prev.assignments.filter(a => a.worker_id !== workerId);
            return { ...prev, assignments: [...otherTasks, { worker_id: workerId, pond_id: pondId }] };
        });
    };

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
            const matchEngineer = !filterEngineer || String(task.assigned_by) === String(filterEngineer);
            const matchWorker = !filterWorker || (
                task.assigned_workers_list &&
                task.assigned_workers_list.some(w => String(w.worker_id) === String(filterWorker))
            );
            const matchStatus = filterStatus === 'ALL' || String(getComputedStatus(task)) === String(filterStatus);

            return matchType && matchPond && matchSeason && matchEngineer && matchWorker && matchStatus;
        });
    }, [tasks, filterType, filterPond, filterSeason, filterEngineer, filterWorker, filterStatus]);

    const totalPages = Math.max(1, Math.ceil(filteredTasks.length / pageSize))
    const safePage = Math.min(currentPage, totalPages)
    const startIndex = (safePage - 1) * pageSize
    const endIndex = Math.min(startIndex + pageSize, filteredTasks.length)
    const paginatedTasks = filteredTasks.slice(startIndex, endIndex)

    const isProductRequired = useMemo(() => ['1', '2', '3', 1, 2, 3].includes(parseInt(form.task_type, 10)), [form.task_type])

    const handleCreateTask = async () => {
        if (readOnly) return;
        if (!form.assignments || form.assignments.length === 0) {
            showToast({ title: 'Vui lòng chọn ít nhất một phân công trong ma trận', type: 'warning' })
            return
        }
        if (!form.description?.trim()) {
            showToast({ title: 'Vui lòng nhập hướng dẫn kỹ thuật', type: 'warning' })
            return
        }

        const now = new Date();
        const start = new Date(form.start_date);
        const due = new Date(form.due_date);

        // Trừ hao 2 phút cho độ trễ khi người dùng loay hoay nhập form
        if (start.getTime() < now.getTime() - (2 * 60000)) {
            showToast({ title: 'Thời gian bắt đầu không được nằm trong quá khứ!', type: 'error' });
            return;
        }

        if (due.getTime() <= start.getTime()) {
            showToast({ title: 'Thời gian kết thúc phải lớn hơn thời gian bắt đầu!', type: 'error' });
            return;
        }

        const durationMinutes = (due.getTime() - start.getTime()) / (1000 * 60);
        if (durationMinutes < 30) {
            showToast({ title: 'Thời lượng thực hiện công việc tối thiểu là 30 phút!', type: 'error' });
            return;
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
            showToast({ title: 'Không thể tạo công việc', type: 'error' })
        } finally {
            setLoading(false)
        }
    }

    const handleCancelTask = async (taskId) => {
        if (readOnly) return;
        const confirmCancel = window.confirm("Bạn có chắc chắn muốn HỦY bỏ hoàn toàn công việc này không?")
        if (!confirmCancel) return

        try {
            await taskService.cancelTask(taskId)
            showToast({ title: 'Đã hủy công việc thành công', type: 'success' })
            setSelectedTask(null)
            await fetchTasks()
        } catch (err) {
            showToast({ title: err.response?.data?.message || 'Không thể hủy công việc', type: 'error' })
        }
    }

    const handleOpenEdit = (task) => {
        setEditForm({
            task_id: task.task_id,
            task_title: task.task_title || '',
            description: task.description || '',
            start_date: formatForInput(task.start_date),
            due_date: formatForInput(task.due_date)
        });
        setIsEditOpen(true);
    }

    const handleUpdateTask = async () => {
        const now = new Date();
        const start = new Date(editForm.start_date);
        const due = new Date(editForm.due_date);

        if (start.getTime() < now.getTime() - (2 * 60000)) {
            showToast({ title: 'Thời gian bắt đầu không được nằm trong quá khứ!', type: 'error' });
            return;
        }
        if (due.getTime() <= start.getTime()) {
            showToast({ title: 'Hạn chót phải lớn hơn thời gian bắt đầu!', type: 'error' });
            return;
        }
        if ((due.getTime() - start.getTime()) / 60000 < 30) {
            showToast({ title: 'Thời lượng thực hiện tối thiểu là 30 phút!', type: 'error' });
            return;
        }

        setLoading(true);
        try {
            await taskService.updateTask(editForm.task_id, editForm);
            showToast({ title: 'Cập nhật thông tin thành công!', type: 'success' });
            setIsEditOpen(false);
            setSelectedTask(null); // Đóng detail
            await fetchTasks();
        } catch (err) {
            showToast({ title: err.response?.data?.message || 'Không thể cập nhật công việc', type: 'error' });
        } finally {
            setLoading(false);
        }
    }

    const handleCompleteTask = async (taskId) => {
        // ============================================================
        // LOGIC NGHIỆP VỤ: KIỂM TRA BẮT BUỘC GIẢI TRÌNH NẾU QUÁ HẠN
        // ============================================================
        const currentStatus = getComputedStatus(selectedTask);
        if (currentStatus === 'OVERDUE' && (!reportNote || !reportNote.trim())) {
            showToast({
                title: 'Công việc đã quá hạn! Bạn bắt buộc phải nhập lý do/ghi chú giải trình trước khi hoàn thành.',
                type: 'error'
            });
            return; // Chặn lại, không cho chạy tiếp lệnh bên dưới
        }

        const confirmComplete = window.confirm("Xác nhận đã hoàn tất công việc thực địa này?");
        if (!confirmComplete) return;

        try {
            await taskService.completeTask(taskId, { note: reportNote });
            showToast({ title: 'Hoàn thành công việc thành công!', type: 'success' });
            setSelectedTask(null);
            setReportNote('');
            await fetchTasks();
        } catch (err) {
            showToast({ title: err.response?.data?.message || 'Không thể hoàn thành', type: 'error' });
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
            <div className={`dashboard admin-page ${mode}-tasks_page technician-tasks_page`}>
                <div className="flex-center table-loading-container"><div className="spinner" /></div>
            </div>
        )
    }

    const displayEngineers = readOnly && engineersList.length > 0
        ? engineersList.map(e => ({ id: e.user_id, name: e.full_name }))
        : engineers;



    return (
        <div className={`dashboard admin-page ${mode}-tasks_page technician-tasks_page`}>
            <div className="table-container table-panel">
                <div className="table-header">
                    <div>
                        <h2>{pageTitle}</h2>
                        <p className="table-subtitle">{pageSubtitle}</p>
                    </div>
                    {!readOnly && (
                        <button type="button" className="btn btn-primary" onClick={() => setIsCreateOpen(true)}>
                            + Phân công việc (Hệ Ma trận)
                        </button>
                    )}
                </div>

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

                <div className="technician-ponds_charts-grid">
                    <PondChartCard prefix="technician-ponds" title="Công việc theo trạng thái" type="bar" data={taskStatusChartData} />
                    <PondChartCard prefix="technician-ponds" title="Tỷ lệ phân loại công việc" type="bar" data={taskTypeChartData} />
                </div>

                <div className="table-toolbar technician-ponds_toolbar">
                    <select className="table-filter" value={filterType} onChange={(e) => { setFilterType(e.target.value); setCurrentPage(1); }}>
                        <option value="">Tất cả loại công việc</option>
                        {TASK_TYPE_OPTIONS.map((type) => (
                            <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                    </select>

                    <select className="table-filter" value={filterPond} onChange={(e) => { setFilterPond(e.target.value); setCurrentPage(1); }}>
                        <option value="">Tất cả ao nuôi</option>
                        {/* Đã xóa biến uniquePondsFromTasks, giờ gọi thẳng ponds vì ponds đã chứa tất cả ao */}
                        {ponds.map(pond => (
                            <option key={pond.pond_id} value={pond.pond_id}>{pond.pond_name}</option>
                        ))}
                    </select>

                    <select className="table-filter" value={filterSeason} onChange={(e) => { setFilterSeason(e.target.value); setCurrentPage(1); }}>
                        <option value="">Tất cả mùa vụ</option>
                        {seasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>

                    {/* OWNER FILTER KỸ SƯ */}
                    {showEngineerFilter && (
                        <select className="table-filter" value={filterEngineer} onChange={(e) => { setFilterEngineer(e.target.value); setCurrentPage(1); }}>
                            <option value="">Tất cả kỹ sư</option>
                            {displayEngineers.map(eng => <option key={eng.id} value={eng.id}>{eng.name}</option>)}
                        </select>
                    )}

                    <select className="table-filter" value={filterWorker} onChange={(e) => { setFilterWorker(e.target.value); setCurrentPage(1); }}>
                        <option value="">Tất cả nhân viên</option>
                        {workers
                            // Lớp khiên bảo vệ chót: Đảm bảo chỉ render những người thực sự là WORKER
                            .filter(w => !w.role_name || String(w.role_name).toUpperCase() === 'WORKER' || String(w.role).toUpperCase() === 'WORKER')
                            .map(w => (
                                <option key={w.worker_id || w.user_id} value={w.worker_id || w.user_id}>
                                    {w.full_name}
                                </option>
                            ))
                        }
                    </select>

                    <select className="table-filter" value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}>
                        <option value="ALL">Tất cả trạng thái</option>
                        {STATUS_OPTIONS.filter(s => s.value !== 'ALL').map(s => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                    </select>
                </div>

                <div className="table-wrapper">
                    <table className="table-base">
                        <thead>
                            <tr>
                                <th>Loại công việc</th>
                                <th>Ao nuôi</th>
                                {showEngineerColumn && <th>Kỹ sư phụ trách</th>}
                                <th>Công nhân</th>
                                <th>Hạn hoàn thành</th>
                                <th>Trạng thái</th>
                                <th>Hành động</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedTasks.length === 0 ? (
                                <tr>
                                    <td className="table-empty-row" colSpan={showEngineerColumn ? "7" : "6"} style={{ textAlign: 'center', padding: '24px' }}>Không có dữ liệu</td>
                                </tr>
                            ) : (
                                paginatedTasks.map((t, idx) => (
                                    <tr key={`task-row-${t.task_id || idx}`}>
                                        <td>
                                            <div className="technician-ponds_name-block">
                                                <strong>{t.type_name || t.task_type}</strong>
                                                <div style={{ fontSize: '0.85em', color: '#64748b' }}>{t.task_title}</div>
                                            </div>
                                        </td>
                                        <td>{t.pond_name || '-'}</td>
                                        {showEngineerColumn && <td>{t.creator_name || '-'}</td>}
                                        <td><strong>{getAssignedWorkersName(t)}</strong></td>
                                        <td>{formatDate(t.due_date)}</td>
                                        <td>
                                            <span className={getStatusBadgeClass(t)}>
                                                {getStatusLabel(getComputedStatus(t))}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="table-actions product-management_actions">
                                                <button type="button" className="table-action-btn table-action-btn--view" title="Xem chi tiết" onClick={() => setSelectedTask(t)}>👁</button>
                                                
                                                {/* LOGIC ẨN/HIỆN NÚT THEO TRẠNG THÁI */}
                                                {!readOnly && getComputedStatus(t) === 'PENDING' && (
                                                    <>
                                                        <button type="button" className="table-action-btn table-action-btn--edit" title="Chỉnh sửa công việc" onClick={() => handleOpenEdit(t)}>✎</button>
                                                        <button type="button" className="table-action-btn table-action-btn--delete" title="Hủy bỏ công việc" onClick={() => handleCancelTask(t.task_id)}>🗑</button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* PHÂN TRANG (Giữ nguyên) */}
                <div className="table-pagination">
                    <div className="table-pagination-left">
                        <span>Số mục trên trang</span>
                        <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value) || 10); setCurrentPage(1); }}>
                            {[5, 10, 20, 50].map((size) => (<option key={`page-size-${size}`} value={size}>{size}</option>))}
                        </select>
                    </div>
                    <div className="table-pagination-right">
                        <button type="button" className="btn btn-sm btn-secondary" disabled={safePage <= 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}>‹</button>
                        <span className="table-page-pill">{safePage}</span>
                        <button type="button" className="btn btn-sm btn-secondary" disabled={safePage >= totalPages} onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}>›</button>
                    </div>
                </div>
            </div>

            {/* MODAL XEM CHI TIẾT CÔNG VIỆC CHUẨN GRID ĐỒNG BỘ 100% POND/SEASON */}
            {selectedTask && (
                <div className="modal" onClick={() => setSelectedTask(null)}>
                    <div className="modal-card product-management_detail-card" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="technician-seasons_modal-title">Chi tiết tiến độ công việc</h2>
                        </div>

                        <div className="product-management_detail-grid">

                            {/* --- KHỐI THÔNG TIN CHUNG --- */}
                            {/* ẨN MÃ CÔNG VIỆC VỚI WORKER */}
                            {mode !== 'worker' && (
                                <div className="modal-info-card">
                                    <label>Mã công việc:</label>
                                    <strong style={{ color: '#0284c7' }}>{selectedTask.task_code || '-'}</strong>
                                </div>
                            )}

                            {/* NẾU LÀ WORKER THÌ Ô NÀY SẼ CHIẾM FULL BỀ NGANG */}
                            <div className="modal-info-card" style={mode === 'worker' ? { gridColumn: '1 / -1' } : {}}>
                                <label>Loại công việc:</label>
                                <strong>{selectedTask.type_name || selectedTask.task_type || '-'}</strong>
                            </div>

                            <div className="modal-info-card" style={{ gridColumn: '1 / -1' }}>
                                <label>Tiêu đề công việc:</label>
                                <strong style={{ color: '#1e293b' }}>{selectedTask.task_title || '-'}</strong>
                            </div>

                            {/* --- LIÊN KẾT ĐỊA ĐIỂM & BỐ CẢNH --- */}
                            <div className="modal-info-card">
                                <label>Ao nuôi thực hiện:</label>
                                <strong>{selectedTask.pond_name || '-'} {selectedTask.pond_code ? `(${selectedTask.pond_code})` : ''}</strong>
                            </div>
                            <div className="modal-info-card">
                                <label>Thuộc mùa vụ:</label>
                                <strong>{selectedTask.season_name || 'Công việc chung'}</strong>
                            </div>

                            {/* --- TIẾN TRÌNH THỜI GIAN THEO KẾ HOẠCH --- */}
                            <div className="modal-info-card">
                                <label>Thời gian bắt đầu kế hoạch:</label>
                                <strong>{formatDate(selectedTask.start_date)}</strong>
                            </div>
                            <div className="modal-info-card">
                                <label>Hạn chót hoàn thành:</label>
                                <strong>{formatDate(selectedTask.due_date)}</strong>
                            </div>

                            {/* --- NHÂN SỰ GIAO VIỆC & TRẠNG THÁI TỔNG --- */}
                            <div className="modal-info-card">
                                <label>Kỹ sư giao việc:</label>
                                <strong>{selectedTask.creator_name || `Kỹ sư hệ thống (ID: ${selectedTask.assigned_by})`}</strong>
                            </div>
                            <div className="modal-info-card">
                                <label>Trạng thái công việc tổng:</label>
                                <div style={{ marginTop: '4px' }}>
                                    <span className={getStatusBadgeClass(selectedTask)}>
                                        {getStatusLabel(getComputedStatus(selectedTask))}
                                    </span>
                                </div>
                            </div>

                            {/* --- DỮ LIỆU LOG THỜI GIAN HỆ THỐNG --- */}
                            <div className="modal-info-card">
                                <label>Ngày tạo bản ghi:</label>
                                <strong style={{ color: '#64748b', fontSize: '0.9rem' }}>{formatDate(selectedTask.created_at)}</strong>
                            </div>
                            <div className="modal-info-card">
                                <label>Cập nhật cuối lúc:</label>
                                <strong style={{ color: '#64748b', fontSize: '0.9rem' }}>{formatDate(selectedTask.updated_at)}</strong>
                            </div>

                            {/* --- VẬT TƯ CHỈ ĐỊNH --- */}
                            {selectedTask.product_info ? (
                                <div className="modal-info-card" style={{ gridColumn: '1 / -1', background: '#f0f9ff', borderColor: '#bae6fd' }}>
                                    <label style={{ color: '#0369a1' }}>Vật tư chỉ định sử dụng:</label>
                                    <div style={{ marginTop: '6px', color: '#1e293b' }}>
                                        Sản phẩm: <strong style={{ color: '#0369a1' }}>{selectedTask.product_info.product_name}</strong>
                                        &nbsp;—&nbsp; Số lượng định mức: <strong style={{ color: '#0284c7', fontSize: '1.1rem' }}>{selectedTask.product_info.quantity}</strong> {selectedTask.product_info.unit || ''}
                                    </div>
                                </div>
                            ) : (
                                <div className="modal-info-card" style={{ gridColumn: '1 / -1', background: '#f8fafc', borderStyle: 'dashed', color: '#64748b' }}>
                                    <label>Vật tư chỉ định sử dụng:</label>
                                    <span style={{ fontSize: '0.9rem', fontStyle: 'italic' }}>Công việc này không yêu cầu xuất vật tư từ kho đi kèm.</span>
                                </div>
                            )}

                            {/* --- HƯỚNG DẪN KỸ THUẬT CHI TIẾT (ĐƯỢC ĐẨY LÊN TRÊN) --- */}
                            <div className="modal-info-card" style={{ gridColumn: '1 / -1' }}>
                                <label>Hướng dẫn kỹ thuật / Mô tả nghiệp vụ:</label>
                                <p className="technical-instruction-text" style={{ whiteSpace: 'pre-line', color: '#334155', background: '#ffffff', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '6px', lineHeight: '1.6', fontSize: '0.95rem' }}>
                                    {selectedTask.description || 'Không có mô tả hoặc hướng dẫn cụ thể.'}
                                </p>
                            </div>

                            {/* --- CHI TIẾT PHÂN CÔNG & BÁO CÁO (ẨN VỚI WORKER) --- */}
                            {mode !== 'worker' && (
                                <div className="modal-info-card" style={{ gridColumn: '1 / -1', background: '#fcf8f2', borderColor: '#fed7aa' }}>
                                    <label style={{ color: '#c2410c' }}>Chi tiết phân công & Báo cáo của Công nhân:</label>
                                    <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {selectedTask.assigned_workers_list && selectedTask.assigned_workers_list.length > 0 ? (
                                            selectedTask.assigned_workers_list.map((worker, idx) => (
                                                <div key={`detail-worker-${worker.worker_id || idx}`} style={{ background: '#ffffff', padding: '12px', borderRadius: '8px', border: '1px solid #ffedd5' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                        <strong>Công nhân phụ trách: <span style={{ color: '#ea580c' }}>{worker.full_name}</span></strong>
                                                        <span className={worker.worker_status === 'DONE' ? 'status-badge status-success' : 'status-badge status-warning'} style={{ fontSize: '0.8rem' }}>
                                                            {worker.worker_status || 'ASSIGNED'}
                                                        </span>
                                                    </div>

                                                    {/* Chỉ hiển thị Hoàn thành thực tế */}
                                                    <div style={{ fontSize: '0.9rem', color: '#475569', background: '#f8fafc', padding: '8px', borderRadius: '6px' }}>
                                                        ✓ Hoàn thành thực tế: <strong>{formatDate(worker.completed_at)}</strong>
                                                    </div>

                                                    {/* Hiển thị Ghi chú của Worker */}
                                                    {worker.note && (
                                                        <div style={{ marginTop: '8px', padding: '8px', background: '#f0f4f8', borderRadius: '6px', borderLeft: '3px solid #cbd5e1', fontSize: '0.9rem', color: '#334155' }}>
                                                            <strong>Ghi chú báo cáo:</strong> {worker.note}
                                                        </div>
                                                    )}
                                                </div>
                                            ))
                                        ) : (
                                            <p style={{ color: '#ef4444', fontStyle: 'italic', margin: 0, fontSize: '0.9rem' }}>Chưa cấu hình danh sách công nhân phụ trách.</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* --- MỤC HÌNH ẢNH MINH CHỨNG --- */}
                        {selectedTask.task_images && selectedTask.task_images.length > 0 && (
                            <div style={{ marginTop: '20px', padding: '0 4px' }}>
                                <label style={{ fontWeight: '600', fontSize: '0.9rem', color: '#475569', display: 'block', marginBottom: '8px' }}>Hình ảnh minh chứng thực địa:</label>
                                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                    {selectedTask.task_images.map((imgUrl, i) => (
                                        <img
                                            key={`task-img-view-${i}`}
                                            src={imgUrl}
                                            alt={`Báo cáo thực địa ${i + 1}`}
                                            style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #cbd5e1', cursor: 'pointer', transition: 'transform 0.2s' }}
                                            onClick={() => window.open(imgUrl, '_blank')}
                                            onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
                                            onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* --- BỔ SUNG: KHUNG BÁO CÁO CHO CÔNG NHÂN CÓ LOGIC NHẮC QUÁ HẠN --- */}
                        {canComplete && ['IN_PROGRESS', 'OVERDUE', 'PENDING'].includes(normalize(selectedTask.status)) && (
                            <div style={{ gridColumn: '1 / -1', background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '16px' }}>
                                <label style={{ fontWeight: '600', color: normalize(selectedTask.status) === 'OVERDUE' ? '#ef4444' : '#0f172a', display: 'block', marginBottom: '8px' }}>
                                    📝 Báo cáo kết quả / Ghi chú thực địa: {normalize(selectedTask.status) === 'OVERDUE' && '(⚠️ Công việc đã quá hạn, vui lòng giải trình)'}
                                </label>
                                <textarea
                                    style={{ width: '100%', minHeight: '80px', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem', fontFamily: 'inherit' }}
                                    placeholder="Ví dụ: Tôm ăn sung, còn dư 1kg thức ăn, đã xử lý quạt nước..."
                                    value={reportNote}
                                    onChange={(e) => setReportNote(e.target.value)}
                                />
                                <button
                                    type="button"
                                    style={{ marginTop: '12px', width: '100%', padding: '14px', fontWeight: 'bold', fontSize: '1rem', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.3)' }}
                                    onClick={() => handleCompleteTask(selectedTask.task_id)}
                                >
                                    ✓ XÁC NHẬN HOÀN THÀNH CÔNG VIỆC
                                </button>
                            </div>
                        )}

                        {/* --- CỤM HÀNH ĐỘNG PHÍA CUỐI MODAL --- */}
                        <div className="modal-actions" style={{ marginTop: '24px' }}>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button type="button" className="btn btn-secondary" onClick={() => setSelectedTask(null)}>Đóng hộp thoại</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL TẠO MỚI (CHỈ RENDER NẾU KHÔNG PHẢI READONLY) */}
            {!readOnly && isCreateOpen && (
                <div className="modal" onClick={() => setIsCreateOpen(false)}>
                    {/* Đổi sang class modal của Product */}
                    <div className="modal-content product-management_modal-content" style={{ maxWidth: '850px' }} onClick={(e) => e.stopPropagation()}>
                        <h2>Phân công công việc (Hệ Ma Trận)</h2>

                        {/* Đổi sang form-grid của Product để tự động chia 2 cột */}
                        <div className="product-management_form-grid" style={{ marginTop: '16px' }}>

                            {/* --- LOẠI CÔNG VIỆC (Full chiều ngang) --- */}
                            <div className="product-management_form-group product-management_form-group--full">
                                <label>Loại công việc kỹ thuật <span style={{ color: 'red' }}>*</span></label>
                                <select value={form.task_type} onChange={handleTypeChange}>
                                    <option value="">-- Chọn loại công việc để tải ma trận ao thích hợp --</option>
                                    {TASK_TYPE_OPTIONS.map((opt) => (
                                        <option key={`modal-type-${opt.value}`} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* --- MA TRẬN PHÂN CÔNG (Full chiều ngang) --- */}
                            {form.task_type && (
                                <div className="product-management_form-group product-management_form-group--full">
                                    <label>Ma trận phân phối (Nhân viên × Ao nuôi đang hoạt động)</label>
                                    <div className="matrix-wrapper-container" style={{ border: '1px solid #dbe6ee', borderRadius: '10px', overflow: 'hidden' }}>
                                        <div style={{ overflowX: 'auto', width: '100%', maxHeight: '280px' }}>
                                            <table className="matrix-table-base" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                                <thead>
                                                    <tr style={{ background: '#f8fafc' }}>
                                                        <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dbe6ee', position: 'sticky', top: 0, background: '#f8fafc', zIndex: 1 }}>Nhân công / Ao</th>
                                                        {matrixPonds.map(p => (
                                                            <th key={`matrix-head-p-${p.pond_id}`} style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #dbe6ee', borderLeft: '1px solid #dbe6ee', position: 'sticky', top: 0, background: '#f8fafc', zIndex: 1 }}>
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
                                                            <tr key={`matrix-row-w-${wId}`} style={{ borderBottom: '1px solid #dbe6ee', background: isBusy ? '#f1f5f9' : '#ffffff' }}>
                                                                <td style={{ padding: '12px', fontWeight: '600', color: '#334155' }}>
                                                                    {w.full_name}
                                                                    <span style={{ fontSize: '11px', display: 'block', color: isBusy ? '#ef4444' : '#10b981', marginTop: '2px', fontWeight: 'normal' }}>
                                                                        {isBusy ? '● Đang bận việc khác' : '● Sẵn sàng'}
                                                                    </span>
                                                                </td>
                                                                {matrixPonds.map(p => {
                                                                    const pId = Number(p.pond_id);
                                                                    const isChecked = form.assignments.some(a => a.worker_id === wId && a.pond_id === pId);
                                                                    return (
                                                                        <td key={`matrix-cell-${wId}-${pId}`} style={{ textAlign: 'center', padding: '12px', borderLeft: '1px solid #dbe6ee' }}>
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={isChecked}
                                                                                disabled={isBusy && !isChecked}
                                                                                style={{ width: '18px', height: '18px', cursor: isBusy && !isChecked ? 'not-allowed' : 'pointer', accentColor: '#0ea5e9' }}
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
                                </div>
                            )}

                            {/* --- TIÊU ĐỀ CÔNG VIỆC (Full chiều ngang) --- */}
                            <div className="product-management_form-group product-management_form-group--full">
                                <label>Tiêu đề mẫu công việc</label>
                                <input type="text" placeholder="Ví dụ: Cho tôm ăn cử sáng, Kiểm tra pH nước..." value={form.task_title} onChange={(e) => setForm({ ...form, task_title: e.target.value })} />
                            </div>

                            {/* --- VẬT TƯ CHỈ ĐỊNH (Chia nửa cột) --- */}
                            {isProductRequired && (
                                <>
                                    <div className="product-management_form-group">
                                        <label>Vật tư kho chỉ định sử dụng</label>
                                        <select value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })}>
                                            <option value="">-- Chọn sản phẩm trong kho --</option>
                                            {products.map((p) => (
                                                <option key={`modal-prod-${p.product_id}`} value={p.product_id}>{p.product_name} ({p.unit})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="product-management_form-group">
                                        <label>Số lượng định mức / mỗi ao</label>
                                        <input type="number" step="0.01" min="0" placeholder="0.00" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
                                    </div>
                                </>
                            )}

                            {/* --- THỜI GIAN (Chia nửa cột) --- */}
                            <div className="product-management_form-group">
                                <label>Thời gian bắt đầu <span style={{ color: 'red' }}>*</span></label>
                                <input type="datetime-local" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
                            </div>
                            <div className="product-management_form-group">
                                <label>Hạn chót hoàn thành <span style={{ color: 'red' }}>*</span></label>
                                <input type="datetime-local" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
                            </div>

                            {/* --- HƯỚNG DẪN KỸ THUẬT (Full chiều ngang) --- */}
                            <div className="product-management_form-group product-management_form-group--full">
                                <label>Hướng dẫn kỹ thuật / Ghi chú thực hiện <span style={{ color: 'red' }}>*</span></label>
                                <textarea rows="3" placeholder="Nhập chi tiết các bước thực hiện, liều lượng chuẩn..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                            </div>

                            {/* --- CỤM NÚT ACTION --- */}
                            <div className="product-management_form-actions" style={{ marginTop: '8px' }}>
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
                </div>
            )}

            {/* MODAL CHỈNH SỬA CÔNG VIỆC (Nằm đè lên lớp Detail Modal) */}
            {!readOnly && isEditOpen && (
                <div className="modal" onClick={() => setIsEditOpen(false)} style={{ zIndex: 1001, backgroundColor: 'rgba(0,0,0,0.6)' }}>
                    <div className="modal-content product-management_modal-content" style={{ maxWidth: '650px' }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header" style={{ marginBottom: '16px' }}>
                            <h2>Chỉnh sửa công việc</h2>
                            <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '4px' }}>Chỉ cho phép thay đổi kế hoạch và mô tả hướng dẫn.</p>
                        </div>

                        <div className="product-management_form-grid">
                            <div className="product-management_form-group product-management_form-group--full">
                                <label>Tiêu đề công việc <span style={{ color: 'red' }}>*</span></label>
                                <input type="text" value={editForm.task_title} onChange={(e) => setEditForm({ ...editForm, task_title: e.target.value })} />
                            </div>

                            <div className="product-management_form-group">
                                <label>Thời gian bắt đầu <span style={{ color: 'red' }}>*</span></label>
                                <input type="datetime-local" value={editForm.start_date} onChange={(e) => setEditForm({ ...editForm, start_date: e.target.value })} />
                            </div>

                            <div className="product-management_form-group">
                                <label>Hạn chót hoàn thành <span style={{ color: 'red' }}>*</span></label>
                                <input type="datetime-local" value={editForm.due_date} onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })} />
                            </div>

                            <div className="product-management_form-group product-management_form-group--full">
                                <label>Hướng dẫn kỹ thuật / Ghi chú <span style={{ color: 'red' }}>*</span></label>
                                <textarea rows="4" value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
                            </div>

                            <div className="product-management_form-actions" style={{ marginTop: '16px' }}>
                                <button type="button" className="btn btn-secondary" onClick={() => setIsEditOpen(false)}>Hủy bỏ</button>
                                <button type="button" className="btn btn-primary" onClick={handleUpdateTask} disabled={!editForm.task_title || !editForm.description || !editForm.start_date || !editForm.due_date}>
                                    Lưu thay đổi
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    )
}

export default TaskManagementPage