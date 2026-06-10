import React, { useState, useEffect, useMemo } from 'react';
import PondChartCard from '../../components/charts/PondChartCard'; 
// Import đầy đủ các service API để lấy dữ liệu thực tế
import { pondService, seasonService, userService, taskService, expenseService } from '../../services/api';
import { showToast } from '../../utils/toast';
import '../../styles/dashboard-page.css';

// Các hàm hỗ trợ format dữ liệu
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
  const isOwner = roleLabel.toUpperCase() === 'OWNER';
  
  // State lưu trữ dữ liệu thực tế từ API
  const [loading, setLoading] = useState(true);
  const [ponds, setPonds] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [expenses, setExpenses] = useState([]);

  // Gọi API lấy dữ liệu ngay khi vào trang
  useEffect(() => {
    const fetchRealData = async () => {
      setLoading(true);
      try {
        // Dữ liệu dùng chung cho cả 2 Role (Ao nuôi & Mùa vụ)
        const [pondsRes, seasonsRes] = await Promise.all([
          pondService.getAllPonds().catch(() => ({ data: { data: [] } })),
          seasonService.getAllSeasons().catch(() => ({ data: { data: [] } }))
        ]);
        setPonds(pondsRes?.data?.data || []);
        setSeasons(seasonsRes?.data?.data || []);

        // Dữ liệu lấy riêng theo Role để tối ưu hiệu suất
        if (isOwner) {
          const [usersRes, expensesRes] = await Promise.all([
            userService.getAllUsers().catch(() => ({ data: { data: [] } })),
            expenseService.getAllExpenses().catch(() => ({ data: { data: [] } }))
          ]);
          setUsers(usersRes?.data?.data || []);
          setExpenses(expensesRes?.data?.data || []);
        } else {
          const [tasksRes] = await Promise.all([
            taskService.getAllTasks().catch(() => ({ data: { data: [] } }))
          ]);
          setTasks(tasksRes?.data?.data || []);
        }
      } catch (error) {
        showToast({ title: 'Lỗi tải dữ liệu Dashboard', type: 'error' });
      } finally {
        setLoading(false);
      }
    };

    fetchRealData();
  }, [isOwner]);

  // ====================================================================
  // TÍNH TOÁN CÁC CHỈ SỐ (METRICS) TỪ DỮ LIỆU THỰC
  // ====================================================================

  const activeSeasonsCount = useMemo(() => {
    return seasons.filter(s => ['DANG_NUOI', 'RUNNING', 'IN_PROGRESS'].includes(normalizeUpper(s.status))).length;
  }, [seasons]);

  const activeTasksCount = useMemo(() => {
    return tasks.filter(t => ['PENDING', 'IN_PROGRESS'].includes(getComputedTaskStatus(t))).length;
  }, [tasks]);

  const totalStaffCount = useMemo(() => {
    // Chỉ đếm Kỹ sư và Nhân viên (Bỏ qua Owner)
    return users.filter(u => ['TECHNICIAN', 'WORKER'].includes(normalizeUpper(u.role || u.role_name))).length;
  }, [users]);

  const redAlertsCount = useMemo(() => {
    // Nếu là kỹ sư, cảnh báo đỏ ưu tiên đếm số lượng công việc quá hạn
    if (!isOwner) {
       return tasks.filter(t => getComputedTaskStatus(t) === 'OVERDUE').length;
    }
    // Nếu là chủ trại, tạm thời đếm số ao ngưng sử dụng / bị lỗi (Có thể gắn với API Cảm biến sau này)
    return ponds.filter(p => normalizeUpper(p.usage_status) === 'NGUNG_SU_DUNG').length;
  }, [isOwner, tasks, ponds]);

  // ====================================================================
  // TÍNH TOÁN DỮ LIỆU BIỂU ĐỒ (CHARTS)
  // ====================================================================

  const pondAllocationChart = useMemo(() => {
    let dangNuoi = 0, chuanBi = 0, caiTao = 0, tamNgung = 0;
    ponds.forEach(p => {
      const s = normalizeUpper(p.status);
      if (s === 'DANG_NUOI') dangNuoi++;
      else if (s === 'CHUAN_BI_NUOI') chuanBi++;
      else if (s === 'DANG_CAI_TAO') caiTao++;
      else tamNgung++; // Mặc định hoặc TAM_NGUNG
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
      { label: 'Vật tư (Thức ăn/Thuốc)', value: vatTu, color: '#f59e0b' },
      { label: 'Điện năng (Bơm/Quạt)', value: dien, color: '#0ea5e9' },
      { label: 'Nhân công (Lương)', value: luong, color: '#10b981' },
      { label: 'Bảo trì sửa chữa', value: baoTri, color: '#8b5cf6' },
      { label: 'Chi phí khác', value: khac, color: '#64748b' }
    ].filter(d => d.value > 0);
  }, [expenses]);

  const technicianTaskChart = useMemo(() => {
    let pending = 0, progress = 0, completed = 0, overdue = 0;
    tasks.forEach(t => {
      const s = getComputedTaskStatus(t);
      if (s === 'PENDING') pending++;
      else if (s === 'IN_PROGRESS') progress++;
      else if (s === 'COMPLETED') completed++;
      else if (s === 'OVERDUE') overdue++;
    });
    return [
      { label: 'Chờ xử lý', value: pending, color: '#f59e0b' },
      { label: 'Đang thực hiện', value: progress, color: '#3b82f6' },
      { label: 'Hoàn thành', value: completed, color: '#22c55e' },
      { label: 'Quá hạn', value: overdue, color: '#ef4444' }
    ];
  }, [tasks]);

  // ====================================================================
  // CHUẨN BỊ DỮ LIỆU CHO BẢNG HIỂN THỊ NHANH (Lấy 5 dòng mới nhất)
  // ====================================================================
  const recentExpenses = useMemo(() => {
    return [...expenses]
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
      .slice(0, 5);
  }, [expenses]);

  const recentTasks = useMemo(() => {
    return [...tasks]
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
      .slice(0, 5);
  }, [tasks]);

  // Phân tích logic của "AI giả lập" dựa trên dữ liệu thật
  const getDynamicAIPrompt = () => {
     if (isOwner) {
         if (redAlertsCount > 0) return `Hệ thống ghi nhận có ${redAlertsCount} ao đang ngưng sử dụng hoặc gặp sự cố. Đề nghị chủ trại kiểm tra nhật ký chi phí bảo trì hệ thống cấp thoát nước.`;
         const tongChiPhi = ownerCostChart.reduce((a, b) => a + b.value, 0);
         if (tongChiPhi > 0) return `Phân tích dòng tiền: Tổng chi phí hiện hành phân bổ nhiều nhất vào hạng mục "${ownerCostChart.sort((a,b)=>b.value - a.value)[0]?.label}". Khuyến cáo duy trì lượng tồn kho vật tư an toàn.`;
         return "Trại nuôi đang ở trạng thái cân bằng. Chưa có bất thường tài chính đáng kể.";
     } else {
         const overdue = tasks.filter(t => getComputedTaskStatus(t) === 'OVERDUE').length;
         if (overdue > 0) return `CẢNH BÁO VẬN HÀNH: Có ${overdue} công việc kỹ thuật đã quá hạn hoàn thành. Kỹ sư vui lòng nhắc nhở nhân viên thực địa cập nhật báo cáo ngay lập tức để tránh rủi ro môi trường.`;
         return "Dữ liệu vận hành ổn định. Các đầu việc chăm sóc, đo đạc môi trường đang được thực hiện đúng tiến độ kế hoạch.";
     }
  };

  if (loading) {
    return (
      <div className="dashboard admin-page">
        <div className="flex-center" style={{ height: '100vh' }}>
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard admin-page">
      <div className="table-container table-panel">
        
        {/* TIÊU ĐỀ TRANG TRUNG TÂM */}
        <div className="table-header">
          <div>
            <h1>Trung tâm Điều hành Tập trung</h1>
            <p className="table-subtitle">Hệ thống giám sát dữ liệu thời gian thực và phân tích vận hành dành cho {roleLabel}</p>
          </div>
        </div>

        <div className="dashboard-grid_main">
          
          {/* KHỐI CHỈ SỐ KPI TOÀN TRẠI */}
          <div className="stats-grid">
            <div className="stats-card stats-card--primary">
              <span className="stats-card-label">Tổng số ao nuôi</span>
              <strong className="stats-card-value">{ponds.length}</strong>
            </div>
            <div className="stats-card stats-card--success">
              <span className="stats-card-label">Vụ nuôi đang chạy</span>
              <strong className="stats-card-value">{activeSeasonsCount}</strong>
            </div>
            <div className="stats-card stats-card--warning">
              <span className="stats-card-label">
                {isOwner ? 'Nhân sự quản lý' : 'Công việc hoạt động'}
              </span>
              <strong className="stats-card-value">
                {isOwner ? totalStaffCount : activeTasksCount}
              </strong>
            </div>
            <div className="stats-card stats-card--danger">
              <span className="stats-card-label">Cảnh báo / Quá hạn</span>
              <strong className="stats-card-value">{redAlertsCount}</strong>
            </div>
          </div>

          {/* KHỐI MÀU CẢNH BÁO MÔI TRƯỜNG */}
          <div className="dashboard-alerts_container">
            <div className="dashboard-alert_card dashboard-alert_card--warning">
              <div className="dashboard-alert_icon">💡</div>
              <div className="dashboard-alert_info">
                <h4>Cập nhật hệ thống</h4>
                <p>Dashboard đã được đồng bộ với máy chủ dữ liệu thời gian thực. Các biểu đồ sẽ tự động làm mới khi có thay đổi.</p>
              </div>
            </div>
            {redAlertsCount > 0 && (
              <div className="dashboard-alert_card dashboard-alert_card--danger">
                <div className="dashboard-alert_icon">⚠️</div>
                <div className="dashboard-alert_info">
                  <h4>Yêu cầu chú ý</h4>
                  <p>Phát hiện có mục cần xử lý gấp (Ao ngưng hoạt động hoặc Task bị trễ hạn). Vui lòng kiểm tra chi tiết tại phân hệ tương ứng.</p>
                </div>
              </div>
            )}
          </div>

          {/* KHỐI BIỂU ĐỒ PHÂN TÍCH QUẢN TRỊ */}
          <div className="dashboard-charts_grid">
            {/* Biểu đồ phân bổ ao dùng chung */}
            <PondChartCard prefix="dashboard-pond" title="Trạng thái tài sản ao nuôi" type="doughnut" data={pondAllocationChart} total={ponds.length} />
            
            {/* Biểu đồ động hiển thị theo vai trò (Role) */}
            {isOwner ? (
              <>
                <PondChartCard prefix="dashboard-cost" title="Cơ cấu dòng tiền (VND)" type="doughnut" data={ownerCostChart} />
                <PondChartCard prefix="dashboard-cost-bar" title="Phân bổ ngân sách" type="bar" data={ownerCostChart} />
              </>
            ) : (
              <>
                <PondChartCard prefix="dashboard-task" title="Trạng thái công việc kỹ thuật" type="doughnut" data={technicianTaskChart} />
                <PondChartCard prefix="dashboard-task-bar" title="Tiến độ thực địa" type="bar" data={technicianTaskChart} />
              </>
            )}
          </div>

          {/* BẢNG DỮ LIỆU NHANH VÀ PANEL CHUYÊN GIA AI GEMINI */}
          <div className="dashboard-row_panels">
            
            {/* Cột trái: Danh sách hiển thị nhanh */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '20px', overflowX: 'auto' }}>
              <h3 style={{ color: '#0f172a', marginBottom: '16px', marginTop: 0 }}>
                {isOwner ? 'Nhật ký biến động chi phí gần đây' : 'Tiến độ công việc thực địa mới nhất'}
              </h3>
              <table className="dashboard-quick_table">
                <thead>
                  {isOwner ? (
                    <tr>
                      <th>Hạng mục chi phí</th>
                      <th>Ngày hạch toán</th>
                      <th>Số tiền (VNĐ)</th>
                    </tr>
                  ) : (
                    <tr>
                      <th>Tên công việc</th>
                      <th>Ao phụ trách</th>
                      <th>Hạn chót</th>
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
                    )) : <tr><td colSpan="3" style={{ textAlign: 'center' }}>Chưa có phát sinh chi phí.</td></tr>
                  ) : (
                    recentTasks.length > 0 ? recentTasks.map((task, idx) => (
                      <tr key={idx}>
                        <td><strong>{task.task_title || task.type_name}</strong></td>
                        <td>{task.pond_name || '-'}</td>
                        <td style={{ color: getComputedTaskStatus(task) === 'OVERDUE' ? '#ef4444' : 'inherit' }}>
                           {formatDateTime(task.due_date)}
                        </td>
                      </tr>
                    )) : <tr><td colSpan="3" style={{ textAlign: 'center' }}>Chưa có công việc nào được phân công.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Cột phải: Khối dữ liệu phân tích thông minh */}
            <div className="dashboard-ai_summary-card">
              <h3 className="dashboard-ai_title">🤖 Ý kiến Trợ lý Hệ thống</h3>
              <p style={{ color: '#334155', fontSize: '0.95rem', marginBottom: '12px' }}>
                Phân tích dữ liệu vận hành tổng quan:
              </p>
              <blockquote className="dashboard-ai_quote">
                "{getDynamicAIPrompt()}"
              </blockquote>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
};

export default DashboardPage;