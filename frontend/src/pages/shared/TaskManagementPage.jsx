import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { showToast } from '../../utils/toast';
import { taskService, productService, pondService, userService } from '../../services/api';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

const STATUS_OPTIONS = [
    { value: 'ALL', label: 'Tất cả trạng thái công việc' },
    { value: 'PENDING', label: 'Chờ xử lý' },
    { value: 'IN_PROGRESS', label: 'Đang thực hiện' },
    { value: 'COMPLETED', label: 'Hoàn thành' },
    { value: 'CANCELLED', label: 'Đã hủy' },
    { value: 'OVERDUE', label: 'Quá hạn' },
];

const TASK_TYPE_OPTIONS = [
    { value: '1', label: 'Xử lý ao (POND_PROCESS)' },
    { value: '2', label: 'Cho ăn (FEEDING)' },
    { value: '3', label: 'Cho thuốc (TREATMENT)' },
    { value: '4', label: 'Kiểm tra môi trường (ENVIRONMENTAL_CHECK)' },
    { value: '5', label: 'Thu hoạch (HARVEST)' },
    { value: '6', label: 'Công việc khác (OTHER)' },
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
    const offset = date.getTimezoneOffset() * 60000;
    return (new Date(date - offset)).toISOString().slice(0, 16);
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
    pageSubtitle = 'Giám sát và phân phối tiến độ việc làm'
}) => {
    const [tasks, setTasks] = useState([]);
    const [ponds, setPonds] = useState([]);
    const [products, setProducts] = useState([]);
    const [workers, setWorkers] = useState([]);
    const [matrixPonds, setMatrixPonds] = useState([]);
    const [engineersList, setEngineersList] = useState([]);

    const [loading, setLoading] = useState(true);
    const [loadingPonds, setLoadingPonds] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
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
    const [editForm, setEditForm] = useState({ task_id: '', task_title: '', description: '', start_date: '', due_date: '' });

    const getComputedStatus = useCallback((task) => {
        const baseStatus = normalize(task.status);
        if (['COMPLETED', 'CANCELLED'].includes(baseStatus)) return baseStatus;
        if (task.due_date && new Date(task.due_date) < new Date()) return 'OVERDUE';
        return baseStatus;
    }, []);

    const fetchTasks = useCallback(async () => {
        try {
            setLoading(true);
            const res = await taskService.getAllTasks();
            setTasks(res?.data?.data || []);
        } catch {
            showToast({ title: 'Không tải được danh sách công việc', type: 'error' });
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
        
        // Reset form khi chọn type mới
        setForm(prev => ({ ...prev, task_type: typeCode, assignments: [], product_id: '', quantity: '' }));
        setMatrixPonds([]);
        
        if (!typeCode) return;

        setLoadingPonds(true);
        try {
            const res = await taskService.getPondsByType(parseInt(typeCode, 10));
            setMatrixPonds(res?.data?.data || []);
        } catch (err) {
            showToast({ title: 'Lỗi tải danh sách ao cho ma trận', type: 'error' });
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

    const filteredTasks = useMemo(() => {
        return tasks.filter(task => {
            const matchType = !filterType || String(task.type_id) === String(filterType);
            const matchPond = !filterPond || String(task.pond_id) === String(filterPond);
            const matchSeason = !filterSeason || String(task.season_id) === String(filterSeason);
            const matchEngineer = !filterEngineer || String(task.assigned_by) === String(filterEngineer);
            const matchWorker = !filterWorker || (task.assigned_workers_list && task.assigned_workers_list.some(w => String(w.worker_id) === String(filterWorker)));
            const matchStatus = filterStatus === 'ALL' || String(getComputedStatus(task)) === String(filterStatus);
            return matchType && matchPond && matchSeason && matchEngineer && matchWorker && matchStatus;
        }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }, [tasks, filterType, filterPond, filterSeason, filterEngineer, filterWorker, filterStatus, getComputedStatus]);

    const totalPages = Math.max(1, Math.ceil(filteredTasks.length / pageSize));
    const safePage = Math.min(Math.max(currentPage, 1), totalPages);
    const startIndex = (safePage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, filteredTasks.length);
    const paginatedTasks = filteredTasks.slice(startIndex, endIndex);

    const isProductRequired = useMemo(() => ['1', '2', '3', 1, 2, 3].includes(parseInt(form.task_type, 10)), [form.task_type]);

    const handleCreateTask = async () => {
        if (readOnly) return;
        if (!form.assignments.length) return showToast({ title: 'Chọn ít nhất một phân công trong ma trận', type: 'warning' });
        if (!form.description?.trim()) return showToast({ title: 'Nhập hướng dẫn kỹ thuật', type: 'warning' });

        const now = new Date(), start = new Date(form.start_date), due = new Date(form.due_date);
        if (start.getTime() < now.getTime() - 120000) return showToast({ title: 'Thời gian bắt đầu không hợp lệ', type: 'error' });
        if (due.getTime() <= start.getTime()) return showToast({ title: 'Hạn chót phải lớn hơn bắt đầu', type: 'error' });
        if ((due.getTime() - start.getTime()) / 60000 < 30) return showToast({ title: 'Tối thiểu 30 phút', type: 'error' });

        if (!window.confirm(`Xác nhận kích hoạt ${form.assignments.length} công việc này?`)) return;

        setLoading(true);
        try {
            let finalTitle = form.task_title?.trim();
            if (!finalTitle) {
                const opt = TASK_TYPE_OPTIONS.find(o => o.value === form.task_type);
                finalTitle = opt ? `Công tác ${opt.label.split(' (')[0]}` : 'Công việc kỹ thuật';
            }
            const numericTypeId = parseInt(form.task_type, 10);

            for (const assignment of form.assignments) {
                const selectedPondObj = matrixPonds.find(p => Number(p.pond_id) === Number(assignment.pond_id));
                const singleTaskData = {
                    type_id: numericTypeId, pond_id: Number(assignment.pond_id), task_title: finalTitle,
                    description: form.description.trim(), start_date: form.start_date, due_date: form.due_date,
                    assigned_workers: [Number(assignment.worker_id)]
                };
                if (selectedPondObj?.season_id) singleTaskData.season_id = Number(selectedPondObj.season_id);
                if (isProductRequired && form.product_id) {
                    singleTaskData.product_id = Number(form.product_id);
                    singleTaskData.quantity = parseFloat(form.quantity) || 0;
                }
                await taskService.createTask(singleTaskData);
            }
            showToast({ title: `Đã kích hoạt thành công ${form.assignments.length} nhiệm vụ!`, type: 'success' });
            setForm(initialForm); setIsCreateOpen(false); await fetchTasks();
        } catch (err) { showToast({ title: 'Lỗi khi tạo công việc', type: 'error' }); } finally { setLoading(false); }
    };

    const handleUpdateTask = async () => {
        const now = new Date(), start = new Date(editForm.start_date), due = new Date(editForm.due_date);
        if (start.getTime() < now.getTime() - 120000) return showToast({ title: 'Bắt đầu không được ở quá khứ', type: 'error' });
        if (due.getTime() <= start.getTime()) return showToast({ title: 'Hạn chót phải lớn hơn bắt đầu', type: 'error' });
        if ((due.getTime() - start.getTime()) / 60000 < 30) return showToast({ title: 'Tối thiểu 30 phút', type: 'error' });

        setLoading(true);
        try {
            await taskService.updateTask(editForm.task_id, editForm);
            showToast({ title: 'Cập nhật thành công!', type: 'success' });
            setIsEditOpen(false); setSelectedTask(null); await fetchTasks();
        } catch (err) { showToast({ title: 'Lỗi cập nhật', type: 'error' }); } finally { setLoading(false); }
    };

    const handleCancelTask = async (taskId) => {
        if (!window.confirm("Hủy bỏ hoàn toàn công việc này?")) return;
        try {
            await taskService.cancelTask(taskId);
            showToast({ title: 'Hủy thành công', type: 'success' });
            setSelectedTask(null); fetchTasks();
        } catch (err) { showToast({ title: 'Lỗi hủy công việc', type: 'error' }); }
    };

    const handleCompleteTask = async (taskId) => {
        const st = getComputedStatus(selectedTask);
        if (st === 'OVERDUE' && !reportNote?.trim()) return showToast({ title: 'Công việc quá hạn! Phải nhập giải trình.', type: 'error' });
        if (!window.confirm("Xác nhận hoàn tất công việc?")) return;
        try {
            await taskService.completeTask(taskId, { note: reportNote });
            showToast({ title: 'Hoàn thành công việc!', type: 'success' });
            setSelectedTask(null); setReportNote(''); fetchTasks();
        } catch (err) { showToast({ title: 'Lỗi hoàn thành', type: 'error' }); }
    };

    const getStatusBadge = (task) => {
        const s = getComputedStatus(task);
        if (s === 'PENDING') return <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-bold border border-amber-200">Chờ xử lý</span>;
        if (s === 'IN_PROGRESS') return <span className="bg-sky-100 text-sky-700 px-3 py-1 rounded-full text-xs font-bold border border-sky-200">Đang thực hiện</span>;
        if (s === 'COMPLETED') return <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold border border-emerald-200">Hoàn thành</span>;
        if (s === 'OVERDUE') return <span className="bg-rose-100 text-rose-700 px-3 py-1 rounded-full text-xs font-bold border border-rose-200 animate-pulse">Quá hạn</span>;
        return <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold border border-slate-200">Đã hủy</span>;
    };

    if (loading && tasks.length === 0) {
        return <div className="flex items-center justify-center h-screen"><div className="w-12 h-12 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin"></div></div>;
    }

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
                            <span className="text-xl leading-none">+</span> Phân công (Hệ Ma trận)
                        </button>
                    </div>
                )}
            </div>

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
            <div className="bg-white rounded-[24px] shadow-sm border border-slate-200 overflow-hidden relative">
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
                            {(readOnly && engineersList.length > 0 ? engineersList.map(e => ({id: e.user_id, name: e.full_name})) : engineers).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                        </select>
                    )}

                    <select value={filterWorker} onChange={(e) => { setFilterWorker(e.target.value); setCurrentPage(1); }} className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 outline-none focus:border-emerald-500 shadow-sm cursor-pointer flex-1 min-w-[150px]">
                        <option value="">Tất cả nhân công</option>
                        {workers.filter(w => !w.role_name || normalize(w.role_name) === 'WORKER' || normalize(w.role) === 'WORKER').map(w => <option key={w.worker_id || w.user_id} value={w.worker_id || w.user_id}>{w.full_name}</option>)}
                    </select>

                    <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }} className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 outline-none focus:border-emerald-500 shadow-sm cursor-pointer flex-1 min-w-[160px]">
                        {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[1100px]">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Công việc</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Ao nuôi</th>
                                {showEngineerColumn && <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Kỹ sư</th>}
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Nhân công</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Hạn chót</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Trạng thái</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center w-[160px]">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {paginatedTasks.length === 0 ? (
                                <tr><td colSpan={showEngineerColumn ? 7 : 6} className="p-12 text-center text-slate-500 font-medium text-lg">Không tìm thấy công việc phù hợp.</td></tr>
                            ) : paginatedTasks.map(t => (
                                <tr key={t.task_id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <strong className="block text-slate-800 text-base">{t.type_name || t.task_type}</strong>
                                        <span className="text-sm font-medium text-slate-500 mt-0.5 max-w-[200px] truncate block" title={t.task_title}>{t.task_title}</span>
                                    </td>
                                    <td className="px-6 py-4 font-bold text-emerald-600">{t.pond_name || '-'}</td>
                                    {showEngineerColumn && <td className="px-6 py-4 text-slate-700 font-medium">{t.creator_name || '-'}</td>}
                                    <td className="px-6 py-4 font-bold text-slate-700">{(t.assigned_workers_list || []).map(w => w.full_name).join(', ') || 'Chưa gán'}</td>
                                    <td className="px-6 py-4">
                                        <span className={`text-sm font-bold ${getComputedStatus(t) === 'OVERDUE' ? 'text-rose-600' : 'text-slate-700'}`}>{formatDate(t.due_date).split(' ')[1]}</span>
                                        <span className="text-xs text-slate-400 block mt-0.5">{formatDate(t.due_date).split(' ')[0]}</span>
                                    </td>
                                    <td className="px-6 py-4 text-center">{getStatusBadge(t)}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => setSelectedTask(t)} className="p-2 rounded-lg bg-white border border-slate-200 text-slate-500 hover:bg-sky-50 hover:text-sky-600 hover:border-sky-200 transition-all shadow-sm" title="Xem chi tiết">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                                            </button>
                                            {!readOnly && getComputedStatus(t) === 'PENDING' && (
                                                <>
                                                    <button onClick={() => handleOpenEdit(t)} className="p-2 rounded-lg bg-white border border-slate-200 text-slate-500 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200 transition-all shadow-sm" title="Chỉnh sửa">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                                                    </button>
                                                    <button onClick={() => handleCancelTask(t.task_id)} className="p-2 rounded-lg bg-white border border-slate-200 text-slate-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all shadow-sm" title="Hủy">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="p-5 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-slate-600 font-medium bg-white">
                    <div className="flex items-center gap-3">
                        <span>Hiển thị</span>
                        <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }} className="border border-slate-200 rounded-lg px-3 py-1.5 outline-none bg-slate-50 focus:border-emerald-500">
                            {[5, 10, 20, 50].map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <span>({filteredTasks.length > 0 ? startIndex + 1 : 0} - {endIndex} / {filteredTasks.length})</span>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setCurrentPage(p => p - 1)} disabled={safePage <= 1} className="px-4 py-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-50 transition-colors font-bold shadow-sm">Trước</button>
                        <div className="flex items-center justify-center px-4 py-2 bg-emerald-50 text-emerald-700 font-bold rounded-xl border border-emerald-100">{safePage} / {totalPages}</div>
                        <button onClick={() => setCurrentPage(p => p + 1)} disabled={safePage >= totalPages} className="px-4 py-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-50 transition-colors font-bold shadow-sm">Sau</button>
                    </div>
                </div>
            </div>

            {/* ================= MODALS TÁI SỬ DỤNG ================= */}
            
            {/* 🌟 Modal Chi Tiết */}
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
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100"><span className="text-xs font-bold text-slate-500 uppercase block mb-1">Người giao</span><strong className="text-base text-slate-800">{selectedTask.creator_name || `Hệ thống`}</strong></div>
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100"><span className="text-xs font-bold text-slate-500 uppercase block mb-2">Trạng thái</span>{getStatusBadge(selectedTask)}</div>
                            
                            {selectedTask.product_info ? (
                                <div className="bg-sky-50 p-4 rounded-2xl border border-sky-200 col-span-2">
                                    <span className="text-xs font-bold text-sky-600 uppercase block mb-1">Vật tư chỉ định</span>
                                    <div className="text-slate-800">Sản phẩm: <strong className="text-sky-700">{selectedTask.product_info.product_name}</strong> — Định mức: <strong className="text-xl text-sky-600">{selectedTask.product_info.quantity}</strong> {selectedTask.product_info.unit}</div>
                                </div>
                            ) : (
                                <div className="bg-slate-50 p-4 rounded-2xl border border-dashed border-slate-300 col-span-2 text-slate-500 font-medium italic text-sm">Công việc không yêu cầu vật tư đi kèm.</div>
                            )}

                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 col-span-2"><span className="text-xs font-bold text-slate-500 uppercase block mb-1">Mô tả / Hướng dẫn</span><p className="text-sm text-slate-700 m-0 whitespace-pre-line bg-white p-3 rounded-xl border border-slate-200">{selectedTask.description || '-'}</p></div>

                            {mode !== 'worker' && (
                                <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 col-span-2 flex flex-col gap-3">
                                    <span className="text-xs font-bold text-amber-700 uppercase block">Chi tiết phân công & Báo cáo</span>
                                    {(selectedTask.assigned_workers_list || []).length > 0 ? selectedTask.assigned_workers_list.map(w => (
                                        <div key={w.worker_id} className="bg-white p-3 rounded-xl border border-amber-100 flex flex-col gap-2">
                                            <div className="flex justify-between items-center"><strong className="text-sm text-slate-800">Công nhân: <span className="text-amber-600">{w.full_name}</span></strong><span className="text-[10px] font-bold px-2 py-1 rounded bg-slate-100">{w.worker_status || 'ASSIGNED'}</span></div>
                                            <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg">✓ Hoàn thành: <strong>{formatDate(w.completed_at)}</strong></div>
                                            {w.note && <div className="text-xs text-slate-700 bg-slate-100 p-2 rounded-lg border-l-2 border-slate-300"><strong>Ghi chú:</strong> {w.note}</div>}
                                        </div>
                                    )) : <span className="text-sm text-rose-500 italic">Chưa cấu hình công nhân phụ trách.</span>}
                                </div>
                            )}

                            {(selectedTask.task_images || []).length > 0 && (
                                <div className="col-span-2">
                                    <span className="text-xs font-bold text-slate-500 uppercase block mb-2">Ảnh minh chứng</span>
                                    <div className="flex gap-3 flex-wrap">
                                        {selectedTask.task_images.map((img, i) => <img key={i} src={img} alt="img" className="w-24 h-24 object-cover rounded-xl border border-slate-200 cursor-pointer hover:scale-105 transition-transform shadow-sm" onClick={() => window.open(img, '_blank')} />)}
                                    </div>
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

            {/* 🌟 MODAL TẠO MỚI (MA TRẬN PHÂN CÔNG ĐƯỢC FIX) */}
            {!readOnly && isCreateOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 sm:p-6" onClick={() => setIsCreateOpen(false)}>
                    <div className="bg-white max-w-5xl w-full p-5 md:p-8 rounded-[24px] shadow-2xl flex flex-col max-h-[95vh] sm:max-h-[90vh] animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6 shrink-0">
                            <h2 className="text-xl md:text-2xl font-extrabold text-slate-800">Phân công Công việc (Hệ Ma trận)</h2>
                            <button onClick={() => setIsCreateOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 text-lg font-bold transition-colors">&times;</button>
                        </div>
                        
                        <form className="flex flex-col flex-1 overflow-hidden" onSubmit={handleCreateTask}>
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
                                                                    return (
                                                                        <td key={pId} className="px-3 py-3">
                                                                            <input 
                                                                                type="checkbox" 
                                                                                checked={isChecked} 
                                                                                disabled={isBusy && !isChecked} 
                                                                                onChange={() => toggleAssignment(wId, pId)} 
                                                                                className="w-4 h-4 cursor-pointer text-emerald-500 focus:ring-emerald-500 rounded disabled:opacity-30 border-slate-300" 
                                                                            />
                                                                        </td>
                                                                    )
                                                                })}
                                                                {matrixPonds.length === 0 && !loadingPonds && <td></td>}
                                                            </tr>
                                                        )
                                                    })}
                                                    {workers.length === 0 && (
                                                        <tr>
                                                            <td colSpan={matrixPonds.length + 1} className="p-8 text-center text-slate-500 font-medium">
                                                                Chưa có nhân công nào trong danh sách.
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-bold text-slate-700">Tiêu đề mẫu công việc</label>
                                    <input value={form.task_title} onChange={e => setForm({...form, task_title: e.target.value})} placeholder="VD: Cho tôm ăn cử sáng..." className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-100 outline-none shadow-sm" />
                                </div>

                                {isProductRequired && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-sky-50/50 p-4 rounded-xl border border-sky-100">
                                        <div className="flex flex-col gap-1.5"><label className="text-sm font-bold text-sky-800">Vật tư chỉ định</label><select value={form.product_id} onChange={e => setForm({...form, product_id: e.target.value})} className="w-full px-4 py-3 border border-sky-200 rounded-xl focus:ring-2 focus:ring-sky-100 outline-none bg-white shadow-sm"><option value="">-- Chọn sản phẩm --</option>{products.map(p => <option key={p.product_id} value={p.product_id}>{p.product_name} ({p.unit})</option>)}</select></div>
                                        <div className="flex flex-col gap-1.5"><label className="text-sm font-bold text-sky-800">Số lượng / mỗi ao</label><input type="number" step="0.01" value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} placeholder="0.00" className="w-full px-4 py-3 border border-sky-200 rounded-xl focus:ring-2 focus:ring-sky-100 outline-none shadow-sm" /></div>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-1.5"><label className="text-sm font-bold text-slate-700">Bắt đầu <span className="text-rose-500">*</span></label><input type="datetime-local" value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-100 outline-none shadow-sm" /></div>
                                    <div className="flex flex-col gap-1.5"><label className="text-sm font-bold text-slate-700">Hạn chót <span className="text-rose-500">*</span></label><input type="datetime-local" value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})} className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-100 outline-none shadow-sm" /></div>
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-bold text-slate-700">Hướng dẫn kỹ thuật <span className="text-rose-500">*</span></label>
                                    <textarea rows="3" value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Chi tiết các bước..." className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-100 outline-none resize-none shadow-sm" />
                                </div>
                            </div>
                            
                            <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100 shrink-0">
                                <button type="button" onClick={() => setIsCreateOpen(false)} className="px-6 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors">Hủy</button>
                                <button type="button" onClick={handleCreateTask} disabled={!form.assignments.length || !form.start_date || !form.due_date} className="px-8 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-50 shadow-md">Kích hoạt ({form.assignments.length})</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Chỉnh Sửa */}
            {!readOnly && isEditOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 sm:p-6" onClick={() => setIsEditOpen(false)}>
                    <div className="bg-white max-w-2xl w-full p-5 md:p-8 rounded-[24px] shadow-2xl flex flex-col animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6 shrink-0">
                            <div>
                                <h2 className="text-xl md:text-2xl font-extrabold text-slate-800">Chỉnh sửa Kế hoạch</h2>
                                <p className="text-sm text-slate-500 mt-1">Chỉ được đổi tiêu đề, thời gian và hướng dẫn</p>
                            </div>
                            <button onClick={() => setIsEditOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 text-lg font-bold transition-colors">&times;</button>
                        </div>
                        
                        <div className="flex flex-col gap-4">
                            <div className="flex flex-col gap-1.5"><label className="text-sm font-bold text-slate-700">Tiêu đề <span className="text-rose-500">*</span></label><input value={editForm.task_title} onChange={e => setEditForm({...editForm, task_title: e.target.value})} className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-100 outline-none" /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1.5"><label className="text-sm font-bold text-slate-700">Bắt đầu <span className="text-rose-500">*</span></label><input type="datetime-local" value={editForm.start_date} onChange={e => setEditForm({...editForm, start_date: e.target.value})} className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-100 outline-none" /></div>
                                <div className="flex flex-col gap-1.5"><label className="text-sm font-bold text-slate-700">Hạn chót <span className="text-rose-500">*</span></label><input type="datetime-local" value={editForm.due_date} onChange={e => setEditForm({...editForm, due_date: e.target.value})} className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-100 outline-none" /></div>
                            </div>
                            <div className="flex flex-col gap-1.5"><label className="text-sm font-bold text-slate-700">Hướng dẫn <span className="text-rose-500">*</span></label><textarea rows="4" value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-100 outline-none resize-none" /></div>
                        </div>
                        
                        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
                            <button onClick={() => setIsEditOpen(false)} className="px-6 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors">Hủy</button>
                            <button onClick={handleUpdateTask} disabled={!editForm.task_title || !editForm.description || !editForm.start_date || !editForm.due_date} className="px-8 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-50 shadow-md">Lưu cập nhật</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TaskManagementPage;