import React, { useState, useEffect } from 'react';
import { environmentLogService, pondService } from '../../services/api';
import '../../styles/dashboard.css';

export const StaffEnvironment = () => {
  const [logs, setLogs] = useState([]);
  const [ponds, setPonds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [selectedPond, setSelectedPond] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    ph: '',
    temperature: '',
    salinity: '',
    oxygen: '',
    nh3: '',
  });

  useEffect(() => {
    fetchPonds();
  }, []);

  useEffect(() => {
    if (selectedPond) {
      fetchLogs(selectedPond);
    }
  }, [selectedPond]);

  const fetchPonds = async () => {
    try {
      setLoading(true);
      const response = await pondService.getAllPonds();
      setPonds(response.data.data || []);
      if (response.data.data?.length > 0) {
        setSelectedPond(response.data.data[0].pond_id);
      }
    } catch (err) {
      setError('Lỗi tải danh sách ao nuôi');
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async (pondId) => {
    try {
      const response = await environmentLogService.getByPondId(pondId);
      setLogs(response.data.data || []);
    } catch (err) {
      setError('Lỗi tải dữ liệu môi trường');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      await environmentLogService.createLog({
        pond_id: selectedPond,
        ph: parseFloat(formData.ph),
        temperature: parseFloat(formData.temperature),
        salinity: parseFloat(formData.salinity),
        oxygen: parseFloat(formData.oxygen),
        nh3: parseFloat(formData.nh3),
      });
      setSuccess('Nhập dữ liệu môi trường thành công');
      setShowModal(false);
      fetchLogs(selectedPond);
      setFormData({ ph: '', temperature: '', salinity: '', oxygen: '', nh3: '' });
    } catch (err) {
      setError('Lỗi nhập dữ liệu');
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
        <h1>🌡️ Dữ liệu môi trường</h1>
        <p>Ghi chép các chỉ số môi trường hàng ngày</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div style={{ marginBottom: '20px' }}>
        <label style={{ marginRight: '10px', fontWeight: 600 }}>Chọn ao nuôi:</label>
        <select
          value={selectedPond || ''}
          onChange={(e) => setSelectedPond(parseInt(e.target.value))}
          style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #e5e7eb' }}
        >
          {ponds.map((pond) => (
            <option key={pond.pond_id} value={pond.pond_id}>
              {pond.pond_code} - {pond.pond_name}
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
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            ➕ Nhập dữ liệu mới
          </button>
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

      {/* Modal */}
      {showModal && (
        <div className="modal" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>📊 Nhập dữ liệu môi trường</h2>

            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>pH (4-9)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="4"
                    max="9"
                    value={formData.ph}
                    onChange={(e) => setFormData({ ...formData, ph: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Nhiệt độ (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.temperature}
                    onChange={(e) =>
                      setFormData({ ...formData, temperature: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Độ mặn (ppt)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.salinity}
                    onChange={(e) =>
                      setFormData({ ...formData, salinity: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Oxy (mg/l)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.oxygen}
                    onChange={(e) => setFormData({ ...formData, oxygen: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>NH3 (mg/l)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.nh3}
                  onChange={(e) => setFormData({ ...formData, nh3: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  💾 Lưu
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => setShowModal(false)}
                >
                  ❌ Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffEnvironment;
