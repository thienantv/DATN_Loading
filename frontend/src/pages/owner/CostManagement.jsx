import React, { useEffect, useMemo, useState } from 'react';
import { expenseService, pondService, seasonService } from '../../services/api';
import { showToast } from '../../utils/toast';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';

const GENERAL_CATEGORY_OPTIONS = [
  { value: 'ALL', label: 'Tất cả hạng mục chung' },
  { value: 'ELECTRICITY', label: 'Điện năng (Bơm, Quạt)' },
  { value: 'LABOR', label: 'Nhân công (Lương, Thưởng)' },
  { value: 'MAINTENANCE', label: 'Bảo trì, Sửa chữa' },
  { value: 'OTHER', label: 'Chi phí khác' },
];

const FORM_CATEGORY_OPTIONS = [
  { value: 'ELECTRICITY', label: 'Điện năng (Bơm, Quạt nước)' },
  { value: 'LABOR', label: 'Nhân công (Lương, Thưởng)' },
  { value: 'MAINTENANCE', label: 'Bảo trì, Sửa chữa thiết bị' },
  { value: 'OTHER', label: 'Chi phí phát sinh khác' }
];

const CHART_COLORS = ['#10b981', '#0ea5e9', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6'];
const DEFAULT_PAGE_SIZE = 10;

const emptyCreateForm = {
  category: 'ELECTRICITY',
  amount: '',
  expense_date: new Date().toISOString().split('T')[0],
  note: ''
};

const normalizeUpper = (value) => String(value || '').trim().toUpperCase();
const normalizeText = (value) => String(value || '').trim().toLowerCase();
const formatCurrency = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);

const getCategoryLabel = (category) => {
  switch (normalizeUpper(category)) {
    case 'MATERIAL': return 'Vật tư tiêu hao';
    case 'ELECTRICITY': return 'Điện năng';
    case 'LABOR': return 'Nhân công';
    case 'MAINTENANCE': return 'Bảo trì, sửa chữa';
    default: return 'Chi phí khác';
  }
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
        {payload[0].payload.name}: <span className="text-emerald-400">{formatCurrency(payload[0].value)}</span>
      </div>
    );
  }
  return null;
};

