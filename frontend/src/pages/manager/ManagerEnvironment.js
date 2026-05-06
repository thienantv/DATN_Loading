import React, { useState, useEffect } from 'react';
import { environmentLogService, seasonService } from '../../services/api';
import '../../styles/dashboard.css';

export const ManagerEnvironment = () => {
  const [logs, setLogs] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSeason, setSelectedSeason] = useState(null);

  useEffect(() => {
    fetchSeasons();
  }, []);

  useEffect(() => {
    if (selectedSeason) {
      fetchLogs(selectedSeason);
    }
  }, [selectedSeason]);

  const fetchSeasons = async () => {
    try {
      setLoading(true);
      const response = await seasonService.getAllSeasons();
      setSeasons(response.data.data || []);
      if (response.data.data?.length > 0) {
        setSelectedSeason(response.data.data[0].season_id);
      }
    } catch (err) {
      setError('Lỗi tải danh sách mùa vụ');
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async (seasonId) => {
    try {
      const response = await environmentLogService.getBySeasonId(seasonId);
      setLogs(response.data.data || []);
    } catch (err) {
      setError('Lỗi tải dữ liệu môi trường');
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
        <h1>🌡️ Quản lý môi trường</h1>
        <p>Giám sát chỉ số môi trường và thiết lập ngưỡng cảnh báo</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ marginRight: '10px', fontWeight: 600 }}>Chọn mùa vụ:</label>
        <select
          value={selectedSeason || ''}
          onChange={(e) => setSelectedSeason(parseInt(e.target.value))}
          style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #e5e7eb' }}
        >
          {seasons.map((season) => (
            <option key={season.season_id} value={season.season_id}>
              {season.season_name}
            </option>
          ))}
        </select>
      </div>

      {/* Latest Environment Data */}
      <div className="stats-grid" style={{ marginBottom: '40px' }}>
        {logs.length > 0 && (
          <>
            <div className="stat-card">
              <div className="stat-icon" style={{ backgroundColor: '#dbeafe' }}>
                🌡️
              </div>
              <div className="stat-content">
                <p className="stat-label">Nhiệt độ (°C)</p>
                <p className="stat-value">{logs[0]?.temperature || '--'}</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon" style={{ backgroundColor: '#dcfce7' }}>
                🧪
              </div>
              <div className="stat-content">
                <p className="stat-label">pH</p>
                <p className="stat-value">{logs[0]?.ph || '--'}</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon" style={{ backgroundColor: '#fef3c7' }}>
                💧
              </div>
              <div className="stat-content">
                <p className="stat-label">Độ mặn (ppt)</p>
                <p className="stat-value">{logs[0]?.salinity || '--'}</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon" style={{ backgroundColor: '#fee2e2' }}>
                💨
              </div>
              <div className="stat-content">
                <p className="stat-label">Oxy (mg/l)</p>
                <p className="stat-value">{logs[0]?.oxygen || '--'}</p>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="table-container">
        <div className="table-header">
          <h2>Lịch sử dữ liệu môi trường</h2>
          <span className="status-badge status-running">Chế độ xem</span>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Thời gian</th>
                <th>pH</th>
                <th>Nhiệt độ (°C)</th>
                <th>Độ mặn (ppt)</th>
                <th>Oxy (mg/l)</th>
                <th>NH3</th>
              </tr>
            </thead>
            <tbody>
              {logs.length > 0 ? (
                logs.map((log, idx) => (
                  <tr key={idx}>
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
                    Chưa có dữ liệu
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manager chỉ xem dữ liệu, không nhập liệu */}
    </div>
  );
};

export default ManagerEnvironment;
