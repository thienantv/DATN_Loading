import React, { useEffect, useMemo, useState } from 'react';
import { pondService } from '../../services/api';
import { showToast } from '../../utils/toast';
import PondChartCard from '../../components/charts/PondChartCard';
import { useAuth } from '../../context/AuthContext';

const POND_STATUS_OPTIONS = [
  { value: 'ALL', label: 'Tất cả trạng thái ao' },
  { value: 'CHUAN_BI_NUOI', label: 'Chuẩn bị nuôi' },
  { value: 'TAM_NGUNG', label: 'Tạm ngưng' },
  { value: 'DANG_NUOI', label: 'Đang nuôi' },
  { value: 'DANG_CAI_TAO', label: 'Đang cải tạo' },
];

const USAGE_STATUS_OPTIONS = [
  { value: 'ALL', label: 'Tất cả trạng thái' },
  { value: 'HOAT_DONG', label: 'Hoạt động' },
  { value: 'NGUNG_SU_DUNG', label: 'Ngưng sử dụng' },
];

const CHART_COLORS = ['#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#a855f7', '#14b8a6'];
const normalizeUpper = (value) => String(value || '').trim().toUpperCase();
const normalizeText = (value) => String(value || '').trim().toLowerCase();

const formatRoundedNumber = (value) => {
  if (value === null || value === undefined || value === '') return '-';
  const num = Number(value);
  return Number.isNaN(num) ? value : String(Math.round(num));
};

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('vi-VN');
};

const getPondStatusBadge = (status) => {
  switch (normalizeUpper(status)) {
    case 'CHUAN_BI_NUOI': return <span className="bg-purple-100 text-purple-700 px-2.5 py-1 rounded-lg text-xs font-bold border border-purple-200">Chuẩn bị nuôi</span>;
    case 'DANG_NUOI': return <span className="bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-lg text-xs font-bold border border-emerald-200">Đang nuôi</span>;
    case 'DANG_CAI_TAO': return <span className="bg-amber-100 text-amber-700 px-2.5 py-1 rounded-lg text-xs font-bold border border-amber-200">Đang cải tạo</span>;
    case 'TAM_NGUNG': return <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg text-xs font-bold border border-slate-200">Tạm ngưng</span>;
    default: return <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg text-xs font-bold">{status || '-'}</span>;
  }
};

const getUsageStatusBadge = (status) => {
  if (normalizeUpper(status) === 'HOAT_DONG') {
    return <span className="flex items-center gap-1.5 text-emerald-600 text-sm font-bold"><span className="w-2 h-2 rounded-full bg-emerald-500"></span>Hoạt động</span>;
  }
  return <span className="flex items-center gap-1.5 text-rose-500 text-sm font-bold"><span className="w-2 h-2 rounded-full bg-rose-500"></span>Ngưng dùng</span>;
};

