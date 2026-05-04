import React, { useState, useEffect } from 'react';
import { seasonService, adminService } from '../../services/api';
import '../../styles/dashboard.css';

export const ManagerReports = () => {
  const [seasons, setSeasons] = useState([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    activePonds: 0,
    totalSeasons: 0,
    totalExpenses: 0,
    totalHarvests: 0,
    averageSurvivalRate: 0,
    averageFCR: 0,
  });
  const [harvestData, setHarvestData] = useState([]);
  const [expenseData, setExpenseData] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedSeasonId) {
      fetchSeasonStats(selectedSeasonId);
    }
  }, [selectedSeasonId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await seasonService.getAllSeasons();
      const activeSeasons = response.data?.filter((s) => s.status === 'RUNNING') || [];
      setSeasons(activeSeasons);

      if (activeSeasons.length > 0) {
        setSelectedSeasonId(activeSeasons[0].season_id);
      }

      // Get overall stats
      const statsRes = await adminService.getSystemStats();
      setStats({
        activePonds: statsRes.data?.active_ponds || 0,
        totalSeasons: statsRes.data?.total_seasons || 0,
        totalExpenses: statsRes.data?.total_expenses || 0,
        totalHarvests: statsRes.data?.total_harvests || 0,
        averageSurvivalRate: statsRes.data?.average_survival_rate || 0,
        averageFCR: statsRes.data?.average_fcr || 0,
      });
    } catch (err) {
      setError('Lỗi tải dữ liệu báo cáo');
    } finally {
      setLoading(false);
    }
  };

  const fetchSeasonStats = async (seasonId) => {
    try {
      // Mock harvest data - in production, this would come from the backend
      setHarvestData([
        {
          pond: 'Ao 1',
          startDate: '2024-01-01',
          harvestDate: '2024-04-01',
          shrimpType: 'Tôm sú',
          seedQuantity: 10000,
          harvestQuantity: 8500,
          survivaRate: 85,
          fcr: 1.2,
          revenue: 17000000,
        },
        {
          pond: 'Ao 2',
          startDate: '2024-01-15',
          harvestDate: '2024-04-15',
          shrimpType: 'Tôm sú',
          seedQuantity: 12000,
          harvestQuantity: 10200,
          survivaRate: 85,
          fcr: 1.15,
          revenue: 20400000,
        },
        {
          pond: 'Ao 3',
          startDate: '2024-02-01',
          harvestDate: null,
          shrimpType: 'Tôm sú',
          seedQuantity: 11000,
          harvestQuantity: 0,
          survivaRate: 0,
          fcr: 0,
          revenue: 0,
        },
      ]);

      // Mock expense data by category
      setExpenseData([
        { category: 'Thức ăn', amount: 5000000, percentage: 35 },
        { category: 'Thuốc/Vi sinh', amount: 2500000, percentage: 18 },
        { category: 'Điện nước', amount: 3000000, percentage: 21 },
        { category: 'Nhân công', amount: 2800000, percentage: 19 },
        { category: 'Khác', amount: 1200000, percentage: 7 },
      ]);
    } catch (err) {
      setError('Lỗi tải dữ liệu mùa vụ');
    }
  };

  if (loading) {
    return (
      <div className="dashboard">
        <div className="flex-center" style={{ minHeight: '400px' }}>
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>📊 Báo cáo & Thống kê</h1>
        <p>Xem báo cáo phát triển, tỷ lệ sống, chi phí và doanh thu</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div style={{ marginBottom: '30px' }}>
        <label style={{ marginRight: '10px', fontWeight: 600 }}>Chọn mùa vụ:</label>
        <select
          value={selectedSeasonId || ''}
          onChange={(e) => setSelectedSeasonId(parseInt(e.target.value))}
          style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #e5e7eb' }}
        >
          {seasons.map((season) => (
            <option key={season.season_id} value={season.season_id}>
              {season.season_name}
            </option>
          ))}
        </select>
      </div>

      {/* Overall Stats */}
      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ marginBottom: '20px' }}>📈 Tổng quan hệ thống</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: '#dbeafe' }}>
              🏊
            </div>
            <div className="stat-content">
              <p className="stat-label">Ao đang hoạt động</p>
              <p className="stat-value">{stats.activePonds}</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: '#dcfce7' }}>
              📅
            </div>
            <div className="stat-content">
              <p className="stat-label">Tổng mùa vụ</p>
              <p className="stat-value">{stats.totalSeasons}</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: '#fecaca' }}>
              🎯
            </div>
            <div className="stat-content">
              <p className="stat-label">Mùa vụ hoàn thành</p>
              <p className="stat-value">{stats.totalHarvests}</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: '#fef3c7' }}>
              💰
            </div>
            <div className="stat-content">
              <p className="stat-label">Tổng chi phí</p>
              <p className="stat-value">
                {(stats.totalExpenses / 1000000).toFixed(1)}M
              </p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: '#f0fdf4' }}>
              📊
            </div>
            <div className="stat-content">
              <p className="stat-label">Tỷ lệ sống TB</p>
              <p className="stat-value">{stats.averageSurvivalRate.toFixed(1)}%</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: '#e0e7ff' }}>
              🍗
            </div>
            <div className="stat-content">
              <p className="stat-label">FCR trung bình</p>
              <p className="stat-value">{stats.averageFCR.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Harvest Data Table */}
      <div style={{ marginBottom: '40px' }}>
        <div className="table-container">
          <h2 style={{ marginBottom: '15px' }}>🎯 Dữ liệu thu hoạch theo ao</h2>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Ao</th>
                  <th>Ngày bắt đầu</th>
                  <th>Ngày thu hoạch</th>
                  <th>Giống (cái)</th>
                  <th>Thu hoạch (kg)</th>
                  <th>Tỷ lệ sống</th>
                  <th>FCR</th>
                  <th>Doanh thu</th>
                </tr>
              </thead>
              <tbody>
                {harvestData.map((row, idx) => (
                  <tr key={idx}>
                    <td><strong>{row.pond}</strong></td>
                    <td>{new Date(row.startDate).toLocaleDateString('vi-VN')}</td>
                    <td>
                      {row.harvestDate
                        ? new Date(row.harvestDate).toLocaleDateString('vi-VN')
                        : '⏳ Đang hoạt động'}
                    </td>
                    <td>{row.seedQuantity.toLocaleString()}</td>
                    <td>{row.harvestQuantity.toLocaleString()}</td>
                    <td>
                      <span style={{ color: row.survivaRate > 0 ? '#16a34a' : '#999' }}>
                        {row.survivaRate}%
                      </span>
                    </td>
                    <td>{row.fcr > 0 ? row.fcr.toFixed(2) : '-'}</td>
                    <td>
                      {row.revenue > 0
                        ? row.revenue.toLocaleString('vi-VN')
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Expense Breakdown */}
      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ marginBottom: '20px' }}>💰 Chi phí theo danh mục</h2>
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
          {expenseData.map((item, idx) => (
            <div key={idx} className="stat-card">
              <div className="stat-icon" style={{ backgroundColor: '#fef3c7' }}>
                📊
              </div>
              <div className="stat-content">
                <p className="stat-label">{item.category}</p>
                <p className="stat-value">
                  {item.amount.toLocaleString('vi-VN')} đ
                </p>
                <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                  {item.percentage}% tổng chi phí
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Insights */}
      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ marginBottom: '20px' }}>💡 Thông tin chi tiết</h2>
        <div
          style={{
            backgroundColor: '#f0fdf4',
            border: '2px solid #86efac',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '15px',
          }}
        >
          <h3>✅ Điểm tích cực</h3>
          <ul style={{ marginLeft: '20px' }}>
            <li>Tỷ lệ sống trung bình 85% - cao hơn mục tiêu (80%)</li>
            <li>FCR 1.18 - tốt hơn tiêu chuẩn ngành (1.2)</li>
            <li>Mùa vụ Ao 1 đạt doanh thu 17 triệu đ</li>
            <li>Hệ thống giám sát hoạt động ổn định</li>
          </ul>
        </div>

        <div
          style={{
            backgroundColor: '#fef2f2',
            border: '2px solid #fca5a5',
            borderRadius: '12px',
            padding: '20px',
          }}
        >
          <h3>⚠️ Cần chú ý</h3>
          <ul style={{ marginLeft: '20px' }}>
            <li>Chi phí thức ăn chiếm 35% - cân nhắc tối ưu hóa khẩu phần</li>
            <li>Ao 3 còn 2 tháng mới thu hoạch - dõi sát tiến độ</li>
            <li>Chi phí điện nước 3 triệu đ - xem xét tiết kiệm năng lượng</li>
          </ul>
        </div>
      </div>

      {/* Export Options */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button className="btn btn-primary" onClick={() => window.print()}>
          🖨️ In báo cáo
        </button>
        <button className="btn btn-secondary" onClick={() => alert('Tính năng xuất Excel sẽ sớm có')}>
          📥 Xuất Excel
        </button>
        <button className="btn btn-secondary" onClick={() => alert('Tính năng gửi báo cáo sẽ sớm có')}>
          📧 Gửi báo cáo
        </button>
      </div>
    </div>
  );
};

export default ManagerReports;
