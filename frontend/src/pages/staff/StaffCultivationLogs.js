import React, { useState, useEffect, useContext } from 'react';
import { cultivationLogService, seasonService, pondService } from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import '../../styles/dashboard.css';

export const StaffCultivationLogs = () => {
  const { user } = useContext(AuthContext);
  const [logs, setLogs] = useState([]);
  const [ponds, setPonds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [selectedPond, setSelectedPond] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    pondId: '',
    logDate: '',
    actionType: '',
    description: '',
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
      if (response.data.data && response.data.data.length > 0) {
        setSelectedPond(response.data.data[0].pond_id);
        setFormData((prev) => ({ ...prev, pondId: response.data.data[0].pond_id }));
      }
    } catch (err) {
      setError('Lỗi tải danh sách ao nuôi');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async (pondId) => {
    try {
      const response = await cultivationLogService.getByPondId(pondId);
      setLogs(response.data.data || []);
    } catch (err) {
      setError('Lỗi tải nhật ký canh tác');
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      await cultivationLogService.createLog({
        pond_id: parseInt(formData.pondId),
        log_date: formData.logDate,
        action_type: formData.actionType,
        description: formData.description,
      });
      setSuccess('Tạo nhật ký canh tác thành công');
      setShowModal(false);
      fetchLogs(selectedPond);
      setFormData({
        pondId: formData.pondId,
        logDate: '',
        actionType: '',
        description: '',
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Lỗi xử lý');
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
        <p>Ghi chép hoạt động hàng ngày tại ao nuôi</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div style={{ marginBottom: '20px' }}>
        <label style={{ marginRight: '10px', fontWeight: 600 }}>Chọn ao nuôi:</label>
        <select
          value={selectedPond || ''}
          onChange={(e) => {
            setSelectedPond(parseInt(e.target.value));
            setFormData((prev) => ({ ...prev, pondId: e.target.value }));
          }}
          style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #e5e7eb' }}
        >
          {ponds.map((pond) => (
            <option key={pond.pond_id} value={pond.pond_id}>
              {pond.pond_code} - {pond.pond_name}
            </option>
          ))}
        </select>
      </div>

      <div className="table-container">
        <div className="table-header">
          <h2>Danh sách nhật ký</h2>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            ➕ Thêm nhật ký
          </button>
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

      {/* Modal */}
      {showModal && (
        <div className="modal" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>➕ Thêm nhật ký canh tác</h2>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Ngày</label>
                <input
                  type="date"
                  value={formData.logDate}
                  onChange={(e) =>
                    setFormData({ ...formData, logDate: e.target.value })
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label>Loại hoạt động</label>
                <select
                  value={formData.actionType}
                  onChange={(e) =>
                    setFormData({ ...formData, actionType: e.target.value })
                  }
                  required
                >
                  <option value="">-- Chọn loại --</option>
                  <option value="Thay nước">Thay nước</option>
                  <option value="Siphon">Siphon</option>
                  <option value="Dùng thuốc">Dùng thuốc</option>
                  <option value="Kiểm tra">Kiểm tra</option>
                  <option value="Cho ăn">Cho ăn</option>
                  <option value="Khác">Khác</option>
                </select>
              </div>

              <div className="form-group">
                <label>Mô tả chi tiết</label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
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

export default StaffCultivationLogs;