// ============================================================================
// COMPONENT CHÍNH
// ============================================================================
const CostManagement = () => {
  const [expenses, setExpenses] = useState([]);
  const [ponds, setPonds] = useState([]);
  const [seasons, setSeasons] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [activeTab, setActiveTab] = useState('SPECIFIC');
  const [searchTerm, setSearchTerm] = useState('');
  const [monthFilter, setMonthFilter] = useState('ALL');
  const [seasonFilter, setSeasonFilter] = useState('ALL');
  const [pondFilter, setPondFilter] = useState('ALL');
  const [productCategoryFilter, setProductCategoryFilter] = useState('ALL');
  const [generalCategoryFilter, setGeneralCategoryFilter] = useState('ALL');
  
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [currentPage, setCurrentPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreateForm);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true); // Kích hoạt Local Loading
      const [expenseRes, pondRes, seasonRes] = await Promise.all([
        expenseService.getAllExpenses(),
        pondService.getAllPonds(),
        seasonService.getAllSeasons()
      ]);
      setExpenses(expenseRes?.data?.data || []);
      setPonds(pondRes?.data?.data || []);
      setSeasons(seasonRes?.data?.data || []);
    } catch (err) {
      showToast({ title: 'Không tải được dữ liệu chi phí hệ thống', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const availableMonths = useMemo(() => {
    const monthsSet = new Set();
    expenses.forEach(e => { if (e.expense_date) monthsSet.add(e.expense_date.substring(0, 7)); });
    return Array.from(monthsSet).sort().reverse();
  }, [expenses]);

  const availableProductCategories = useMemo(() => {
    const catMap = new Map();
    expenses.forEach(e => { if (e.product_category_id && e.product_category_name) catMap.set(String(e.product_category_id), e.product_category_name); });
    return Array.from(catMap.entries()).map(([id, name]) => ({ id, name }));
  }, [expenses]);

  const filteredExpenses = useMemo(() => {
    const normalizedSearch = normalizeText(searchTerm);
    return expenses.filter((e) => {
      const isMaterial = normalizeUpper(e.category) === 'MATERIAL';
      const matchSearch = !normalizedSearch || normalizeText(e.note).includes(normalizedSearch) || normalizeText(e.name).includes(normalizedSearch);
      const matchMonth = monthFilter === 'ALL' || (e.expense_date && e.expense_date.startsWith(monthFilter));

      if (activeTab === 'SPECIFIC') {
        if (!isMaterial) return false;
        const matchPond = pondFilter === 'ALL' || String(e.pond_id) === String(pondFilter);
        const matchSeason = seasonFilter === 'ALL' || String(e.season_id) === String(seasonFilter);
        const matchProdCategory = productCategoryFilter === 'ALL' || String(e.product_category_id) === String(productCategoryFilter);
        return matchSearch && matchMonth && matchPond && matchSeason && matchProdCategory;
      } else {
        if (isMaterial) return false;
        const matchGenCategory = generalCategoryFilter === 'ALL' || normalizeUpper(e.category) === generalCategoryFilter;
        return matchSearch && matchMonth && matchGenCategory;
      }
    }).sort((a, b) => new Date(b.expense_date) - new Date(a.expense_date));
  }, [expenses, activeTab, searchTerm, monthFilter, seasonFilter, pondFilter, productCategoryFilter, generalCategoryFilter]);

  const summary = useMemo(() => {
    const initial = { total: 0, material: 0, electricity: 0, labor: 0, maintenance: 0, other: 0 };
    filteredExpenses.forEach(e => {
      const amt = Number(e.amount || 0);
      initial.total += amt;
      const cat = normalizeUpper(e.category);
      if (cat === 'MATERIAL') initial.material += amt;
      else if (cat === 'ELECTRICITY') initial.electricity += amt;
      else if (cat === 'LABOR') initial.labor += amt;
      else if (cat === 'MAINTENANCE') initial.maintenance += amt;
      else initial.other += amt;
    });
    return initial;
  }, [filteredExpenses]);

  const chartData = useMemo(() => {
    if (activeTab === 'SPECIFIC') {
      return [{ name: 'Vật tư tiêu hao', value: summary.material }].filter(d => d.value > 0);
    } else {
      return [
        { name: 'Điện năng', value: summary.electricity },
        { name: 'Nhân công', value: summary.labor },
        { name: 'Bảo trì, sửa chữa', value: summary.maintenance },
        { name: 'Chi phí khác', value: summary.other },
      ].filter(d => d.value > 0);
    }
  }, [summary, activeTab]);

  const totalPages = Math.max(1, Math.ceil(filteredExpenses.length / pageSize));
  const safePage = Math.min(Math.max(currentPage, 1), totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredExpenses.length);
  const paginatedExpenses = filteredExpenses.slice(startIndex, endIndex);

  const handleTabChange = (tabName) => {
    setActiveTab(tabName);
    setSearchTerm(''); setMonthFilter('ALL'); setSeasonFilter('ALL'); setPondFilter('ALL');
    setProductCategoryFilter('ALL'); setGeneralCategoryFilter('ALL'); setCurrentPage(1);
  };

  const handleCreateSubmit = async (event) => {
    event.preventDefault();
    if (!createForm.amount || Number(createForm.amount) <= 0) return showToast({ title: 'Số tiền chi trả phải lớn hơn 0', type: 'error' });

    try {
      setSaving(true);
      await expenseService.addExpense({
        category: createForm.category,
        amount: Number(createForm.amount),
        expense_date: createForm.expense_date,
        note: createForm.note.trim()
      });
      showToast({ title: 'Ghi nhận chi phí thành công', type: 'success' });
      setShowCreateModal(false);
      setCreateForm(emptyCreateForm);
      fetchInitialData();
    } catch (err) {
      showToast({ title: 'Lỗi không thể ghi nhận chi phí', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // 🌟 LOADING TOÀN TRANG CHỈ HIỆN KHI CHƯA CÓ DATA
  if (loading && expenses.length === 0) {
    return <div className="flex items-center justify-center h-screen"><div className="w-12 h-12 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="max-w-[1600px] mx-auto animate-in fade-in duration-300">
      
      {/* HEADER */}
      <div className="relative bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 rounded-[24px] p-6 md:p-8 mb-6 border border-emerald-100/60 shadow-sm overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/3 w-96 h-96 bg-emerald-200/30 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-64 h-64 bg-cyan-200/30 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10">
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight">Quản lý Chi phí</h1>
          <p className="text-slate-500 font-medium mt-1.5">Kiểm soát dòng tiền sản xuất (vật tư) và vận hành chung của trại</p>
        </div>
        
        <div className="relative z-10 w-full md:w-auto">
          <button onClick={() => setShowCreateModal(true)} className="w-full md:w-auto px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2">
            <span className="text-xl leading-none">+</span> Ghi nhận Chi phí chung
          </button>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-5 mb-6">
        <div className="bg-white p-5 rounded-[20px] border border-slate-100 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start mb-2"><span className="text-slate-500 font-bold text-sm">TỔNG MỤC ĐANG LỌC</span><div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">💰</div></div>
          <strong className="block text-2xl lg:text-3xl font-black text-slate-800">{formatCurrency(summary.total)}</strong>
          <div className="mt-2"><Sparkline color="#94a3b8" /></div>
        </div>
        
        {activeTab === 'SPECIFIC' ? (
          <div className="bg-white p-5 rounded-[20px] border border-slate-100 shadow-sm relative overflow-hidden col-span-2 sm:col-span-1">
            <div className="flex justify-between items-start mb-2"><span className="text-slate-500 font-bold text-sm">Tổng Vật tư tiêu hao</span><div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-500">📦</div></div>
            <strong className="block text-2xl lg:text-3xl font-black text-amber-600">{formatCurrency(summary.material)}</strong>
            <div className="mt-2"><Sparkline color="#f59e0b" /></div>
          </div>
        ) : (
          <>
            <div className="bg-white p-5 rounded-[20px] border border-slate-100 shadow-sm relative overflow-hidden">
              <div className="flex justify-between items-start mb-2"><span className="text-slate-500 font-bold text-sm">Tổng tiền Điện</span><div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center text-rose-500">⚡</div></div>
              <strong className="block text-2xl lg:text-3xl font-black text-rose-600">{formatCurrency(summary.electricity)}</strong>
              <div className="mt-2"><Sparkline color="#f43f5e" /></div>
            </div>
            <div className="bg-white p-5 rounded-[20px] border border-slate-100 shadow-sm relative overflow-hidden col-span-2 sm:col-span-1">
              <div className="flex justify-between items-start mb-2"><span className="text-slate-500 font-bold text-sm">Tổng Lương nhân công</span><div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500">👷</div></div>
              <strong className="block text-2xl lg:text-3xl font-black text-emerald-600">{formatCurrency(summary.labor)}</strong>
              <div className="mt-2"><Sparkline color="#10b981" /></div>
            </div>
          </>
        )}
      </div>

      {/* TABS */}
      <div className="flex items-center gap-3 overflow-x-auto pb-4 mb-2 scrollbar-hide">
        <button 
          onClick={() => handleTabChange('SPECIFIC')} 
          className={`whitespace-nowrap px-6 py-2.5 rounded-full text-sm font-bold transition-all shadow-sm ${activeTab === 'SPECIFIC' ? 'bg-slate-800 text-white shadow-md scale-105' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}
        >
          🏞️ Chi phí Sản xuất (Theo ao / vụ)
        </button>
        <button 
          onClick={() => handleTabChange('GENERAL')} 
          className={`whitespace-nowrap px-6 py-2.5 rounded-full text-sm font-bold transition-all shadow-sm ${activeTab === 'GENERAL' ? 'bg-slate-800 text-white shadow-md scale-105' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}
        >
          ⚙️ Chi phí Vận hành chung
        </button>
      </div>

      {/* THỐNG KÊ BIỂU ĐỒ TRÒN & BẢNG BÊN DƯỚI */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        
        {/* CHART WITH LOCAL LOADING */}
        <div className="relative bg-white p-5 md:p-6 rounded-[24px] border border-slate-100 shadow-sm flex flex-col h-[320px] overflow-hidden col-span-1">
           {loading && <div className="absolute inset-0 z-10 bg-white/40 backdrop-blur-[2px] transition-all"></div>}
           <h3 className="font-extrabold text-slate-800 text-lg mb-4 relative z-0">Cơ cấu phân bổ dòng tiền</h3>
           <div className="flex-1 flex flex-col items-center justify-center relative z-0">
              {chartData.length > 0 ? (
                <>
                  <div className="w-full h-[150px] mb-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={chartData} innerRadius="55%" outerRadius="90%" paddingAngle={4} dataKey="value" stroke="none">
                          {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                        </Pie>
                        <RechartsTooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="w-full overflow-y-auto max-h-[90px] scrollbar-hide flex flex-col gap-1.5 px-2">
                    {chartData.map((item, idx) => (
                      <div key={item.name} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5 overflow-hidden mr-2">
                            <div className="w-2.5 h-2.5 rounded-full shadow-sm shrink-0" style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}></div>
                            <span className="font-bold text-slate-500 truncate">{item.name}</span>
                          </div>
                          <span className="font-black text-slate-800 shrink-0">{formatCurrency(item.value)}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                   <span className="text-3xl mb-2">📊</span>
                   <span className="text-sm font-medium">Chưa có dữ liệu</span>
                </div>
              )}
           </div>
        </div>

        {/* TABLE SECTION WITH LOCAL LOADING */}
        <div className="relative bg-white rounded-[24px] shadow-sm border border-slate-200 overflow-hidden col-span-1 lg:col-span-2 flex flex-col h-[600px] lg:h-auto">
          
          {loading && (
            <div className="absolute inset-0 z-20 bg-white/50 backdrop-blur-sm flex items-center justify-center transition-all">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin mb-3"></div>
                <span className="font-bold text-slate-600">Đang tải dữ liệu...</span>
              </div>
            </div>
          )}

          {/* Table Toolbar */}
          <div className="p-4 border-b border-slate-100 flex flex-wrap items-center gap-3 bg-slate-50/30">
            <div className="relative flex-1 min-w-[200px]">
              <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input type="text" placeholder="Tìm nội dung, tên..." value={searchTerm} onChange={(e) => {setSearchTerm(e.target.value); setCurrentPage(1);}} className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:ring-2 focus:ring-emerald-100 outline-none transition-all shadow-sm" />
            </div>
            
            <select value={monthFilter} onChange={(e) => {setMonthFilter(e.target.value); setCurrentPage(1);}} className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 outline-none focus:border-emerald-500 shadow-sm cursor-pointer min-w-[140px]">
              <option value="ALL">Tất cả các tháng</option>
              {availableMonths.map(m => {
                const [year, month] = m.split('-');
                return <option key={m} value={m}>Tháng {month}/{year}</option>
              })}
            </select>

            {activeTab === 'SPECIFIC' && (
              <>
                <select value={seasonFilter} onChange={(e) => {setSeasonFilter(e.target.value); setCurrentPage(1);}} className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 outline-none focus:border-emerald-500 shadow-sm cursor-pointer min-w-[140px]">
                  <option value="ALL">Tất cả mùa vụ</option>
                  {seasons.map(s => <option key={s.season_id} value={s.season_id}>{s.season_name}</option>)}
                </select>

                <select value={pondFilter} onChange={(e) => {setPondFilter(e.target.value); setCurrentPage(1);}} className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 outline-none focus:border-emerald-500 shadow-sm cursor-pointer min-w-[140px]">
                  <option value="ALL">Tất cả ao nuôi</option>
                  {ponds.map(p => <option key={p.pond_id} value={p.pond_id}>{p.pond_name}</option>)}
                </select>

                <select value={productCategoryFilter} onChange={(e) => {setProductCategoryFilter(e.target.value); setCurrentPage(1);}} className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 outline-none focus:border-emerald-500 shadow-sm cursor-pointer min-w-[150px]">
                  <option value="ALL">Tất cả danh mục vật tư</option>
                  {availableProductCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                </select>
              </>
            )}

            {activeTab === 'GENERAL' && (
              <select value={generalCategoryFilter} onChange={(e) => {setGeneralCategoryFilter(e.target.value); setCurrentPage(1);}} className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 outline-none focus:border-emerald-500 shadow-sm cursor-pointer min-w-[180px]">
                {GENERAL_CATEGORY_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            )}
          </div>

          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Ngày ghi nhận</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Hạng mục / Vật tư</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Nguồn gốc</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Số tiền chi</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Diễn giải</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {paginatedExpenses.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-slate-500 font-medium text-base">Không có dữ liệu dòng tiền.</td></tr>
                ) : paginatedExpenses.map((e, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-4 py-3 text-sm font-bold text-slate-700">
                      {new Date(e.expense_date).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-4 py-3">
                      <strong className="block text-slate-800 text-sm">{e.name}</strong>
                      <span className="text-xs text-slate-500 mt-0.5">{e.product_category_name ? `Nhóm: ${e.product_category_name}` : getCategoryLabel(e.category)}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${activeTab === 'SPECIFIC' ? 'bg-sky-100 text-sky-700 border border-sky-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                        {e.source}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-black text-rose-600 text-base">
                      -{formatCurrency(e.amount)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 max-w-[200px] truncate" title={e.note}>
                      {e.note || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-slate-600 font-medium bg-white shrink-0">
            <div className="flex items-center gap-3">
              <span>Hiển thị</span>
              <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }} className="border border-slate-200 rounded-lg px-2 py-1 outline-none bg-slate-50 focus:border-emerald-500">
                {[5, 10, 20, 50].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <span>({filteredExpenses.length > 0 ? startIndex + 1 : 0} - {endIndex} / {filteredExpenses.length})</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setCurrentPage(p => p - 1)} disabled={safePage <= 1} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors font-bold shadow-sm">Trước</button>
              <div className="flex items-center justify-center px-3 py-1.5 bg-emerald-50 text-emerald-700 font-bold rounded-lg border border-emerald-100">{safePage} / {totalPages}</div>
              <button onClick={() => setCurrentPage(p => p + 1)} disabled={safePage >= totalPages} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors font-bold shadow-sm">Sau</button>
            </div>
          </div>

        </div>
      </div>

      {/* ================= MODAL TẠO CHI PHÍ CHUNG (SCROLLABLE) ================= */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 sm:p-6" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white max-w-lg w-full p-5 md:p-8 rounded-[24px] shadow-2xl flex flex-col max-h-[95vh] sm:max-h-[90vh] animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6 shrink-0">
              <h2 className="text-xl md:text-2xl font-extrabold text-slate-800">Ghi nhận Chi phí chung</h2>
              <button type="button" onClick={() => setShowCreateModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 text-lg font-bold transition-colors">&times;</button>
            </div>
            
            <form onSubmit={handleCreateSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex flex-col gap-4 flex-1 overflow-y-auto pr-2 pb-2 scrollbar-hide">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-bold text-slate-700">Loại chi phí vận hành <span className="text-rose-500">*</span></label>
                  <select value={createForm.category} onChange={(e) => setCreateForm({...createForm, category: e.target.value})} className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 outline-none font-bold bg-white shadow-sm text-emerald-700">
                    {FORM_CATEGORY_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </div>
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-bold text-slate-700">Số tiền chi trả (VNĐ) <span className="text-rose-500">*</span></label>
                  <input type="number" min="1000" step="1000" placeholder="Ví dụ: 3500000" value={createForm.amount} onChange={(e) => setCreateForm({...createForm, amount: e.target.value})} required className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 outline-none font-medium shadow-sm" />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-bold text-slate-700">Ngày thanh toán / Chi trả <span className="text-rose-500">*</span></label>
                  <input type="date" value={createForm.expense_date} onChange={(e) => setCreateForm({...createForm, expense_date: e.target.value})} required className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 outline-none font-medium shadow-sm" />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-bold text-slate-700">Nội dung chi tiết / Diễn giải</label>
                  <textarea rows="3" placeholder="Ví dụ: Thanh toán hóa đơn điện tháng..." value={createForm.note} onChange={(e) => setCreateForm({...createForm, note: e.target.value})} className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 outline-none font-medium resize-none shadow-sm" />
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100 shrink-0">
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-6 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors">Hủy</button>
                <button type="submit" disabled={saving} className="px-8 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-50 shadow-md shadow-emerald-500/20 active:scale-95 transition-all">{saving ? 'Đang lưu...' : 'Lưu chi phí'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default CostManagement;