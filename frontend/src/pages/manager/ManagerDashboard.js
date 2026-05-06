import React, { useEffect, useMemo, useState } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import {
  cultivationLogService,
  environmentLogService,
  feedLogService,
  pondService,
  seasonService,
} from '../../services/api';
import '../../styles/dashboard.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend, Filler);

export const ManagerDashboard = () => {
  const [ponds, setPonds] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState('');
  const [feedLogs, setFeedLogs] = useState([]);
  const [environmentLogs, setEnvironmentLogs] = useState([]);
  const [cultivationLogs, setCultivationLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchOverview();
  }, []);

  useEffect(() => {
    if (selectedSeasonId) {
      fetchActivityLogs(selectedSeasonId);
    }
  }, [selectedSeasonId]);

  const fetchOverview = async () => {
    try {
      setLoading(true);
      const [pondsRes, seasonsRes] = await Promise.all([
        pondService.getAllPonds(),
        seasonService.getAllSeasons(),
      ]);

      const pondData = pondsRes.data.data || [];
      const seasonData = seasonsRes.data.data || [];

      setPonds(pondData);
      setSeasons(seasonData);

      const runningSeason = seasonData.find((season) => season.status === 'RUNNING') || seasonData[0];
      if (runningSeason) {
        setSelectedSeasonId(String(runningSeason.season_id));
      }
    } catch (err) {
      setError('Lỗi tải dữ liệu dashboard');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchActivityLogs = async (seasonId) => {
    try {
      setLoadingLogs(true);
      const [feedRes, envRes, cultRes] = await Promise.all([
        feedLogService.getFeedLogsBySeasonId(seasonId),
        environmentLogService.getBySeasonId(seasonId),
        cultivationLogService.getBySeasonId(seasonId),
      ]);

      setFeedLogs(feedRes.data.data || []);
      setEnvironmentLogs(envRes.data.data || []);
      setCultivationLogs(cultRes.data.data || []);
    } catch (err) {
      setError('Lỗi tải dữ liệu hoạt động hàng ngày');
      console.error(err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const selectedSeason = useMemo(
    () => seasons.find((season) => String(season.season_id) === String(selectedSeasonId)),
    [seasons, selectedSeasonId]
  );

  const activeSeasons = seasons.filter((season) => season.status === 'RUNNING');
  const totalFeedKg = feedLogs.reduce((sum, item) => sum + Number(item.quantity_kg || 0), 0);
  const latestEnvironment = environmentLogs[0] || null;

  const feedChartData = useMemo(() => {
    const grouped = feedLogs.reduce((acc, item) => {
      const key = item.feeding_date || 'N/A';
      acc[key] = (acc[key] || 0) + Number(item.quantity_kg || 0);
      return acc;
    }, {});

    const labels = Object.keys(grouped).reverse();
    return {
      labels,
      datasets: [
        {
          label: 'Thức ăn (kg)',
          data: labels.map((label) => grouped[label]),
          backgroundColor: '#0f766e',
          borderRadius: 8,
        },
      ],
    };
  }, [feedLogs]);

  const environmentChartData = useMemo(() => {
    const rows = [...environmentLogs].reverse().slice(-7);
    const labels = rows.map((item) => new Date(item.recorded_at).toLocaleDateString('vi-VN'));
    return {
      labels,
      datasets: [
        {
          label: 'pH',
          data: rows.map((item) => item.ph),
          borderColor: '#2563eb',
          backgroundColor: 'rgba(37, 99, 235, 0.15)',
          tension: 0.35,
        },
        {
          label: 'Nhiệt độ',
          data: rows.map((item) => item.temperature),
          borderColor: '#f97316',
          backgroundColor: 'rgba(249, 115, 22, 0.15)',
          tension: 0.35,
        },
        {
          label: 'Oxy',
          data: rows.map((item) => item.oxygen),
          borderColor: '#16a34a',
          backgroundColor: 'rgba(22, 163, 74, 0.15)',
          tension: 0.35,
        },
      ],
    };
  }, [environmentLogs]);

  const cultivationChartData = useMemo(() => {
    const grouped = cultivationLogs.reduce((acc, item) => {
      const key = item.action_type || 'Khác';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const labels = Object.keys(grouped);
    return {
      labels,
      datasets: [
        {
          label: 'Số lần',
          data: labels.map((label) => grouped[label]),
          backgroundColor: ['#38bdf8', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'],
          borderRadius: 8,
        },
      ],
    };
  }, [cultivationLogs]);

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
        <h1>🧠 Dashboard quản lý</h1>
        <p>Theo dõi realtime hoạt động hàng ngày: cho ăn, môi trường, nhật ký xử lý</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div style={{ marginBottom: '18px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <label style={{ fontWeight: 600 }}>Mùa vụ:</label>
        <select
          value={selectedSeasonId}
          onChange={(e) => setSelectedSeasonId(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #e5e7eb' }}
        >
          {seasons.map((season) => (
            <option key={season.season_id} value={season.season_id}>
              {season.season_name} - Ao {season.pond_id}
            </option>
          ))}
        </select>
        {selectedSeason && <span className="status-badge status-running">{selectedSeason.status}</span>}
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#dbeafe' }}>🏞️</div>
          <div className="stat-content">
            <p className="stat-label">Tổng ao nuôi</p>
            <p className="stat-value">{ponds.length}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#dcfce7' }}>🌾</div>
          <div className="stat-content">
            <p className="stat-label">Mùa vụ hoạt động</p>
            <p className="stat-value">{activeSeasons.length}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#fef3c7' }}>🍚</div>
          <div className="stat-content">
            <p className="stat-label">Tổng thức ăn</p>
            <p className="stat-value">{totalFeedKg.toFixed(1)} kg</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#fee2e2' }}>🧪</div>
          <div className="stat-content">
            <p className="stat-label">pH hiện tại</p>
            <p className="stat-value">{latestEnvironment?.ph ?? '--'}</p>
          </div>
        </div>
      </div>

      <div className="recent-section">
        <h2>📈 Biểu đồ realtime</h2>
        <div className="info-boxes" style={{ gap: '18px' }}>
          <div className="info-box" style={{ flex: 1 }}>
            <h3>Cho ăn theo ngày</h3>
            <Bar data={feedChartData} options={{ responsive: true, plugins: { legend: { display: false } } }} />
          </div>
          <div className="info-box" style={{ flex: 1 }}>
            <h3>Môi trường gần nhất</h3>
            <Line data={environmentChartData} options={{ responsive: true, maintainAspectRatio: true }} />
          </div>
        </div>
      </div>

      <div className="recent-section">
        <h2>🧾 Loại nhật ký xử lý</h2>
        <div className="info-box" style={{ maxWidth: '720px', margin: '0 auto' }}>
          <Bar data={cultivationChartData} options={{ responsive: true, plugins: { legend: { display: false } } }} />
        </div>
      </div>

      <div className="recent-section">
        <h2>🗂️ Nhật ký xử lý gần nhất</h2>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Ngày</th>
                <th>Hành động</th>
                <th>Mô tả</th>
                <th>Người thực hiện</th>
              </tr>
            </thead>
            <tbody>
              {cultivationLogs.length > 0 ? (
                cultivationLogs.slice(0, 8).map((log) => (
                  <tr key={log.log_id}>
                    <td>{new Date(log.log_date).toLocaleDateString('vi-VN')}</td>
                    <td>{log.action_type}</td>
                    <td>{log.description}</td>
                    <td>{log.created_by_name || '--'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>
                    Chưa có nhật ký xử lý
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="recent-section">
        <h2>🍚 Nhật ký cho ăn gần nhất</h2>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Ngày</th>
                <th>Giờ</th>
                <th>Buổi</th>
                <th>Số lượng (kg)</th>
                <th>Người nhập</th>
              </tr>
            </thead>
            <tbody>
              {feedLogs.length > 0 ? (
                feedLogs.slice(0, 8).map((log) => (
                  <tr key={log.feed_log_id}>
                    <td>{new Date(log.feeding_date).toLocaleDateString('vi-VN')}</td>
                    <td>{log.feeding_time}</td>
                    <td>{log.meal_no}</td>
                    <td>{log.quantity_kg}</td>
                    <td>{log.created_by_name || '--'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>
                    Chưa có nhật ký cho ăn
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="recent-section">
        <h2>🌡️ Nhật ký môi trường gần nhất</h2>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Thời gian</th>
                <th>pH</th>
                <th>Nhiệt độ</th>
                <th>Độ mặn</th>
                <th>Oxy</th>
                <th>NH3</th>
              </tr>
            </thead>
            <tbody>
              {environmentLogs.length > 0 ? (
                environmentLogs.slice(0, 8).map((log) => (
                  <tr key={log.id || log.recorded_at}>
                    <td>{new Date(log.recorded_at).toLocaleString('vi-VN')}</td>
                    <td>{log.ph}</td>
                    <td>{log.temperature}</td>
                    <td>{log.salinity}</td>
                    <td>{log.oxygen}</td>
                    <td>{log.nh3}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>
                    Chưa có dữ liệu môi trường
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {loadingLogs && <div className="alert alert-success">Đang làm mới dữ liệu realtime...</div>}
    </div>
  );
};

export default ManagerDashboard;
