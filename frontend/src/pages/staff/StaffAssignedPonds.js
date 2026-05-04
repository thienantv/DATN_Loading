import React, { useState, useEffect } from 'react';
import { pondService } from '../../services/api';
import '../../styles/dashboard.css';

export const StaffAssignedPonds = () => {
  const [ponds, setPonds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('ALL');

  useEffect(() => {
    fetchPonds();
  }, []);

  const fetchPonds = async () => {
    try {
      setLoading(true);
      const response = await pondService.getAllPonds();
      setPonds(response.data.data || []);
    } catch (err) {
      setError('Lỗi tải danh sách ao');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredPonds = filterStatus === 'ALL'
    ? ponds
    : ponds.filter((p) => p.status === filterStatus);

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
        <h1>🐠 Ao phụ trách</h1>
        <p>Thông tin các ao được giao phụ trách</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div style={{ marginBottom: '20px' }}>
        <label style={{ marginRight: '10px', fontWeight: 600 }}>Lọc theo trạng thái:</label>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #e5e7eb' }}
        >
          <option value="ALL">Tất cả</option>
          <option value="ACTIVE">✅ Hoạt động</option>
          <option value="INACTIVE">❌ Không hoạt động</option>
          <option value="MAINTENANCE">🔧 Bảo trì</option>
        </select>
      </div>

      <div className="table-container">
        <div className="table-header">
          <h2>Danh sách ao ({filteredPonds.length})</h2>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Mã ao</th>
                <th>Tên ao</th>
                <th>Diện tích (m²)</th>
                <th>Độ sâu (m)</th>
                <th>Mật độ tối đa</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {filteredPonds.length > 0 ? (
                filteredPonds.map((pond) => (
                  <tr key={pond.pond_id}>
                    <td><strong>{pond.pond_code}</strong></td>
                    <td>{pond.pond_name}</td>
                    <td>{pond.area}</td>
                    <td>{pond.depth}</td>
                    <td>{pond.max_density}</td>
                    <td>
                      <span
                        className={`status-badge ${
                          pond.status === 'ACTIVE'
                            ? 'status-active'
                            : pond.status === 'MAINTENANCE'
                            ? 'status-warning'
                            : 'status-inactive'
                        }`}
                      >
                        {pond.status === 'ACTIVE' && '✅ Hoạt động'}
                        {pond.status === 'INACTIVE' && '❌ Không hoạt động'}
                        {pond.status === 'MAINTENANCE' && '🔧 Bảo trì'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>
                    Chưa có ao nào được giao phụ trách
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StaffAssignedPonds;
