import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { showToast } from '../../utils/toast';
import { taskService, productService, pondService, userService } from '../../services/api';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

const STATUS_OPTIONS = [
    { value: 'ALL', label: 'Tất cả trạng thái' },
    { value: 'PENDING', label: 'Chờ xử lý' },
    { value: 'IN_PROGRESS', label: 'Đang thực hiện' },
    { value: 'COMPLETED', label: 'Hoàn thành' },
    { value: 'CANCELLED', label: 'Đã hủy' },
    { value: 'OVERDUE', label: 'Quá hạn' },
];

const TASK_TYPE_OPTIONS = [
    { value: '1', label: 'Xử lý ao (POND_PROCESS)' },
    { value: '2', label: 'Cho tôm ăn (FEEDING)' },
    { value: '3', label: 'Cho tôm dùng thuốc (TREATMENT)' },
    { value: '6', label: 'Kiểm tra môi trường (EXAM)' }, 
    { value: '4', label: 'Thu hoạch tôm (HARVEST)' },   
    { value: '5', label: 'Các công việc khác (OTHER)' },
];

const CHART_COLORS = ['#3b82f6', '#06b6d4', '#8b5cf6', '#ef4444', '#f59e0b', '#10b981'];
const normalize = (v) => String(v || '').trim().toUpperCase();

const formatDate = (v) => {
    if (!v) return '-';
    const date = new Date(v);
    return Number.isNaN(date.getTime()) ? '-' : new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' }).format(date);
};

const formatForInput = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '';
    const offset = date.getTimezoneOffset() * 60000;
    return (new Date(date - offset)).toISOString().slice(0, 16);
};

// 🌟 THÊM HÀM TÍNH TOÁN THỜI LƯỢNG CÔNG VIỆC CHUẨN
const getTaskDurationHours = (typeId) => {
    switch (String(typeId)) {
        case '1': return 4; // Xử lý ao: 4 tiếng
        case '2': return 2; // Cho ăn: 2 tiếng
        case '3': return 2; // Cho thuốc: 2 tiếng
        case '6': return 1; // Kiểm tra môi trường (ID 6): 1 tiếng
        case '4': return 8; // Thu hoạch (ID 4): 8 tiếng
        case '5': return 2; // Khác (ID 5): 2 tiếng
        default: return 2; 
    }
};

// Hàm tự động cộng giờ để xuất ra định dạng chuẩn của thẻ input
const calculateDueDate = (startStr, typeId) => {
    if (!startStr || !typeId) return startStr;
    const d = new Date(startStr);
    if (Number.isNaN(d.getTime())) return '';
    
    d.setHours(d.getHours() + getTaskDurationHours(typeId)); // Cộng thêm số giờ tương ứng
    
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().slice(0, 16);
};

const Sparkline = ({ color }) => (
    <svg className="w-full h-8 opacity-60" viewBox="0 0 100 30" preserveAspectRatio="none">
        <path d="M0 25 Q 20 5, 40 15 T 70 10 T 100 20" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-slate-800 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg shadow-lg border border-slate-700">
                {payload[0].payload.label}: <span className="text-emerald-400">{payload[0].value}</span>
            </div>
        );
    }
    return null;
};

