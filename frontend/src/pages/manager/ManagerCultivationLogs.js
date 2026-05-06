import React, { useState, useEffect } from 'react';
import { cultivationLogService, seasonService } from '../../services/api';
import '../../styles/dashboard.css';

export const ManagerCultivationLogs = () => {
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
      if (response.data.data && response.data.data.length > 0) {
        setSelectedSeason(response.data.data[0].season_id);
      }
    } catch (err) {
      setError('Lỗi tải danh sách mùa vụ');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async (seasonId) => {
    try {
      const response = await cultivationLogService.getBySeasonId(seasonId);
      setLogs(response.data.data || []);
    } catch (err) {
      setError('Lỗi tải nhật ký canh tác');
      console.error(err);
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
        <h1>📝 Nhật ký canh tác</h1>
        <p>Quản lý và duyệt nhật ký canh tác</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ marginRight: '10px', fontWeight: 600 }}>Chọn mùa vụ:</label>
        <select
          value={selectedSeason || ''}
          onChange={(e) => {
            setSelectedSeason(parseInt(e.target.value));
          }}
          style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #e5e7eb' }}
        >
          {seasons.map((season) => (
            <option key={season.season_id} value={season.season_id}>
              {season.season_name}
            </option>
          ))}
        </select>
      </div>

      <div className="table-container">
        <div className="table-header">
          <h2>Danh sách nhật ký</h2>
          <span className="status-badge status-running">Chế độ xem</span>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Ngày</th>
                <th>Loại hoạt động</th>
                <th>Mô tả</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {logs.length > 0 ? (
                logs.map((log) => (
                  <tr key={log.log_id}>
                    <td>{new Date(log.log_date).toLocaleDateString('vi-VN')}</td>
                    <td>{log.action_type}</td>
                    <td>{log.description}</td>
                    <td>
                      <span
                        className={`status-badge ${
                          log.status === 'APPROVED'
                            ? 'status-active'
                            : log.status === 'REJECTED'
                            ? 'status-inactive'
                            : 'status-pending'
                        }`}
                      >
                        {log.status === 'APPROVED' && '✅ Đã duyệt'}
                        {log.status === 'PENDING' && '⏳ Chờ duyệt'}
                        {log.status === 'REJECTED' && '❌ Từ chối'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>
                    Không có nhật ký nào
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manager chỉ xem nhật ký, không nhập liệu */}
    </div>
  );
};

export default ManagerCultivationLogs;