const PondsPage = ({ roleLabel = 'Owner' }) => {
  const { user } = useAuth();
  
  // KIỂM TRA QUYỀN DỰA VÀO PROP TRUYỀN VÀO TỪ FILE WRAPPER
  const isOwner = roleLabel === 'Owner';
  const isTechnician = roleLabel === 'Technician';

  const [ponds, setPonds] = useState([]);
  const [technicians, setTechnicians] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [usageFilter, setUsageFilter] = useState('ALL');
  const [technicianFilter, setTechnicianFilter] = useState('ALL'); 
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);

  const [selectedPond, setSelectedPond] = useState(null);
  const [busyAssignmentKey, setBusyAssignmentKey] = useState('');
  const [form, setForm] = useState({ pondName: '', area_m2: '', depth_m: '', assigned_staff: '', usage_status: 'HOAT_DONG' });

  useEffect(() => {
    fetchData();
  }, [roleLabel]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const pondRes = await pondService.getAllPonds();
      setPonds(pondRes?.data?.data || []);

      if (isOwner) {
        const matrixRes = await pondService.getAssignmentMatrix().catch(() => null);
        setTechnicians(matrixRes?.data?.data?.technicians || []);
      }
    } catch (err) {
      showToast({ title: 'Không tải được dữ liệu', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const technicianOptions = useMemo(() => technicians.map(t => ({ id: t.user_id, name: t.full_name || t.username, isActive: Boolean(t.status) })), [technicians]);
  const getTechnicianName = (id) => technicianOptions.find(t => String(t.id) === String(id))?.name || '-';

  const summary = useMemo(() => {
    const s = { total: ponds.length, chuanBi: 0, tamNgung: 0, dangNuoi: 0, dangCaiTao: 0, hoatDong: 0, ngungDung: 0 };
    ponds.forEach(p => {
      const st = normalizeUpper(p.status);
      const us = normalizeUpper(p.usage_status);
      if (st === 'TAM_NGUNG') s.tamNgung++;
      if (st === 'CHUAN_BI_NUOI') s.chuanBi++;
      if (st === 'DANG_NUOI') s.dangNuoi++;
      if (st === 'DANG_CAI_TAO') s.dangCaiTao++;
      if (us === 'HOAT_DONG') s.hoatDong++;
      if (us === 'NGUNG_SU_DUNG') s.ngungDung++;
    });
    return s;
  }, [ponds]);

  const filteredPonds = useMemo(() => {
    const search = normalizeText(searchTerm);
    return [...ponds]
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .filter(p => {
        const matchSearch = !search || normalizeText(p.pond_name).includes(search);
        const matchStatus = statusFilter === 'ALL' || normalizeUpper(p.status) === statusFilter;
        const matchUsage = usageFilter === 'ALL' || normalizeUpper(p.usage_status) === usageFilter;
        const matchTech = !isOwner || technicianFilter === 'ALL' || String(p.assigned_staff || '') === String(technicianFilter);
        return matchSearch && matchStatus && matchUsage && matchTech;
      });
  }, [ponds, searchTerm, statusFilter, usageFilter, technicianFilter, isOwner]);

  const totalPages = Math.max(1, Math.ceil(filteredPonds.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredPonds.length);
  const paginatedPonds = filteredPonds.slice(startIndex, startIndex + pageSize);

  const statusChart = [
    { label: 'Đang nuôi', value: summary.dangNuoi, color: '#10b981' },
    { label: 'Chuẩn bị nuôi', value: summary.chuanBi, color: '#8b5cf6' },
    { label: 'Đang cải tạo', value: summary.dangCaiTao, color: '#f59e0b' },
    { label: 'Tạm ngưng', value: summary.tamNgung, color: '#94a3b8' },
  ].filter(d => d.value > 0);

  const usageChart = [
    { label: 'Hoạt động', value: summary.hoatDong, color: '#0ea5e9' },
    { label: 'Ngưng dùng', value: summary.ngungDung, color: '#ef4444' },
  ];

  const techWorkloadChart = useMemo(() => {
    if (!isOwner) return [];
    const loadMap = new Map(technicianOptions.map(t => [String(t.id), { name: t.name, count: 0 }]));
    ponds.forEach(p => {
      const key = String(p.assigned_staff || '');
      if (loadMap.has(key)) loadMap.get(key).count++;
    });
    return Array.from(loadMap.values()).sort((a, b) => b.count - a.count).slice(0, 6).map((item, idx) => ({
      label: item.name.split(' ').pop(), value: item.count, color: CHART_COLORS[idx % CHART_COLORS.length]
    }));
  }, [ponds, technicianOptions, isOwner]);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await pondService.createPond({
        pondName: form.pondName.trim(), areaMeter: Number(form.area_m2), depthMeter: Number(form.depth_m),
        assignedStaff: form.assigned_staff ? Number(form.assigned_staff) : null,
      });
      showToast({ title: 'Tạo ao thành công', type: 'success' });
      setShowCreateModal(false);
      fetchData();
    } catch (err) { showToast({ title: err?.response?.data?.message || 'Lỗi tạo ao', type: 'error' }); } 
    finally { setSaving(false); }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await pondService.updatePond(selectedPond.pond_id, {
        pondName: form.pondName.trim(), areaMeter: Number(form.area_m2), depthMeter: Number(form.depth_m),
        assignedStaff: form.assigned_staff ? Number(form.assigned_staff) : null,
      });
      if (normalizeUpper(selectedPond.usage_status) !== normalizeUpper(form.usage_status)) {
        await pondService.updateUsageStatus(selectedPond.pond_id, form.usage_status);
      }
      showToast({ title: 'Cập nhật thành công', type: 'success' });
      setShowEditModal(false);
      fetchData();
    } catch (err) { showToast({ title: 'Lỗi cập nhật ao', type: 'error' }); } 
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Xóa ao nuôi này?')) return;
    try {
      await pondService.deletePond(id);
      showToast({ title: 'Xóa thành công', type: 'success' });
      fetchData();
    } catch (err) { showToast({ title: 'Lỗi xóa ao', type: 'error' }); }
  };

  const handleToggleUsage = async (pond) => {
    const next = normalizeUpper(pond.usage_status) === 'HOAT_DONG' ? 'NGUNG_SU_DUNG' : 'HOAT_DONG';
    if (!window.confirm(`Chuyển trạng thái sang ${next === 'HOAT_DONG' ? 'Hoạt động' : 'Ngưng dùng'}?`)) return;
    try {
      await pondService.updateUsageStatus(pond.pond_id, next);
      fetchData();
    } catch (err) { showToast({ title: 'Lỗi cập nhật trạng thái', type: 'error' }); }
  };

  const handleAssignTech = async (pond, techId, checked) => {
    try {
      setBusyAssignmentKey(`${pond.pond_id}:${techId}`);
      await pondService.updateAssignment(pond.pond_id, checked ? techId : null);
      fetchData();
    } catch (err) { showToast({ title: 'Lỗi phân công', type: 'error' }); } 
    finally { setBusyAssignmentKey(''); }
  };

  const canConfirmRenovation = (pond) => {
    return normalizeUpper(pond.status) === 'DANG_CAI_TAO' && 
           normalizeUpper(pond.usage_status) === 'HOAT_DONG' && 
           Number(pond.assigned_staff) === Number(user?.user_id) && 
           !pond.renovation_completed_at;
  };

  const handleConfirmRenovation = async (pond) => {
    if (!window.confirm(`Xác nhận hoàn tất cải tạo cho ao ${pond.pond_name}?`)) return;
    try {
      await pondService.completeRenovation(pond.pond_id);
      showToast({ title: 'Đã hoàn tất cải tạo', type: 'success' });
      fetchData();
    } catch (err) { showToast({ title: 'Lỗi xác nhận cải tạo', type: 'error' }); }
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="w-10 h-10 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin"></div></div>;

  return (
    <div className="max-w-[1600px] mx-auto animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight">Quản lý Ao nuôi</h1>
          <p className="text-slate-500 font-medium mt-1">{isOwner ? 'Quản lý thông tin và phân công ao nuôi' : 'Danh sách ao bạn được phân công quản lý'} ({roleLabel})</p>
        </div>
        {isOwner && (
          <div className="flex gap-3 w-full sm:w-auto">
            <button onClick={() => setShowAssignmentModal(true)} className="flex-1 sm:flex-none px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 shadow-sm transition-all">📋 Giao kỹ sư</button>
            <button onClick={() => { setForm({ pondName: '', area_m2: '', depth_m: '', assigned_staff: '' }); setShowCreateModal(true); }} className="flex-1 sm:flex-none px-4 py-2.5 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 shadow-md shadow-emerald-500/20 transition-all">➕ Thêm ao</button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm border-t-4 border-t-slate-400">
          <span className="text-slate-500 font-bold text-sm">Tổng số ao</span><strong className="block text-3xl font-black text-slate-800 mt-1">{summary.total}</strong>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm border-t-4 border-t-emerald-400">
          <span className="text-slate-500 font-bold text-sm">Đang nuôi</span><strong className="block text-3xl font-black text-slate-800 mt-1">{summary.dangNuoi}</strong>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm border-t-4 border-t-purple-400">
          <span className="text-slate-500 font-bold text-sm">Chuẩn bị nuôi</span><strong className="block text-3xl font-black text-slate-800 mt-1">{summary.chuanBi}</strong>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm border-t-4 border-t-amber-400">
          <span className="text-slate-500 font-bold text-sm">Đang cải tạo</span><strong className="block text-3xl font-black text-slate-800 mt-1">{summary.dangCaiTao}</strong>
        </div>
      </div>

      <div className={`grid grid-cols-1 ${isOwner ? 'lg:grid-cols-3' : 'lg:grid-cols-2'} gap-6 mb-6`}>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm h-[350px]"><PondChartCard title="Trạng thái ao nuôi" type="doughnut" data={statusChart} /></div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm h-[350px]"><PondChartCard title="Trạng thái sử dụng" type="doughnut" data={usageChart} /></div>
        {isOwner && <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm h-[350px]"><PondChartCard title="Tải trọng công việc kỹ sư" type="bar" data={techWorkloadChart} /></div>}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-3 bg-slate-50/50">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">⌕</span>
            <input type="text" placeholder="Tìm tên ao..." value={searchTerm} onChange={(e) => {setSearchTerm(e.target.value); setCurrentPage(1);}} className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500 outline-none" />
          </div>
          <select value={statusFilter} onChange={(e) => {setStatusFilter(e.target.value); setCurrentPage(1);}} className="px-3 py-2 border border-slate-300 rounded-xl text-sm font-medium text-slate-700 bg-white outline-none focus:border-emerald-500">
            {POND_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={usageFilter} onChange={(e) => {setUsageFilter(e.target.value); setCurrentPage(1);}} className="px-3 py-2 border border-slate-300 rounded-xl text-sm font-medium text-slate-700 bg-white outline-none focus:border-emerald-500">
            {USAGE_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          {isOwner && (
            <select value={technicianFilter} onChange={(e) => {setTechnicianFilter(e.target.value); setCurrentPage(1);}} className="px-3 py-2 border border-slate-300 rounded-xl text-sm font-medium text-slate-700 bg-white outline-none focus:border-emerald-500">
              <option value="ALL">Tất cả kỹ sư phụ trách</option>
              {technicianOptions.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5 text-sm font-bold text-slate-600">Ao nuôi</th>
                <th className="px-5 py-3.5 text-sm font-bold text-slate-600 text-right">Diện tích (m²)</th>
                <th className="px-5 py-3.5 text-sm font-bold text-slate-600 text-right">Độ sâu (m)</th>
                <th className="px-5 py-3.5 text-sm font-bold text-slate-600 text-center">Tình trạng</th>
                <th className="px-5 py-3.5 text-sm font-bold text-slate-600">Sử dụng</th>
                {isOwner && <th className="px-5 py-3.5 text-sm font-bold text-slate-600">Kỹ sư</th>}
                <th className="px-5 py-3.5 text-sm font-bold text-slate-600 text-center w-[120px]">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedPonds.length === 0 ? (
                <tr><td colSpan={isOwner ? 7 : 6} className="p-8 text-center text-slate-500 font-medium">Không tìm thấy ao nuôi nào.</td></tr>
              ) : (
                paginatedPonds.map(pond => (
                  <tr key={pond.pond_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3">
                      <strong className="block text-slate-800 text-base">{pond.pond_name}</strong>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{pond.pond_code}</span>
                    </td>
                    <td className="px-5 py-3 text-right font-medium text-slate-700">{formatRoundedNumber(pond.area_m2)}</td>
                    <td className="px-5 py-3 text-right font-medium text-slate-700">{formatRoundedNumber(pond.depth_m)}</td>
                    <td className="px-5 py-3 text-center">{getPondStatusBadge(pond.status)}</td>
                    <td className="px-5 py-3">{getUsageStatusBadge(pond.usage_status)}</td>
                    {isOwner && <td className="px-5 py-3 font-bold text-slate-700">{getTechnicianName(pond.assigned_staff)}</td>}
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => { setSelectedPond(pond); setShowDetailModal(true); }} className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 hover:bg-sky-100 hover:text-sky-600 flex items-center justify-center transition-colors" title="Xem">👁</button>
                        
                        {isOwner && (
                          <>
                            <button onClick={() => { setForm({ pondName: pond.pond_name, area_m2: pond.area_m2, depth_m: pond.depth_m, assigned_staff: pond.assigned_staff || '', usage_status: pond.usage_status }); setSelectedPond(pond); setShowEditModal(true); }} className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 hover:bg-amber-100 hover:text-amber-600 flex items-center justify-center transition-colors" title="Sửa">✎</button>
                            <button onClick={() => handleToggleUsage(pond)} className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center transition-colors" title="Bật/Tắt">{normalizeUpper(pond.usage_status) === 'HOAT_DONG' ? '⊘' : '↺'}</button>
                            <button onClick={() => handleDelete(pond.pond_id)} className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 hover:bg-rose-100 hover:text-rose-600 flex items-center justify-center transition-colors" title="Xóa">🗑</button>
                          </>
                        )}

                        {isTechnician && canConfirmRenovation(pond) && (
                          <button onClick={() => handleConfirmRenovation(pond)} className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 hover:bg-emerald-200 flex items-center justify-center transition-colors" title="Xác nhận xong cải tạo">✓</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-3 text-sm text-slate-600 font-medium bg-slate-50/50">
          <div className="flex items-center gap-2">
            <span>Hiển thị</span>
            <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }} className="border border-slate-300 rounded-lg px-2 py-1 outline-none">
              {[5, 10, 20, 50].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <span>mục ({filteredPonds.length > 0 ? startIndex + 1 : 0}-{endIndex} / {filteredPonds.length})</span>
          </div>
          <div className="flex gap-1.5">
            <button onClick={() => setCurrentPage(p => p - 1)} disabled={safePage <= 1} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors">Trước</button>
            <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 font-bold rounded-lg border border-emerald-100">{safePage} / {totalPages}</span>
            <button onClick={() => setCurrentPage(p => p + 1)} disabled={safePage >= totalPages} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors">Sau</button>
          </div>
        </div>
      </div>

      {/* Modal View Detail */}
      {showDetailModal && selectedPond && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" onClick={() => setShowDetailModal(false)}>
          <div className="bg-white max-w-2xl w-full p-6 md:p-8 rounded-2xl shadow-xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-extrabold text-slate-800">Chi tiết Ao {selectedPond.pond_name}</h2>
              <button onClick={() => setShowDetailModal(false)} className="text-slate-400 hover:text-slate-800 text-2xl font-bold">&times;</button>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100"><span className="text-xs font-bold text-slate-500 uppercase block mb-1">Mã ao</span><strong className="text-lg text-slate-800">{selectedPond.pond_code}</strong></div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100"><span className="text-xs font-bold text-slate-500 uppercase block mb-1">Trạng thái hiện tại</span><div>{getPondStatusBadge(selectedPond.status)}</div></div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100"><span className="text-xs font-bold text-slate-500 uppercase block mb-1">Diện tích</span><strong className="text-lg text-slate-800">{formatRoundedNumber(selectedPond.area_m2)} m²</strong></div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100"><span className="text-xs font-bold text-slate-500 uppercase block mb-1">Độ sâu</span><strong className="text-lg text-slate-800">{formatRoundedNumber(selectedPond.depth_m)} m</strong></div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 col-span-2 sm:col-span-1"><span className="text-xs font-bold text-slate-500 uppercase block mb-1">Kỹ sư quản lý</span><strong className="text-base text-slate-800">{selectedPond.technician_name || getTechnicianName(selectedPond.assigned_staff) || '-'}</strong></div>
              {isOwner && <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 col-span-2 sm:col-span-1"><span className="text-xs font-bold text-slate-500 uppercase block mb-1">Công nhân trực</span><strong className="text-base text-slate-800">{(selectedPond.workers || []).map(w => w.full_name || w.username).join(', ') || '-'}</strong></div>}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 col-span-2"><span className="text-xs font-bold text-slate-500 uppercase block mb-1">Lịch sử cải tạo</span><div className="text-sm text-slate-700">Bắt đầu: {formatDateTime(selectedPond.renovation_started_at)} <br/> Hoàn tất: {formatDateTime(selectedPond.renovation_completed_at)}</div></div>
            </div>
            <button onClick={() => setShowDetailModal(false)} className="w-full py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors">Đóng</button>
          </div>
        </div>
      )}

      {/* Modal Add/Edit (Owner Only) */}
      {(showCreateModal || showEditModal) && isOwner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" onClick={() => {setShowCreateModal(false); setShowEditModal(false)}}>
          <div className="bg-white max-w-md w-full p-6 rounded-2xl shadow-xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-extrabold text-slate-800 mb-5">{showEditModal ? 'Cập nhật ao nuôi' : 'Thêm ao mới'}</h2>
            <form onSubmit={showEditModal ? handleEditSubmit : handleCreateSubmit} className="flex flex-col gap-4">
              {showEditModal && <div className="flex flex-col gap-1"><label className="text-sm font-bold text-slate-700">Mã ao</label><input value={selectedPond?.pond_code || ''} disabled className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-slate-500" /></div>}
              <div className="flex flex-col gap-1"><label className="text-sm font-bold text-slate-700">Tên ao *</label><input value={form.pondName} onChange={(e) => setForm({...form, pondName: e.target.value})} required className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-200 outline-none" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1"><label className="text-sm font-bold text-slate-700">Diện tích (m²) *</label><input type="number" min="0" step="0.01" value={form.area_m2} onChange={(e) => setForm({...form, area_m2: e.target.value})} required className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-200 outline-none" /></div>
                <div className="flex flex-col gap-1"><label className="text-sm font-bold text-slate-700">Độ sâu (m) *</label><input type="number" min="0" step="0.01" value={form.depth_m} onChange={(e) => setForm({...form, depth_m: e.target.value})} required className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-200 outline-none" /></div>
              </div>
              <div className="flex flex-col gap-1"><label className="text-sm font-bold text-slate-700">Kỹ sư phụ trách</label><select value={form.assigned_staff} onChange={(e) => setForm({...form, assigned_staff: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white outline-none"><option value="">-- Không chọn --</option>{technicianOptions.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
              {showEditModal && <div className="flex flex-col gap-1"><label className="text-sm font-bold text-slate-700">Tình trạng sử dụng</label><select value={form.usage_status} onChange={(e) => setForm({...form, usage_status: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white outline-none"><option value="HOAT_DONG">Hoạt động</option><option value="NGUNG_SU_DUNG">Ngưng sử dụng</option></select></div>}
              
              <div className="flex justify-end gap-3 mt-2">
                <button type="button" onClick={() => {setShowCreateModal(false); setShowEditModal(false)}} className="px-5 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200">Hủy</button>
                <button type="submit" disabled={saving} className="px-5 py-2.5 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 disabled:opacity-50">{saving ? 'Đang lưu...' : 'Lưu dữ liệu'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Matrix Kỹ sư - Ao (Owner Only) */}
      {showAssignmentModal && isOwner && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" onClick={() => setShowAssignmentModal(false)}>
           <div className="bg-white max-w-5xl w-full p-6 rounded-2xl shadow-xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
             <div className="flex justify-between items-center mb-6 shrink-0">
               <h2 className="text-xl font-extrabold text-slate-800">Bảng phân công Nhanh (Kỹ sư ↔ Ao)</h2>
               <button onClick={() => setShowAssignmentModal(false)} className="text-slate-400 hover:text-slate-800 text-2xl font-bold">&times;</button>
             </div>
             <div className="flex-1 overflow-auto border border-slate-200 rounded-xl">
                <table className="w-full text-center border-collapse">
                  <thead className="bg-slate-50 sticky top-0 shadow-sm z-10">
                    <tr>
                      <th className="px-4 py-3 border-r border-slate-200 text-left font-bold text-slate-600">Kỹ sư</th>
                      {ponds.map(p => <th key={p.pond_id} className="px-3 py-3 text-xs font-bold text-slate-600" title={p.pond_name}>{p.pond_code}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {technicianOptions.map(tech => (
                      <tr key={tech.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 border-r border-slate-200 text-left">
                          <strong className="block text-slate-800">{tech.name}</strong>
                          <span className={`text-[10px] font-bold uppercase ${tech.isActive ? 'text-emerald-500' : 'text-rose-500'}`}>{tech.isActive ? 'Active' : 'Locked'}</span>
                        </td>
                        {ponds.map(pond => {
                          const isAssigned = Number(pond.assigned_staff) === Number(tech.id);
                          const isDisabled = (Boolean(pond.assigned_staff) && !isAssigned) || !tech.isActive || Boolean(busyAssignmentKey);
                          return (
                            <td key={pond.pond_id} className="px-3 py-3">
                              <input type="checkbox" checked={isAssigned} disabled={isDisabled} onChange={(e) => handleAssignTech(pond, tech.id, e.target.checked)} className="w-4 h-4 cursor-pointer text-emerald-500 focus:ring-emerald-500 rounded disabled:opacity-30" />
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
             <div className="flex justify-end mt-4 shrink-0"><button onClick={() => setShowAssignmentModal(false)} className="px-6 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200">Đóng</button></div>
           </div>
         </div>
      )}

    </div>
  );
};

export default PondsPage;