import React, { useState, useEffect, useMemo } from 'react';
import PondChartCard from '../../components/charts/PondChartCard'; 
import { pondService, seasonService, userService, taskService, expenseService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { showToast } from '../../utils/toast';
import '../../styles/dashboard-page.css';

const normalizeUpper = (value) => String(value || '').trim().toUpperCase();
const formatCurrency = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);
const formatDateTime = (v) => (v ? new Date(v).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-');

const getComputedTaskStatus = (task) => {
    const baseStatus = normalizeUpper(task.status);
    if (['COMPLETED', 'CANCELLED'].includes(baseStatus)) return baseStatus;
    if (task.due_date && new Date(task.due_date) < new Date()) return 'OVERDUE';
    return baseStatus;
};

const DashboardPage = ({ roleLabel = 'Owner' }) => {
  const { user } = useAuth();
  const role = normalizeUpper(roleLabel);
  const isOwner = role === 'OWNER';
  const isTechnician = role === 'TECHNICIAN';
  const isWorker = role === 'WORKER';
  
  const [loading, setLoading] = useState(true);
  const [ponds, setPonds] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [expenses, setExpenses] = useState([]);
  
  // Dữ liệu mô phỏng cho AI Diagnostic (Thống kê số liệu phát hiện)
  const [aiPredictions] = useState([
    { disease_name: 'Đốm đen (BG)', count: 15, color: '#f59e0b' },
    { disease_name: 'Hoại tử gan tụy', count: 8, color: '#ef4444' },
    { disease_name: 'Đốm trắng (WSSV)', count: 3, color: '#8b5cf6' },
  ]);

  useEffect(() => {
    const fetchRealData = async () => {
      setLoading(true);
      try {
        if (isWorker) {
          const tasksRes = await taskService.getAllTasks().catch(() => ({ data: { data: [] } }));
          const myTasks = (tasksRes?.data?.data || []).filter(t => 
             t.assigned_workers_list && t.assigned_workers_list.some(w => String(w.worker_id) === String(user?.user_id))
          );
          setTasks(myTasks);
        } else {
          const [pondsRes, seasonsRes] = await Promise.all([
            pondService.getAllPonds().catch(() => ({ data: { data: [] } })),
            seasonService.getAllSeasons().catch(() => ({ data: { data: [] } }))
          ]);
          setPonds(pondsRes?.data?.data || []);
          setSeasons(seasonsRes?.data?.data || []);

          if (isOwner) {
            const [usersRes, expensesRes] = await Promise.all([
              userService.getAllUsers().catch(() => ({ data: { data: [] } })),
              expenseService.getAllExpenses().catch(() => ({ data: { data: [] } }))
            ]);
            setUsers(usersRes?.data?.data || []);
            setExpenses(expensesRes?.data?.data || []);
          } else if (isTechnician) {
            const tasksRes = await taskService.getAllTasks().catch(() => ({ data: { data: [] } }));
            setTasks(tasksRes?.data?.data || []);
          }
        }
      } catch (error) {
        showToast({ title: 'Lỗi tải dữ liệu Dashboard', type: 'error' });
      } finally {
        setLoading(false);
      }
    };

    fetchRealData();
  }, [role, isOwner, isTechnician, isWorker, user?.user_id]);

  // ================= METRICS =================
  const activeSeasonsCount = seasons.filter(s => ['DANG_NUOI', 'RUNNING', 'IN_PROGRESS'].includes(normalizeUpper(s.status))).length;
  const staffCount = users.filter(u => ['TECHNICIAN', 'WORKER'].includes(normalizeUpper(u.role || u.role_name))).length;
  
  const myPendingTasks = tasks.filter(t => ['PENDING', 'IN_PROGRESS'].includes(getComputedTaskStatus(t))).length;
  const myCompletedTasks = tasks.filter(t => getComputedTaskStatus(t) === 'COMPLETED').length;
  const myOverdueTasks = tasks.filter(t => getComputedTaskStatus(t) === 'OVERDUE').length;

  const totalDiseaseCases = aiPredictions.reduce((sum, item) => sum + item.count, 0);

  // ================= CHARTS =================
  const pondAllocationChart = useMemo(() => {
    let dangNuoi = 0, chuanBi = 0, caiTao = 0, tamNgung = 0;
    ponds.forEach(p => {
      const s = normalizeUpper(p.status);
      if (s === 'DANG_NUOI') dangNuoi++;
      else if (s === 'CHUAN_BI_NUOI') chuanBi++;
      else if (s === 'DANG_CAI_TAO') caiTao++;
      else tamNgung++;
    });
    return [
      { label: 'Đang nuôi', value: dangNuoi, color: '#22c55e' },
      { label: 'Chuẩn bị nuôi', value: chuanBi, color: '#a855f7' },
      { label: 'Đang cải tạo', value: caiTao, color: '#f59e0b' },
      { label: 'Tạm ngưng', value: tamNgung, color: '#0ea5e9' }
    ].filter(d => d.value > 0);
  }, [ponds]);

  const ownerCostChart = useMemo(() => {
    let dien = 0, luong = 0, baoTri = 0, vatTu = 0, khac = 0;
    expenses.forEach(e => {
      const amt = Number(e.amount || 0);
      const cat = normalizeUpper(e.category);
      if (cat === 'ELECTRICITY') dien += amt;
      else if (cat === 'LABOR') luong += amt;
      else if (cat === 'MAINTENANCE') baoTri += amt;
      else if (cat === 'MATERIAL') vatTu += amt;
      else khac += amt;
    });
    return [
      { label: 'Vật tư', value: vatTu, color: '#f59e0b' },
      { label: 'Điện năng', value: dien, color: '#0ea5e9' },
      { label: 'Nhân công', value: luong, color: '#10b981' },
      { label: 'Bảo trì', value: baoTri, color: '#8b5cf6' },
      { label: 'Khác', value: khac, color: '#64748b' }
    ].filter(d => d.value > 0);
  }, [expenses]);

  const taskChartData = useMemo(() => {
    return [
      { label: 'Chờ xử lý', value: tasks.filter(t => getComputedTaskStatus(t)==='PENDING').length, color: '#f59e0b' },
      { label: 'Đang làm', value: tasks.filter(t => getComputedTaskStatus(t)==='IN_PROGRESS').length, color: '#3b82f6' },
      { label: 'Hoàn thành', value: myCompletedTasks, color: '#22c55e' },
      { label: 'Quá hạn', value: myOverdueTasks, color: '#ef4444' }
    ];
  }, [tasks, myCompletedTasks, myOverdueTasks]);

  const aiDiseaseChart = aiPredictions.map(item => ({
      label: item.disease_name.split(' (')[0], 
      value: item.count,
      color: item.color
  }));

  // ================= TABLES =================
  const recentExpenses = [...expenses].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)).slice(0, 5);
  const recentTasks = [...tasks].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)).slice(0, 5);

  if (loading) {
    return (
      <div className="dashboard admin-page">
        <div className="flex-center" style={{ height: '100vh' }}><div className="spinner"></div></div>
      </div>
    );
  }

  return (
    <div className="dashboard admin-page">
      <div className="table-container table-panel">
        
        <div className="table-header">
          <div>
            <h1>Trung tâm Điều hành ({roleLabel})</h1>
            <p className="table-subtitle">Giám sát tổng quan hệ thống trại nuôi tôm thông minh</p>
          </div>
        </div>

        <div className="dashboard-grid_main">
          
          {/* ================= KHỐI KPI ================= */}
          <div className="stats-grid">
            {!isWorker ? (
              <>
                <div className="stats-card stats-card--primary">
                  <span className="stats-card-label">Tổng số ao nuôi</span>
                  <strong className="stats-card-value">{ponds.length}</strong>
                </div>
                <div className="stats-card stats-card--success">
                  <span className="stats-card-label">Vụ nuôi đang chạy</span>
                  <strong className="stats-card-value">{activeSeasonsCount}</strong>
                </div>
                {isOwner ? (
                  <div className="stats-card stats-card--warning">
                    <span className="stats-card-label">Nhân sự quản lý</span>
                    <strong className="stats-card-value">{staffCount}</strong>
                  </div>
                ) : (
                  <div className="stats-card stats-card--warning">
                    <span className="stats-card-label">Công việc tồn đọng</span>
                    <strong className="stats-card-value">{myPendingTasks}</strong>
                  </div>
                )}
                <div className="stats-card stats-card--danger">
                  <span className="stats-card-label">Ca bệnh AI phát hiện</span>
                  <strong className="stats-card-value">{totalDiseaseCases}</strong>
                </div>
              </>
            ) : (
              <>
                <div className="stats-card stats-card--warning">
                  <span className="stats-card-label">Công việc hôm nay</span>
                  <strong className="stats-card-value">{myPendingTasks}</strong>
                </div>
                <div className="stats-card stats-card--success">
                  <span className="stats-card-label">Đã hoàn thành</span>
                  <strong className="stats-card-value">{myCompletedTasks}</strong>
                </div>
                <div className="stats-card stats-card--danger">
                  <span className="stats-card-label">Bị trễ hạn</span>
                  <strong className="stats-card-value">{myOverdueTasks}</strong>
                </div>
              </>
            )}
          </div>

          {/* ================= KHỐI CHART ĐƯỢC PREFIX ĐỂ ĂN CSS ================= */}
          {!isWorker && (
            <div className="dashboard-charts_grid">
              <PondChartCard prefix="dashboard" title="Phân bổ ao nuôi" type="doughnut" data={pondAllocationChart} total={ponds.length} />
              
              {isOwner ? (
                <>
                  <PondChartCard prefix="dashboard" title="Cơ cấu chi phí (VNĐ)" type="doughnut" data={ownerCostChart} />
                  <PondChartCard prefix="dashboard" title="Thống kê dịch bệnh (AI)" type="bar" data={aiDiseaseChart} />
                </>
              ) : (
                <>
                  <PondChartCard prefix="dashboard" title="Tiến độ công việc" type="doughnut" data={taskChartData} />
                  <PondChartCard prefix="dashboard" title="Thống kê dịch bệnh (AI)" type="bar" data={aiDiseaseChart} />
                </>
              )}
            </div>
          )}

          {/* ================= KHỐI DƯỚI ================= */}
          <div className="dashboard-bottom_grid">
            
            {/* Cột trái: Bảng dữ liệu chuẩn hệ thống */}
            <div className="dashboard_chart-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                <h4 style={{ margin: 0, fontSize: '1.05rem', color: '#0f172a', fontWeight: '700' }}>
                  {isOwner ? '💸 Nhật ký biến động chi phí' : '📋 Công việc thực địa mới nhất'}
                </h4>
              </div>
              <div className="table-wrapper" style={{ margin: 0, border: 'none', boxShadow: 'none', borderRadius: 0 }}>
                <table className="table-base">
                  <thead>
                    {isOwner ? (
                      <tr>
                        <th>Hạng mục</th>
                        <th>Ngày hạch toán</th>
                        <th>Số tiền (VNĐ)</th>
                      </tr>
                    ) : (
                      <tr>
                        <th>Công việc</th>
                        <th>Khu vực (Ao)</th>
                        <th>Trạng thái / Hạn chót</th>
                      </tr>
                    )}
                  </thead>
                  <tbody>
                    {isOwner ? (
                      recentExpenses.length > 0 ? recentExpenses.map((exp, idx) => (
                        <tr key={idx}>
                          <td><strong>{exp.name}</strong></td>
                          <td>{formatDateTime(exp.expense_date || exp.created_at)}</td>
                          <td style={{ color: '#ef4444', fontWeight: 'bold' }}>-{formatCurrency(exp.amount)}</td>
                        </tr>
                      )) : <tr><td colSpan="3" style={{ textAlign: 'center', padding: '20px' }}>Chưa có phát sinh chi phí.</td></tr>
                    ) : (
                      recentTasks.length > 0 ? recentTasks.map((task, idx) => {
                        const isOverdue = getComputedTaskStatus(task) === 'OVERDUE';
                        return (
                        <tr key={idx}>
                          <td><strong>{task.task_title || task.type_name}</strong></td>
                          <td>{task.pond_name || '-'}</td>
                          <td style={{ color: isOverdue ? '#ef4444' : '#10b981', fontWeight: isOverdue ? 'bold' : 'normal' }}>
                             {isOverdue ? 'Quá hạn' : formatDateTime(task.due_date)}
                          </td>
                        </tr>
                      )}) : <tr><td colSpan="3" style={{ textAlign: 'center', padding: '20px' }}>Chưa có công việc nào.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Cột phải: Tổng quan AI */}
            <div className="dashboard_chart-card">
              {!isWorker ? (
                <>
                  <h4 style={{ marginBottom: '4px' }}>🤖 Tổng quan Chẩn đoán AI</h4>
                  <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '16px' }}>
                    Tần suất dịch bệnh phát hiện qua hình ảnh tải lên.
                  </p>
                  <ul className="dashboard-ai_list">
                    {aiPredictions.map((pred, idx) => (
                      <li key={idx} className="dashboard-ai_item" style={{ borderLeftColor: pred.color }}>
                        <span className="dashboard-ai_item-name">{pred.disease_name}</span>
                        <span className="dashboard-ai_item-count" style={{ color: pred.color, backgroundColor: `${pred.color}15` }}>
                          {pred.count} ca
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <>
                  <h4 style={{ marginBottom: '16px' }}>🚨 Việc cần làm ngay</h4>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {tasks.filter(t => getComputedTaskStatus(t) === 'OVERDUE').map((t, idx) => (
                      <div key={idx} className="dashboard-worker_task dashboard-worker_task--overdue">
                        <div>
                          <strong>{t.task_title}</strong>
                          <div style={{ fontSize: '0.85rem', color: '#ef4444' }}>Trễ hạn: {formatDateTime(t.due_date)}</div>
                        </div>
                      </div>
                    ))}
                    {myOverdueTasks === 0 && (
                      <div style={{ textAlign: 'center', color: '#10b981', padding: '20px' }}>
                        <div style={{ fontSize: '2rem', marginBottom: '10px' }}>🎉</div>
                        Tuyệt vời! Không có công việc trễ hạn.
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

          </div>

        </div>
      </div>
    </div>
  );
};

export default DashboardPage;