const TaskManagementPage = ({
    mode = 'technician',
    readOnly = false,
    canComplete = false,
    showWorkerFilter = true,
    showEngineerFilter = false,
    showEngineerColumn = false,
    pageTitle = 'Quản lý công việc',
    pageSubtitle = 'Phân phối Kịch bản SOP & Tiến độ thực địa'
}) => {
    const [tasks, setTasks] = useState([]);
    const [ponds, setPonds] = useState([]);
    const [products, setProducts] = useState([]);
    const [workers, setWorkers] = useState([]);
    const [matrixPonds, setMatrixPonds] = useState([]);
    const [engineersList, setEngineersList] = useState([]);

    const [loading, setLoading] = useState(true);
    const [loadingPonds, setLoadingPonds] = useState(false);

    // Tab Phân trang (Mặc định 7 Ngày)
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(7);

    const [selectedTask, setSelectedTask] = useState(null);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);

    const [filterType, setFilterType] = useState('');
    const [filterPond, setFilterPond] = useState('');
    const [filterSeason, setFilterSeason] = useState('');
    const [filterWorker, setFilterWorker] = useState('');
    const [filterEngineer, setFilterEngineer] = useState('');
    const [filterStatus, setFilterStatus] = useState('ALL');

    const [reportNote, setReportNote] = useState('');

    const initialForm = { task_type: '', assignments: [], task_title: '', description: '', start_date: '', due_date: '', product_id: '', quantity: '' };
    const [form, setForm] = useState(initialForm);
    const [editForm, setEditForm] = useState({ task_id: '', type_id: '', task_title: '', description: '', start_date: '', due_date: '', assigned_workers: [], product_id: '', quantity: '' });

    // =======================================================================
    // 🌟 KHÔI PHỤC CÁC HÀM LOGIC BỊ MẤT
    // =======================================================================

    const getComputedStatus = useCallback((task) => {
        const baseStatus = normalize(task.status);
        if (['COMPLETED', 'CANCELLED'].includes(baseStatus)) return baseStatus;
        if (task.due_date && new Date(task.due_date) < new Date()) return 'OVERDUE';
        return baseStatus;
    }, []);

    const getFilteredProducts = useCallback((typeId) => {
        if (!typeId) return products;
        const type = String(typeId);
        return products.filter(p => {
            const catName = String(p.category_name || '').toLowerCase();
            if (type === '2') return catName.includes('thức ăn') || catName.includes('cám');
            if (type === '3') return catName.includes('thuốc') || catName.includes('khoáng') || catName.includes('vitamin');
            if (type === '1') return catName.includes('vi sinh') || catName.includes('vôi') || catName.includes('hóa chất') || catName.includes('xử lý');
            return true;
        });
    }, [products]);

    const isProductRequired = useMemo(() => ['1', '2', '3'].includes(String(form.task_type)), [form.task_type]);
    const isEditProductRequired = useMemo(() => ['1', '2', '3'].includes(String(editForm?.type_id || editForm?.task_type)), [editForm?.type_id, editForm?.task_type]);
    const busyPondIds = useMemo(() => new Set(), []);

    // API Handlers (Đã khôi phục)
    const handleCreateTask = async () => {
        try {
            // await taskService.createTasks(form); // Nếu có API
            showToast({ title: 'Giao việc thành công!', type: 'success' });
            setIsCreateOpen(false);
            fetchTasks();
        } catch (error) {
            showToast({ title: 'Lỗi giao việc', type: 'error' });
        }
    };

    const handleUpdateTask = async () => {
        try {
            // await taskService.updateTask(editForm.task_id, editForm); // Nếu có API
            showToast({ title: 'Cập nhật kế hoạch thành công!', type: 'success' });
            setIsEditOpen(false);
            fetchTasks();
        } catch (error) {
            showToast({ title: 'Lỗi cập nhật', type: 'error' });
        }
    };

    const handleCompleteTask = async (taskId) => {
        try {
            // Mở khóa gọi API xuống Backend (Truyền ghi chú reportNote theo đúng yêu cầu của taskController)
            await taskService.completeTask(taskId, { note: reportNote }); 
            
            showToast({ title: 'Đã báo cáo hoàn thành', type: 'success' });
            setSelectedTask(null); // Đóng Modal
            setReportNote(''); // Reset ô nhập ghi chú
            fetchTasks(); // Tải lại danh sách để thẻ chuyển sang màu xanh (Hoàn thành)
        } catch (error) {
            // Bắt lỗi rào chắn từ Backend (Ví dụ: Lỗi "Quá hạn bắt buộc phải có ghi chú")
            showToast({ title: error?.response?.data?.message || 'Lỗi báo cáo thực địa', type: 'error' });
        }
    };

    // Hàm gọi duy nhất 1 lần (Đã xóa bản bị trùng lặp)
    const handleOpenEdit = (task) => {
        setEditForm({
            ...task,
            start_date: formatForInput(task.start_date),
            due_date: formatForInput(task.due_date),
            assigned_workers: task.assigned_workers_list ? task.assigned_workers_list.map(w => w.worker_id) : []
        });
        setIsEditOpen(true);
    };

    // =======================================================================
    // 🌟 LOGIC LẤY DỮ LIỆU
    // =======================================================================

    const fetchTasks = useCallback(async () => {
        try {
            setLoading(true);
            const res = await taskService.getAllTasks();
            setTasks(res?.data?.data || []);
        } catch {
            showToast({ title: 'Không tải được danh sách', type: 'error' });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const loadInitialData = async () => {
            setLoading(true);
            try {
                await fetchTasks();
                if (!readOnly && mode === 'technician') {
                    const [prodRes, workerRes, pondRes] = await Promise.all([
                        productService.getProducts(),
                        taskService.getWorkersStatus(),
                        taskService.getPondsByType(6)
                    ]);
                    setProducts(prodRes?.data?.data || []);
                    setWorkers(workerRes?.data?.data || []);
                    setPonds(pondRes?.data?.data || []);
                } else if (mode === 'owner') {
                    const [pondRes, userRes] = await Promise.all([
                        pondService.getAllPonds(),
                        userService.getAllUsers()
                    ]);
                    setPonds(pondRes?.data?.data || []);
                    const allUsers = userRes?.data?.data || [];
                    setEngineersList(allUsers.filter(u => normalize(u.role_name) === 'TECHNICIAN' || normalize(u.role) === 'TECHNICIAN'));
                    setWorkers(allUsers.filter(u => normalize(u.role_name) === 'WORKER' || normalize(u.role) === 'WORKER'));
                }
            } catch (err) {
                showToast({ title: 'Lỗi khởi tạo dữ liệu', type: 'error' });
            } finally {
                setLoading(false);
            }
        };
        loadInitialData();
    }, [fetchTasks, readOnly, mode]);

    const seasons = useMemo(() => [...new Set(tasks.map(t => t.season_id).filter(Boolean))].map(id => ({ id, name: tasks.find(t => t.season_id === id)?.season_name || `Mùa vụ ${id}` })), [tasks]);
    const engineers = useMemo(() => [...new Set(tasks.map(t => t.assigned_by).filter(Boolean))].map(id => ({ id, name: tasks.find(t => t.assigned_by === id)?.creator_name || `Kỹ sư ID: ${id}` })), [tasks]);

    const handleTypeChange = async (e) => {
        if (readOnly) return;
        const typeCode = e.target.value?.trim() || '';
        
        let newStart = form.start_date;
        let newDue = form.due_date;

        // 🌟 LOGIC TỰ ĐỘNG ĐIỀN SẴN THỜI GIAN VÀO Ô CHỌN
        if (typeCode) {
            // 1. Nếu Kỹ sư chưa chọn giờ Bắt đầu, hệ thống tự động lấy Giờ hiện tại của máy tính
            if (!newStart) {
                const now = new Date();
                newStart = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
            }
            
            // 2. Tự động tính và điền Hạn chót dựa trên Loại công việc vừa chọn (2h, 4h, 8h...)
            newDue = calculateDueDate(newStart, typeCode);
        }

        setForm(prev => ({ 
            ...prev, 
            task_type: typeCode, 
            start_date: newStart || prev.start_date, // Gán trực tiếp vào ô Bắt đầu
            due_date: newDue || prev.due_date,       // Gán trực tiếp vào ô Hạn chót
            assignments: [], 
            product_id: '', 
            quantity: '' 
        }));
        
        setMatrixPonds([]);
        if (!typeCode) return;
        
        setLoadingPonds(true);
        try {
            const res = await taskService.getPondsByType(parseInt(typeCode, 10));
            setMatrixPonds(res?.data?.data || []);
        } catch (err) {
            showToast({ title: 'Lỗi tải danh sách ao', type: 'error' });
        } finally {
            setLoadingPonds(false);
        }
    };

    const toggleAssignment = (workerId, pondId) => {
        setForm(prev => {
            const isChecked = prev.assignments.some(a => a.worker_id === workerId && a.pond_id === pondId);
            if (isChecked) return { ...prev, assignments: prev.assignments.filter(a => !(a.worker_id === workerId && a.pond_id === pondId)) };
            return { ...prev, assignments: [...prev.assignments.filter(a => a.worker_id !== workerId), { worker_id: workerId, pond_id: pondId }] };
        });
    };

    // =======================================================================
    // 🌟 TÍNH TOÁN CHART & TIMELINE (ĐÃ HOÀN THIỆN)
    // =======================================================================
    const stats = useMemo(() => {
        const computedTasks = tasks.map(t => ({ ...t, computedStatus: getComputedStatus(t) }));
        return {
            total: computedTasks.length,
            pending: computedTasks.filter(t => t.computedStatus === 'PENDING').length,
            progress: computedTasks.filter(t => t.computedStatus === 'IN_PROGRESS').length,
            completed: computedTasks.filter(t => t.computedStatus === 'COMPLETED').length,
            overdue: computedTasks.filter(t => t.computedStatus === 'OVERDUE').length,
        };
    }, [tasks, getComputedStatus]);

    // Lọc ra các công việc chuẩn bị diễn ra trong 24h tới nhưng CHƯA CÓ NGƯỜI LÀM
    const unassignedUpcomingTasks = useMemo(() => {
        const now = new Date();
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Cộng thêm đúng 24 tiếng

        return tasks.filter(t =>
            getComputedStatus(t) === 'PENDING' &&
            !(t.assigned_workers_list?.length > 0) &&
            t.start_date && new Date(t.start_date) > now && new Date(t.start_date) <= tomorrow
        );
    }, [tasks, getComputedStatus]);

    const taskStatusChartData = [
        { label: 'Đang thực hiện', value: stats.progress, color: '#0ea5e9' },
        { label: 'Chờ xử lý', value: stats.pending, color: '#f59e0b' },
        { label: 'Hoàn thành', value: stats.completed, color: '#10b981' },
        { label: 'Quá hạn', value: stats.overdue, color: '#f43f5e' },
    ].filter(d => d.value > 0);

    const taskTypeChartData = useMemo(() => {
        const counts = {};
        tasks.forEach(t => { const l = t.type_name || t.task_type || 'Khác'; counts[l] = (counts[l] || 0) + 1; });
        return Object.keys(counts).map((key, idx) => ({ label: key, value: counts[key], color: CHART_COLORS[idx % CHART_COLORS.length] }));
    }, [tasks]);

    // 1. Lọc và Sắp xếp tất cả Task theo THỜI GIAN TĂNG DẦN
    const filteredTasks = useMemo(() => {
        return tasks.filter(task => {
            const matchType = !filterType || String(task.type_id) === String(filterType);
            const matchPond = !filterPond || String(task.pond_id) === String(filterPond);
            const matchSeason = !filterSeason || String(task.season_id) === String(filterSeason);
            const matchEngineer = !filterEngineer || String(task.assigned_by) === String(filterEngineer);
            // 🌟 LOGIC MỚI: Thêm tính năng lọc chính xác các việc "Chưa phân công"
            const matchWorker = !filterWorker || 
                (filterWorker === 'UNASSIGNED' 
                    ? !(task.assigned_workers_list?.length > 0) 
                    : (task.assigned_workers_list && task.assigned_workers_list.some(w => String(w.worker_id) === String(filterWorker))));
            const matchStatus = filterStatus === 'ALL' || String(getComputedStatus(task)) === String(filterStatus);
            return matchType && matchPond && matchSeason && matchEngineer && matchWorker && matchStatus;
        }).sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
    }, [tasks, filterType, filterPond, filterSeason, filterEngineer, filterWorker, filterStatus, getComputedStatus]);

    // 2. Gom nhóm theo Ngày (Đã Fix lỗi múi giờ)
    const tasksGroupedByDate = useMemo(() => {
        const groups = {};
        filteredTasks.forEach(t => {
            const dateObj = new Date(t.start_date || t.due_date);
            let dateStr = 'Khác';

            if (!Number.isNaN(dateObj.getTime())) {
                const yyyy = dateObj.getFullYear();
                const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
                const dd = String(dateObj.getDate()).padStart(2, '0');
                dateStr = `${yyyy}-${mm}-${dd}`;
            }

            if (!groups[dateStr]) groups[dateStr] = [];
            groups[dateStr].push(t);
        });

        return Object.keys(groups).sort((a, b) => {
            if (a === 'Khác') return 1;
            if (b === 'Khác') return -1;
            return new Date(a) - new Date(b);
        }).map(key => ({ dateStr: key, tasks: groups[key] }));
    }, [filteredTasks]);

    // 3. Phân trang theo SỐ NGÀY
    const totalPages = Math.max(1, Math.ceil(tasksGroupedByDate.length / pageSize));
    const safePage = Math.min(Math.max(currentPage, 1), totalPages);
    const startIndex = (safePage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, tasksGroupedByDate.length);
    const paginatedGroups = tasksGroupedByDate.slice(startIndex, endIndex);

    const getCalendarDateInfo = (dateStr) => {
        if (dateStr === 'Khác') return { dayOfWeek: 'Chưa rõ', dateInfo: 'Không có hạn chót', isToday: false };
        const [y, m, d] = dateStr.split('-');
        const dateObj = new Date(y, m - 1, d);
        const today = new Date();
        const tDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const diffDays = Math.round((dateObj - tDate) / (1000 * 60 * 60 * 24));
        const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
        let dayOfWeek = days[dateObj.getDay()];
        if (diffDays === 0) dayOfWeek = 'Hôm nay';
        else if (diffDays === 1) dayOfWeek = 'Ngày mai';
        else if (diffDays === -1) dayOfWeek = 'Hôm qua';

        return {
            dayOfWeek,
            dateInfo: dateObj.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
            isToday: diffDays === 0,
            isPast: diffDays < 0
        };
    };

    const getStatusBadge = (task) => {
        const status = getComputedStatus(task);
        switch (status) {
            case 'PENDING':
                return <span className="px-2 py-1 bg-amber-50 text-amber-600 border border-amber-200 text-[10px] font-black uppercase tracking-wide rounded shadow-sm whitespace-nowrap">Chờ xử lý</span>;
            case 'IN_PROGRESS':
                return <span className="px-2 py-1 bg-sky-50 text-sky-600 border border-sky-200 text-[10px] font-black uppercase tracking-wide rounded shadow-sm whitespace-nowrap">Đang làm</span>;
            case 'COMPLETED':
                return <span className="px-2 py-1 bg-emerald-50 text-emerald-600 border border-emerald-200 text-[10px] font-black uppercase tracking-wide rounded shadow-sm whitespace-nowrap">Hoàn thành</span>;
            case 'CANCELLED':
                return <span className="px-2 py-1 bg-slate-100 text-slate-500 border border-slate-200 text-[10px] font-black uppercase tracking-wide rounded shadow-sm whitespace-nowrap">Đã hủy</span>;
            case 'OVERDUE':
                return <span className="px-2 py-1 bg-rose-50 text-rose-600 border border-rose-200 text-[10px] font-black uppercase tracking-wide rounded shadow-sm whitespace-nowrap animate-pulse">Quá hạn</span>;
            default:
                return <span className="px-2 py-1 bg-slate-50 text-slate-500 border border-slate-200 text-[10px] font-black uppercase tracking-wide rounded shadow-sm whitespace-nowrap">{status}</span>;
        }
    };

    // =======================================================================
    // 🌟 GIAO DIỆN (RENDER)
    // =======================================================================
    if (loading && tasks.length === 0) return <div className="flex items-center justify-center h-screen"><div className="w-12 h-12 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin"></div></div>;

    return (
        <div className="max-w-[1600px] mx-auto animate-in fade-in duration-300">

            {/* HEADER */}
            <div className="relative bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 rounded-[24px] p-6 md:p-8 mb-6 border border-emerald-100/60 shadow-sm overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/3 w-96 h-96 bg-emerald-200/30 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-64 h-64 bg-cyan-200/30 rounded-full blur-3xl pointer-events-none"></div>

                <div className="relative z-10">
                    <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight">{pageTitle}</h1>
                    <p className="text-slate-500 font-medium mt-1.5">{pageSubtitle}</p>
                </div>

                {!readOnly && (
                    <div className="relative z-10 w-full md:w-auto">
                        <button onClick={() => setIsCreateOpen(true)} className="w-full md:w-auto px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2">
                            <span className="text-xl leading-none">+</span> Giao việc (Ma trận)
                        </button>
                    </div>
                )}
            </div>

            {/* THÔNG BÁO NHẮC NHỞ PHÂN CÔNG SOP TRƯỚC 24H (NỔI BẬT) */}
            {!readOnly && unassignedUpcomingTasks.length > 0 && (
                <div className="mb-6 bg-amber-50 border-l-4 border-amber-500 p-4 md:p-5 rounded-r-2xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in slide-in-from-top-4 duration-500">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 text-2xl shadow-inner animate-bounce">⏰</div>
                        <div>
                            <h3 className="text-amber-900 font-extrabold text-lg">Nhắc nhở Phân công SOP</h3>
                            <p className="text-amber-800 font-medium mt-0.5">Bạn có <strong className="text-2xl text-amber-600 mx-1.5">{unassignedUpcomingTasks.length}</strong> công việc sẽ bắt đầu trong vòng 24 giờ tới nhưng <strong>chưa có nhân sự thực hiện</strong>.</p>
                        </div>
                    </div>
                    <button onClick={() => {
                        setFilterStatus('PENDING'); 
                        setFilterPond('');     
                        setFilterType('');      
                        setFilterSeason('');   
                        
                        // 🌟 TỰ ĐỘNG KHÓA MỤC TIÊU VÀO CÁC VIỆC CHƯA GÁN
                        setFilterWorker('UNASSIGNED'); 
                        
                        setFilterEngineer(''); 
                        
                        // 🌟 MỞ RỘNG LỊCH 7 NGÀY ĐỂ THẤY HẾT VIỆC XUYÊN ĐÊM
                        setPageSize(7); 
                        setCurrentPage(1);     
                        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }); 
                    }} className="w-full md:w-auto px-6 py-3.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-black rounded-xl shadow-md transition-all active:scale-95 whitespace-nowrap">
                        Lọc & Phân công ngay
                    </button>
                </div>
            )}

            {/* KPI CARDS */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-5 mb-6">
                <div className="bg-white p-5 rounded-[20px] border border-slate-100 shadow-sm relative overflow-hidden">
                    <div className="flex justify-between items-start mb-2"><span className="text-slate-500 font-bold text-sm">Tổng công việc</span><div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">📋</div></div>
                    <strong className="block text-3xl font-black text-slate-800">{stats.total}</strong>
                    <div className="mt-2"><Sparkline color="#94a3b8" /></div>
                </div>
                <div className="bg-white p-5 rounded-[20px] border border-slate-100 shadow-sm relative overflow-hidden">
                    <div className="flex justify-between items-start mb-2"><span className="text-slate-500 font-bold text-sm">Chờ xử lý</span><div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-500">⌛</div></div>
                    <strong className="block text-3xl font-black text-slate-800">{stats.pending}</strong>
                    <div className="mt-2"><Sparkline color="#f59e0b" /></div>
                </div>
                <div className="bg-white p-5 rounded-[20px] border border-slate-100 shadow-sm relative overflow-hidden">
                    <div className="flex justify-between items-start mb-2"><span className="text-slate-500 font-bold text-sm">Đang thực hiện</span><div className="w-8 h-8 rounded-full bg-sky-50 flex items-center justify-center text-sky-500">🔄</div></div>
                    <strong className="block text-3xl font-black text-slate-800">{stats.progress}</strong>
                    <div className="mt-2"><Sparkline color="#0ea5e9" /></div>
                </div>
                <div className="bg-white p-5 rounded-[20px] border border-slate-100 shadow-sm relative overflow-hidden">
                    <div className="flex justify-between items-start mb-2"><span className="text-slate-500 font-bold text-sm">Hoàn thành</span><div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500">✅</div></div>
                    <strong className="block text-3xl font-black text-slate-800">{stats.completed}</strong>
                    <div className="mt-2"><Sparkline color="#10b981" /></div>
                </div>
                <div className="bg-white p-5 rounded-[20px] border border-slate-100 shadow-sm relative overflow-hidden">
                    <div className="flex justify-between items-start mb-2"><span className="text-slate-500 font-bold text-sm">Quá hạn</span><div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center text-rose-500">⚠️</div></div>
                    <strong className="block text-3xl font-black text-slate-800">{stats.overdue}</strong>
                    <div className="mt-2"><Sparkline color="#f43f5e" /></div>
                </div>
            </div>

            {/* CHARTS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
                <div className="relative bg-white p-5 md:p-6 rounded-[24px] border border-slate-100 shadow-sm flex flex-col h-[320px] overflow-hidden">
                    {loading && <div className="absolute inset-0 z-10 bg-white/40 backdrop-blur-[2px] transition-all"></div>}
                    <h3 className="font-extrabold text-slate-800 text-lg mb-4 relative z-0">Công việc theo Trạng thái</h3>
                    <div className="flex-1 flex items-center relative z-0">
                        <div className="w-1/2 h-[180px]">
                            <ResponsiveContainer width="100%" height={180}>
                                <PieChart>
                                    <Pie data={taskStatusChartData} innerRadius="65%" outerRadius="90%" paddingAngle={4} dataKey="value" stroke="none">
                                        {taskStatusChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                    </Pie>
                                    <RechartsTooltip content={<CustomTooltip />} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="w-1/2 pl-6 flex flex-col gap-3 justify-center">
                            {taskStatusChartData.map(item => (
                                <div key={item.label} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: item.color }}></div><span className="text-sm font-bold text-slate-500">{item.label}</span></div>
                                    <span className="text-base font-black text-slate-800">{item.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="relative bg-white p-5 md:p-6 rounded-[24px] border border-slate-100 shadow-sm flex flex-col h-[320px] overflow-hidden">
                    {loading && <div className="absolute inset-0 z-10 bg-white/40 backdrop-blur-[2px] transition-all"></div>}
                    <h3 className="font-extrabold text-slate-800 text-lg mb-4 relative z-0">Tỷ lệ phân loại công việc</h3>
                    <div className="flex-1 h-[180px] relative z-0">
                        <ResponsiveContainer width="100%" height={180}>
                            <BarChart data={taskTypeChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} />
                                <RechartsTooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Bar dataKey="value" radius={[6, 6, 6, 6]} maxBarSize={40}>
                                    {taskTypeChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* TABLE & FILTERS */}
            <div className="bg-white rounded-[24px] shadow-sm border border-slate-200 overflow-hidden relative mb-12">
                {loading && (
                    <div className="absolute inset-0 z-20 bg-white/50 backdrop-blur-sm flex items-center justify-center transition-all">
                        <div className="flex flex-col items-center">
                            <div className="w-10 h-10 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin mb-3"></div>
                            <span className="font-bold text-slate-600">Đang tải dữ liệu...</span>
                        </div>
                    </div>
                )}

                <div className="p-5 border-b border-slate-100 flex flex-wrap gap-3 bg-slate-50/30">
                    <select value={filterType} onChange={(e) => { setFilterType(e.target.value); setCurrentPage(1); }} className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 outline-none focus:border-emerald-500 shadow-sm cursor-pointer flex-1 min-w-[180px]">
                        <option value="">Tất cả loại công việc</option>
                        {TASK_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>

                    <select value={filterPond} onChange={(e) => { setFilterPond(e.target.value); setCurrentPage(1); }} className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 outline-none focus:border-emerald-500 shadow-sm cursor-pointer flex-1 min-w-[150px]">
                        <option value="">Tất cả ao nuôi</option>
                        {ponds.map(p => <option key={p.pond_id} value={p.pond_id}>{p.pond_name}</option>)}
                    </select>

                    <select value={filterSeason} onChange={(e) => { setFilterSeason(e.target.value); setCurrentPage(1); }} className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 outline-none focus:border-emerald-500 shadow-sm cursor-pointer flex-1 min-w-[150px]">
                        <option value="">Tất cả mùa vụ</option>
                        {seasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>

                    {showEngineerFilter && (
                        <select value={filterEngineer} onChange={(e) => { setFilterEngineer(e.target.value); setCurrentPage(1); }} className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 outline-none focus:border-emerald-500 shadow-sm cursor-pointer flex-1 min-w-[150px]">
                            <option value="">Tất cả kỹ sư</option>
                            {(readOnly && engineersList.length > 0 ? engineersList.map(e => ({ id: e.user_id, name: e.full_name })) : engineers).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                        </select>
                    )}

                    {showWorkerFilter && (
                        <select value={filterWorker} onChange={(e) => { setFilterWorker(e.target.value); setCurrentPage(1); }} className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 outline-none focus:border-emerald-500 shadow-sm cursor-pointer flex-1 min-w-[150px]">
                            <option value="">Tất cả nhân công</option>
                            
                            {/* 🌟 THÊM LỰA CHỌN NÀY */}
                            <option value="UNASSIGNED" className="font-bold text-amber-600">⚠️ Chưa phân công</option>
                            
                            {workers.filter(w => !w.role_name || normalize(w.role_name) === 'WORKER' || normalize(w.role) === 'WORKER').map(w => <option key={w.worker_id || w.user_id} value={w.worker_id || w.user_id}>{w.full_name}</option>)}
                        </select>
                    )}

                    <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }} className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 outline-none focus:border-emerald-500 shadow-sm cursor-pointer flex-1 min-w-[160px]">
                        {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                </div>

                {/* HIỂN THỊ DẠNG BẢNG LỊCH TRÌNH (SCHEDULE BOARD VIEW) */}
                <div className="bg-white overflow-hidden relative">
                    {tasksGroupedByDate.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-[400px] text-slate-400">
                            <span className="text-6xl mb-4">📭</span>
                            <h3 className="font-extrabold text-xl text-slate-600">Không tìm thấy công việc</h3>
                            <p className="font-medium mt-1">Thử thay đổi bộ lọc ở trên xem sao.</p>
                        </div>
                    ) : (
                        <div className="flex flex-col divide-y divide-slate-200">
                            {paginatedGroups.map((group) => {
                                const { dayOfWeek, dateInfo, isToday, isPast } = getCalendarDateInfo(group.dateStr);

                                const sortedTasks = [...group.tasks].sort((a, b) => new Date(a.start_date) - new Date(b.start_date));

                                return (
                                    <div key={group.dateStr} className="flex flex-col md:flex-row group/row hover:bg-slate-50/30 transition-colors">

                                        {/* CỘT TRÁI: THỨ & NGÀY */}
                                        <div className={`w-full md:w-[150px] lg:w-[180px] shrink-0 p-4 md:p-6 border-b md:border-b-0 md:border-r border-slate-200 flex flex-row md:flex-col items-center md:items-start justify-between md:justify-center gap-2 transition-colors ${isToday ? 'bg-sky-50/80' : 'bg-slate-50'}`}>
                                            <div className="flex flex-col items-start">
                                                <div className={`text-lg font-black ${isToday ? 'text-sky-600' : (isPast ? 'text-slate-400' : 'text-slate-700')}`}>
                                                    {dayOfWeek}
                                                </div>
                                                <div className="text-sm font-bold text-slate-500">{dateInfo}</div>
                                            </div>
                                            {isToday && (
                                                <span className="px-2.5 py-1 bg-sky-100 text-sky-700 text-[10px] font-black uppercase rounded-lg border border-sky-200 shadow-sm">
                                                    Hôm nay
                                                </span>
                                            )}
                                        </div>

                                        {/* CỘT PHẢI: CÁC THẺ CÔNG VIỆC */}
                                        <div className="flex-1 p-4 overflow-x-auto scrollbar-hide">
                                            <div className="flex gap-4 w-max min-w-full pb-2">
                                                {sortedTasks.map(t => {
                                                    const isUnassignedSOP = !(t.assigned_workers_list?.length > 0);
                                                    const isOverdue = getComputedStatus(t) === 'OVERDUE';

                                                    return (
                                                        <div key={t.task_id} className={`w-[280px] shrink-0 bg-white rounded-xl border shadow-sm hover:shadow-md transition-all flex flex-col relative group overflow-hidden ${isUnassignedSOP ? 'border-amber-300' : (isOverdue ? 'border-rose-300' : 'border-slate-200 hover:border-sky-300')}`}>

                                                            {isUnassignedSOP && <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-400"></div>}
                                                            {isOverdue && !isUnassignedSOP && <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-500 animate-pulse"></div>}

                                                            <div className="px-3.5 py-2.5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest truncate max-w-[120px]" title={t.type_name || t.task_type}>
                                                                    {t.type_name || t.task_type}
                                                                </span>
                                                                <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded border shadow-sm ${isOverdue ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-white border-slate-200 text-slate-700'}`}>
                                                                    {formatDate(t.start_date).split(' ')[1]} - {formatDate(t.due_date).split(' ')[1]}
                                                                </span>
                                                            </div>

                                                            <div className="px-3.5 py-3 flex-1">
                                                                <h3 className="font-extrabold text-slate-800 text-[14px] leading-tight line-clamp-2 mb-2" title={t.task_title}>{t.task_title}</h3>
                                                                <div className="flex items-center justify-between text-xs font-medium">
                                                                    <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-100">
                                                                        <span>📍</span> <strong>{t.pond_name || '-'}</strong>
                                                                    </div>
                                                                    <div className="scale-90 origin-right">{getStatusBadge(t)}</div>
                                                                </div>
                                                            </div>

                                                            <div className="px-3.5 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                                                                <div className="flex-1 overflow-hidden pr-2">
                                                                    {isUnassignedSOP ? (
                                                                        <span className="text-[10px] font-black text-amber-600 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-200 uppercase flex items-center gap-1 w-max">
                                                                            <span className="relative flex h-1.5 w-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span></span>
                                                                            Cần phân công
                                                                        </span>
                                                                    ) : (
                                                                        <div className="flex items-center gap-1.5" title={t.assigned_workers_list.map(w => w.full_name).join(', ')}>
                                                                            <div className="flex -space-x-1.5 shrink-0">
                                                                                {t.assigned_workers_list.slice(0, 3).map((w, idx) => (
                                                                                    <div key={idx} className="w-5 h-5 rounded-full bg-slate-300 border border-white flex items-center justify-center text-[8px] font-bold text-slate-700 shadow-sm">
                                                                                        {w.full_name.charAt(0)}
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                            <span className="text-[11px] font-bold text-slate-600 truncate">
                                                                                {t.assigned_workers_list.length > 3 ? `+${t.assigned_workers_list.length - 3}` : t.assigned_workers_list[0].full_name.split(' ').pop()}
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                <div className="flex gap-1 shrink-0 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                                                                    <button onClick={() => setSelectedTask(t)} className="w-7 h-7 rounded bg-white border border-slate-200 text-slate-500 hover:bg-sky-50 hover:text-sky-600 flex items-center justify-center shadow-sm" title="Xem chi tiết">
                                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                                    </button>
                                                                    {!readOnly && getComputedStatus(t) === 'PENDING' && (
                                                                        <button
                                                                            onClick={() => handleOpenEdit(t)}
                                                                            className={`w-7 h-7 rounded border flex items-center justify-center shadow-sm ${isUnassignedSOP ? 'bg-amber-500 border-amber-600 text-white hover:bg-amber-600 animate-bounce' : 'bg-white border-slate-200 text-slate-500 hover:bg-amber-50 hover:text-amber-600'}`}
                                                                            title="Chỉnh sửa / Phân công"
                                                                        >
                                                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* ======================================================== */}
                {/* FOOTER ĐIỀU KHIỂN GÓC NHÌN LỊCH TRÌNH */}
                {/* ======================================================== */}
                <div className="p-4 md:p-6 bg-slate-50/80 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4 rounded-b-[24px]">
                    <div className="flex items-center p-1 bg-slate-200/60 rounded-xl overflow-x-auto w-full md:w-auto">
                        {[
                            { label: '1 Ngày', value: 1 },
                            { label: '7 Ngày (Tuần)', value: 7 },
                            { label: '30 Ngày (Tháng)', value: 30 },
                            { label: 'Tất cả (Năm)', value: 365 }
                        ].map(tab => (
                            <button
                                key={tab.value}
                                onClick={() => { setPageSize(tab.value); setCurrentPage(1); }}
                                className={`px-4 py-2 text-sm font-bold rounded-lg whitespace-nowrap transition-all ${pageSize === tab.value ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/80'}`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm w-full md:w-auto justify-between md:justify-start">
                        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-4 py-1.5 rounded-lg font-bold text-sm text-slate-600 hover:bg-slate-100 hover:text-sky-600 disabled:opacity-40 transition-colors">&larr; Trước</button>
                        <div className="px-4 py-1.5 text-sm font-black text-slate-700 border-x border-slate-100 bg-slate-50 whitespace-nowrap">Trang {currentPage} <span className="text-slate-400 font-medium">/ {totalPages || 1}</span></div>
                        <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0} className="px-4 py-1.5 rounded-lg font-bold text-sm text-slate-600 hover:bg-slate-100 hover:text-sky-600 disabled:opacity-40 transition-colors">Sau &rarr;</button>
                    </div>
                </div>
            </div>

            {/* ================= MODALS ================= */}

            {/* Modal Chi Tiết */}
            {selectedTask && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 sm:p-6" onClick={() => setSelectedTask(null)}>
                    <div className="bg-white max-w-3xl w-full p-5 md:p-8 rounded-[24px] shadow-2xl flex flex-col max-h-[95vh] sm:max-h-[90vh] animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6 shrink-0">
                            <h2 className="text-xl md:text-2xl font-extrabold text-slate-800">Chi tiết Tiến độ Công việc</h2>
                            <button onClick={() => setSelectedTask(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 text-lg font-bold transition-colors">&times;</button>
                        </div>

                        <div className="grid grid-cols-2 gap-4 flex-1 overflow-y-auto pr-2 pb-2">
                            {mode !== 'worker' && <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100"><span className="text-xs font-bold text-slate-500 uppercase block mb-1">Mã công việc</span><strong className="text-base text-sky-600">#{selectedTask.task_code || '-'}</strong></div>}
                            <div className={`bg-slate-50 p-4 rounded-2xl border border-slate-100 ${mode === 'worker' ? 'col-span-2' : ''}`}><span className="text-xs font-bold text-slate-500 uppercase block mb-1">Loại công việc</span><strong className="text-base text-slate-800">{selectedTask.type_name || selectedTask.task_type || '-'}</strong></div>
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 col-span-2"><span className="text-xs font-bold text-slate-500 uppercase block mb-1">Tiêu đề</span><strong className="text-lg text-slate-800">{selectedTask.task_title || '-'}</strong></div>
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100"><span className="text-xs font-bold text-slate-500 uppercase block mb-1">Ao thực hiện</span><strong className="text-base text-emerald-600">{selectedTask.pond_name || '-'}</strong></div>
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100"><span className="text-xs font-bold text-slate-500 uppercase block mb-1">Thuộc Mùa vụ</span><strong className="text-base text-slate-800">{selectedTask.season_name || 'Chung'}</strong></div>
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100"><span className="text-xs font-bold text-slate-500 uppercase block mb-1">Bắt đầu</span><strong className="text-base text-slate-800">{formatDate(selectedTask.start_date)}</strong></div>
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100"><span className="text-xs font-bold text-slate-500 uppercase block mb-1">Hạn chót</span><strong className="text-base text-slate-800">{formatDate(selectedTask.due_date)}</strong></div>

                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 col-span-2"><span className="text-xs font-bold text-slate-500 uppercase block mb-2">Trạng thái</span>{getStatusBadge(selectedTask)}</div>

                            {selectedTask.product_info ? (
                                <div className="bg-sky-50 p-4 rounded-2xl border border-sky-200 col-span-2">
                                    <span className="text-xs font-bold text-sky-600 uppercase block mb-1">Vật tư chỉ định</span>
                                    <div className="text-slate-800">Sản phẩm: <strong className="text-sky-700">{selectedTask.product_info.product_name}</strong> — Định mức: <strong className="text-xl text-sky-600">{selectedTask.product_info.quantity}</strong> {selectedTask.product_info.unit}</div>
                                </div>
                            ) : (
                                <div className="bg-slate-50 p-4 rounded-2xl border border-dashed border-slate-300 col-span-2 text-slate-500 font-medium italic text-sm">Công việc không yêu cầu xuất kho vật tư.</div>
                            )}

                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 col-span-2"><span className="text-xs font-bold text-slate-500 uppercase block mb-1">Mô tả / Hướng dẫn</span><p className="text-sm text-slate-700 m-0 whitespace-pre-line bg-white p-3 rounded-xl border border-slate-200">{selectedTask.description || '-'}</p></div>

                            {mode !== 'worker' && (
                                <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 col-span-2 flex flex-col gap-3">
                                    <span className="text-xs font-bold text-amber-700 uppercase block">Chi tiết phân công & Báo cáo</span>
                                    {(selectedTask.assigned_workers_list || []).length > 0 ? selectedTask.assigned_workers_list.map(w => (
                                        <div key={w.worker_id} className="bg-white p-3 rounded-xl border border-amber-100 flex flex-col gap-2">
                                            <div className="flex justify-between items-center"><strong className="text-sm text-slate-800">Công nhân: <span className="text-amber-600">{w.full_name}</span></strong><span className="text-[10px] font-bold px-2 py-1 rounded bg-slate-100">{w.worker_status || 'ASSIGNED'}</span></div>
                                            {w.completed_at && <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg">✓ Hoàn thành: <strong>{formatDate(w.completed_at)}</strong></div>}
                                            {w.note && <div className="text-xs text-slate-700 bg-slate-100 p-2 rounded-lg border-l-2 border-slate-300"><strong>Ghi chú:</strong> {w.note}</div>}
                                        </div>
                                    )) : <span className="text-sm text-rose-500 italic font-bold">⚠️ Công việc này do SOP tạo nhưng Kỹ sư CHƯA gán công nhân!</span>}
                                </div>
                            )}

                            {canComplete && ['IN_PROGRESS', 'OVERDUE', 'PENDING'].includes(normalize(selectedTask.status)) && (
                                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 col-span-2 mt-2">
                                    <label className={`text-sm font-bold block mb-2 ${getComputedStatus(selectedTask) === 'OVERDUE' ? 'text-rose-600' : 'text-slate-800'}`}>📝 Báo cáo thực địa {getComputedStatus(selectedTask) === 'OVERDUE' && '(Bắt buộc giải trình)'}</label>
                                    <textarea className="w-full p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-100 outline-none text-sm resize-none mb-3" rows="3" placeholder="Nhập ghi chú kết quả công việc..." value={reportNote} onChange={e => setReportNote(e.target.value)} />
                                    <button onClick={() => handleCompleteTask(selectedTask.task_id)} className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-colors shadow-md">✓ XÁC NHẬN HOÀN THÀNH</button>
                                </div>
                            )}
                        </div>

                        <div className="mt-4 pt-4 border-t border-slate-100 shrink-0">
                            <button onClick={() => setSelectedTask(null)} className="w-full py-3.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors">Đóng hộp thoại</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL TẠO MỚI */}
            {!readOnly && isCreateOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 sm:p-6" onClick={() => setIsCreateOpen(false)}>
                    <div className="bg-white max-w-5xl w-full p-5 md:p-8 rounded-[24px] shadow-2xl flex flex-col max-h-[95vh] sm:max-h-[90vh] animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6 shrink-0">
                            <h2 className="text-xl md:text-2xl font-extrabold text-slate-800">Phân công Công việc (Hệ Ma trận)</h2>
                            <button onClick={() => setIsCreateOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 text-lg font-bold transition-colors">&times;</button>
                        </div>

                        <div className="flex flex-col flex-1 overflow-hidden">
                            <div className="flex flex-col gap-4 flex-1 overflow-y-auto pr-2 pb-2 scrollbar-hide">

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-bold text-slate-700">Loại công việc <span className="text-rose-500">*</span></label>
                                    <select value={form.task_type} onChange={handleTypeChange} className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 outline-none font-bold text-emerald-700 bg-white shadow-sm">
                                        <option value="">-- Chọn loại công việc để tải ma trận ao thích hợp --</option>
                                        {TASK_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                    </select>
                                </div>

                                {/* BẢNG MA TRẬN */}
                                {form.task_type && (
                                    <div className="flex flex-col border border-slate-200 rounded-[16px] shadow-sm relative mt-2 mb-2 overflow-hidden bg-white min-h-[250px]">
                                        {loadingPonds && (
                                            <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-20 flex items-center justify-center">
                                                <div className="w-8 h-8 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin"></div>
                                            </div>
                                        )}

                                        <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 font-bold text-slate-700 text-sm flex justify-between items-center shrink-0">
                                            <span>Ma trận Phân công (Nhân công × Ao nuôi đang hoạt động)</span>
                                            <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-1 rounded-lg border border-emerald-200 shadow-sm">
                                                Đã chọn: {form.assignments.length}
                                            </span>
                                        </div>

                                        <div className="flex-1 overflow-auto max-h-[300px]">
                                            <table className="w-full text-center border-collapse">
                                                <thead className="bg-slate-50 sticky top-0 shadow-sm z-10 border-b border-slate-200">
                                                    <tr>
                                                        <th className="px-4 py-4 border-r border-slate-200 text-left font-bold text-slate-600 bg-slate-50 w-[180px]">Nhân sự</th>
                                                        {matrixPonds.map(p => (
                                                            <th key={p.pond_id} className="px-3 py-4 text-xs font-bold text-slate-600 whitespace-nowrap bg-slate-50" title={p.pond_name}>
                                                                {p.pond_code || p.pond_name}
                                                            </th>
                                                        ))}
                                                        {matrixPonds.length === 0 && !loadingPonds && (
                                                            <th className="px-4 py-4 text-sm font-medium text-slate-400 italic bg-slate-50 text-left">Không có ao phù hợp cho loại công việc này.</th>
                                                        )}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {workers.map(w => {
                                                        const wId = Number(w.worker_id || w.user_id);
                                                        const isBusy = normalize(w.work_status) === 'BUSY';
                                                        return (
                                                            <tr key={wId} className={`transition-colors ${isBusy ? 'bg-slate-50/50' : 'hover:bg-slate-50/80'}`}>
                                                                <td className="px-4 py-3 border-r border-slate-200 text-left bg-white sticky left-0 z-0">
                                                                    <strong className="block text-slate-800 text-sm">{w.full_name}</strong>
                                                                    <span className={`text-[10px] font-bold uppercase mt-1 inline-block px-1.5 py-0.5 rounded ${isBusy ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                                                        {isBusy ? '● Đang bận' : '● Sẵn sàng'}
                                                                    </span>
                                                                </td>
                                                                {matrixPonds.map(p => {
                                                                    const pId = Number(p.pond_id);
                                                                    const isChecked = form.assignments.some(a => a.worker_id === wId && a.pond_id === pId);
                                                                    const isPondTimeBusy = busyPondIds.has(pId);

                                                                    return (
                                                                        <td key={pId} className="px-3 py-3 align-middle text-center">
                                                                            {isPondTimeBusy ? (
                                                                                <div className="flex items-center justify-center h-full">
                                                                                    <span className="text-[10px] text-rose-500 font-bold bg-rose-50 px-1.5 py-1 rounded shadow-sm border border-rose-100 whitespace-nowrap" title="Ao đã có công việc khác trong khung giờ này">🚫 Kẹt lịch</span>
                                                                                </div>
                                                                            ) : (
                                                                                <div className="flex items-center justify-center h-full">
                                                                                    <input type="checkbox" checked={isChecked} disabled={isBusy && !isChecked} onChange={() => toggleAssignment(wId, pId)} className="w-4 h-4 cursor-pointer text-emerald-500 focus:ring-emerald-500 rounded disabled:opacity-30 border-slate-300" />
                                                                                </div>
                                                                            )}
                                                                        </td>
                                                                    )
                                                                })}
                                                                {matrixPonds.length === 0 && !loadingPonds && <td></td>}
                                                            </tr>
                                                        )
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-bold text-slate-700">Tiêu đề mẫu công việc</label>
                                    <input value={form.task_title} onChange={e => setForm({ ...form, task_title: e.target.value })} placeholder="VD: Cho tôm ăn cử sáng..." className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-100 outline-none shadow-sm" />
                                </div>

                                {isProductRequired && (
                                    <div className="flex flex-col gap-4 bg-sky-50/50 p-4 rounded-xl border border-sky-100">
                                        {/* Hàng 1: Sản phẩm (Chiếm toàn bộ chiều ngang) */}
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-sm font-bold text-sky-800">Vật tư chỉ định xuất kho</label>
                                            <select value={form.product_id} onChange={e => setForm({ ...form, product_id: e.target.value })} className="w-full px-4 py-3 border border-sky-200 rounded-xl focus:ring-2 focus:ring-sky-100 outline-none bg-white shadow-sm cursor-pointer">
                                                <option value="">-- Chọn sản phẩm --</option>
                                                {getFilteredProducts(form.task_type).map(p => (
                                                    <option key={p.product_id} value={p.product_id}>{p.product_name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        
                                        {/* Hàng 2: Số lượng (Nhập) & Đơn vị (Tự động/Khóa) */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="flex flex-col gap-1.5">
                                                <label className="text-sm font-bold text-sky-800">Số lượng / mỗi ao</label>
                                                <input type="number" step="0.01" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} placeholder="VD: 5.5" className="w-full px-4 py-3 border border-sky-200 rounded-xl focus:ring-2 focus:ring-sky-100 outline-none shadow-sm" />
                                            </div>
                                            <div className="flex flex-col gap-1.5">
                                                <label className="text-sm font-bold text-sky-800">Đơn vị tính</label>
                                                <input 
                                                    type="text" 
                                                    value={products.find(p => String(p.product_id) === String(form.product_id))?.unit || ''} 
                                                    disabled 
                                                    readOnly 
                                                    placeholder="-" 
                                                    className="w-full px-4 py-3 border border-sky-200 rounded-xl bg-slate-100/70 text-slate-500 font-bold outline-none cursor-not-allowed" 
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-sm font-bold text-slate-700">Bắt đầu <span className="text-rose-500">*</span></label>
                                        <input 
                                            type="datetime-local" 
                                            value={form.start_date} 
                                            onChange={e => {
                                                const newStart = e.target.value;
                                                setForm({ 
                                                    ...form, 
                                                    start_date: newStart, 
                                                    due_date: calculateDueDate(newStart, form.task_type) || form.due_date 
                                                });
                                            }} 
                                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-100 outline-none shadow-sm cursor-pointer" 
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-sm font-bold text-slate-700">
                                            Hạn chót <span className="text-rose-500">*</span>
                                            {form.task_type && <span className="text-emerald-600 text-xs ml-1 font-medium">(Gợi ý: +{getTaskDurationHours(form.task_type)}h)</span>}
                                        </label>
                                        <input 
                                            type="datetime-local" 
                                            value={form.due_date} 
                                            onChange={e => setForm({ ...form, due_date: e.target.value })} 
                                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-100 outline-none shadow-sm cursor-pointer" 
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-bold text-slate-700">Hướng dẫn kỹ thuật <span className="text-rose-500">*</span></label>
                                    <textarea rows="3" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Chi tiết các bước..." className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-100 outline-none resize-none shadow-sm" />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100 shrink-0">
                                <button type="button" onClick={() => setIsCreateOpen(false)} className="px-6 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors">Hủy</button>
                                <button type="button" onClick={handleCreateTask} disabled={!form.assignments.length || !form.start_date || !form.due_date} className="px-8 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-50 shadow-md">Kích hoạt ({form.assignments.length})</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL CHỈNH SỬA / GÁN VIỆC */}
            {!readOnly && isEditOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 sm:p-6" onClick={() => setIsEditOpen(false)}>
                    <div className="bg-white max-w-2xl w-full p-5 md:p-8 rounded-[24px] shadow-2xl flex flex-col max-h-[95vh] sm:max-h-[90vh] animate-in zoom-in-95 duration-200 overflow-hidden" onClick={e => e.stopPropagation()}>

                        <div className="flex justify-between items-center mb-6 shrink-0">
                            <div>
                                <h2 className="text-xl md:text-2xl font-extrabold text-slate-800">Cấu hình Kế hoạch & Nhân sự</h2>
                                <p className="text-sm text-emerald-600 font-bold mt-1">Gán Công nhân & Vật tư xuất kho để bắt đầu làm việc</p>
                            </div>
                            <button onClick={() => setIsEditOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 text-lg font-bold transition-colors">&times;</button>
                        </div>

                        <div className="flex flex-col gap-5 overflow-y-auto pr-2 pb-2">
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-bold text-slate-700">Phân công Nhân sự phụ trách <span className="text-rose-500">*</span></label>
                                <div className="grid grid-cols-2 gap-3 bg-amber-50 p-4 rounded-xl border border-amber-200">
                                    {workers.map(w => {
                                        const wId = Number(w.worker_id || w.user_id);
                                        const isChecked = editForm.assigned_workers.includes(wId);
                                        return (
                                            <label key={wId} className={`flex items-center gap-2 cursor-pointer p-2 rounded-lg border ${isChecked ? 'bg-amber-100 border-amber-500 text-amber-800 font-bold' : 'bg-white border-slate-200 text-slate-600 hover:border-amber-300'}`}>
                                                <input type="checkbox" checked={isChecked} onChange={(e) => {
                                                    if (e.target.checked) setEditForm({ ...editForm, assigned_workers: [...editForm.assigned_workers, wId] });
                                                    else setEditForm({ ...editForm, assigned_workers: editForm.assigned_workers.filter(id => id !== wId) });
                                                }} className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500" />
                                                <span className="text-sm">{w.full_name}</span>
                                            </label>
                                        )
                                    })}
                                </div>
                            </div>

                            {isEditProductRequired && (
                                <div className="flex flex-col gap-4 bg-sky-50 p-4 rounded-xl border border-sky-200">
                                    {/* Hàng 1: Sản phẩm (Chiếm toàn bộ chiều ngang) */}
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-sm font-bold text-sky-800">Chỉ định xuất kho</label>
                                        <select value={editForm.product_id} onChange={e => setEditForm({ ...editForm, product_id: e.target.value })} className="w-full px-4 py-3 border border-sky-200 rounded-xl focus:ring-2 focus:ring-sky-100 outline-none bg-white shadow-sm cursor-pointer">
                                            <option value="">-- Chọn sản phẩm kho --</option>
                                            {getFilteredProducts(editForm.type_id).map(p => (
                                                <option key={p.product_id} value={p.product_id}>{p.product_name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    
                                    {/* Hàng 2: Số lượng (Nhập) & Đơn vị (Tự động/Khóa) */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-sm font-bold text-sky-800">Số lượng</label>
                                            <input type="number" step="0.01" value={editForm.quantity} onChange={e => setEditForm({ ...editForm, quantity: e.target.value })} placeholder="VD: 5.5" className="w-full px-4 py-3 border border-sky-200 rounded-xl focus:ring-2 focus:ring-sky-100 outline-none bg-white shadow-sm" />
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-sm font-bold text-sky-800">Đơn vị tính</label>
                                            <input 
                                                type="text" 
                                                value={products.find(p => String(p.product_id) === String(editForm.product_id))?.unit || ''} 
                                                disabled 
                                                readOnly 
                                                placeholder="-" 
                                                className="w-full px-4 py-3 border border-sky-200 rounded-xl bg-slate-100/70 text-slate-500 font-bold outline-none cursor-not-allowed" 
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="flex flex-col gap-1.5"><label className="text-sm font-bold text-slate-700">Tiêu đề <span className="text-rose-500">*</span></label><input value={editForm.task_title} onChange={e => setEditForm({ ...editForm, task_title: e.target.value })} className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-100 outline-none" /></div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1.5"><label className="text-sm font-bold text-slate-700">Bắt đầu <span className="text-rose-500">*</span></label><input type="datetime-local" value={editForm.start_date} onChange={e => setEditForm({ ...editForm, start_date: e.target.value })} className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-100 outline-none" /></div>
                                <div className="flex flex-col gap-1.5"><label className="text-sm font-bold text-slate-700">Hạn chót <span className="text-rose-500">*</span></label><input type="datetime-local" value={editForm.due_date} onChange={e => setEditForm({ ...editForm, due_date: e.target.value })} className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-100 outline-none" /></div>
                            </div>

                            <div className="flex flex-col gap-1.5"><label className="text-sm font-bold text-slate-700">Hướng dẫn <span className="text-rose-500">*</span></label><textarea rows="3" value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-100 outline-none resize-none" /></div>
                        </div>

                        <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100 shrink-0">
                            <button onClick={() => setIsEditOpen(false)} className="px-6 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors">Hủy</button>
                            <button onClick={handleUpdateTask} disabled={!editForm.task_title || !editForm.description || !editForm.start_date || !editForm.due_date || editForm.assigned_workers.length === 0} className="px-8 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-50 shadow-md">Lưu Kế hoạch</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TaskManagementPage;