import React, { useState, useEffect } from 'react';
import { sensorService, pondService } from '../../services/api';
import '../../styles/dashboard.css';

export const ManagerSensors = () => {
  const [sensors, setSensors] = useState([]);
  const [ponds, setPonds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedSensor, setSelectedSensor] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [formData, setFormData] = useState({
    pondId: '',
    sensorName: '',
    sensorType: 'pH',
    serialNumber: '',
    status: 'ACTIVE',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [sensorsRes, pondsRes] = await Promise.all([
        sensorService.getAllSensors(),
        pondService.getAllPonds(),
      ]);
      setSensors(sensorsRes.data.data || []);
      setPonds(pondsRes.data.data || []);
    } catch (err) {
      setError('Lỗi tải dữ liệu cảm biến');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const sensorTypes = ['pH', 'Nhiệt độ', 'Oxy hòa tan', 'Độ mặn', 'Ammonia', 'Nitrite', 'Khác'];
  const statuses = ['ACTIVE', 'INACTIVE', 'MAINTENANCE'];

  const filteredSensors = filterStatus
    ? sensors.filter((s) => s.status === filterStatus)
    : sensors;

  const handleOpenModal = (sensor = null) => {
    if (sensor) {
      setSelectedSensor(sensor);
      setFormData({
        pondId: sensor.pond_id || '',
        sensorName: sensor.sensor_name || '',
        sensorType: sensor.sensor_type || 'pH',
        serialNumber: sensor.serial_number || '',
        status: sensor.status || 'ACTIVE',
      });
    } else {
      setSelectedSensor(null);
      setFormData({
        pondId: '',
        sensorName: '',
        sensorType: 'pH',
        serialNumber: '',
        status: 'ACTIVE',
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedSensor(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      const data = {
        pond_id: parseInt(formData.pondId),
        sensor_name: formData.sensorName,
        sensor_type: formData.sensorType,
        serial_number: formData.serialNumber || null,
        status: formData.status,
      };

      if (selectedSensor) {
        await sensorService.updateSensor(selectedSensor.sensor_id, data);
        setSuccess('Cập nhật cảm biến thành công');
      } else {
        await sensorService.createSensor(data);
        setSuccess('Tạo cảm biến mới thành công');
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Lỗi xử lý');
    }
  };

  const handleDeleteSensor = async (sensorId) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa cảm biến này?')) {
      try {
        await sensorService.deleteSensor(sensorId);
        setSuccess('Xóa cảm biến thành công');
        fetchData();
      } catch (err) {
        setError('Lỗi xóa cảm biến');
      }
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
        <h1>📡 Quản lý cảm biến</h1>
        <p>Quản lý thiết bị cảm biến theo dõi môi trường ao nuôi</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="table-container">
        <div className="table-header">
          <h2>Danh sách thiết bị cảm biến</h2>
          <button className="btn btn-primary" onClick={() => handleOpenModal()}>
            ➕ Thêm cảm biến
          </button>
        </div>

        <div style={{ marginBottom: '15px', display: 'flex', gap: '10px', alignItems: 'center' }}>
          <label style={{ marginRight: 'auto', fontWeight: '500' }}>Lọc theo trạng thái:</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px',
            }}
          >
            <option value="">Tất cả trạng thái</option>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status === 'ACTIVE' ? '✅ Hoạt động' : status === 'INACTIVE' ? '❌ Ngừng hoạt động' : '🔧 Bảo trì'}
              </option>
            ))}
          </select>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Ao nuôi</th>
                <th>Tên cảm biến</th>
                <th>Loại</th>
                <th>Số serial</th>
                <th>Trạng thái</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {filteredSensors.length > 0 ? (
                filteredSensors.map((sensor) => (
                  <tr key={sensor.sensor_id}>
                    <td>{sensor.pond_name || sensor.pond_code || 'N/A'}</td>
                    <td>{sensor.sensor_name}</td>
                    <td>{sensor.sensor_type}</td>
                    <td>{sensor.serial_number || '-'}</td>
                    <td>
                      <span
                        className={`status-badge ${
                          sensor.status === 'ACTIVE'
                            ? 'status-active'
                            : sensor.status === 'INACTIVE'
                            ? 'status-inactive'
                            : 'status-pending'
                        }`}
                      >
                        {sensor.status === 'ACTIVE'
                          ? '✅ Hoạt động'
                          : sensor.status === 'INACTIVE'
                          ? '❌ Ngừng hoạt động'
                          : '🔧 Bảo trì'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '5px' }}>
                        <button
                          onClick={() => handleOpenModal(sensor)}
                          className="btn btn-sm btn-secondary"
                          title="Chỉnh sửa"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDeleteSensor(sensor.sensor_id)}
                          className="btn btn-sm btn-danger"
                          title="Xóa"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>
                    Không có cảm biến nào
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{selectedSensor ? '✏️ Sửa cảm biến' : '📡 Thêm cảm biến mới'}</h2>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Ao nuôi</label>
                <select
                  name="pondId"
                  value={formData.pondId}
                  onChange={handleChange}
                  required
                  disabled={!!selectedSensor}
                >
                  <option value="">-- Chọn ao --</option>
                  {ponds.map((pond) => (
                    <option key={pond.pond_id} value={pond.pond_id}>
                      {pond.pond_code} - {pond.pond_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Tên cảm biến</label>
                <input
                  type="text"
                  name="sensorName"
                  value={formData.sensorName}
                  onChange={handleChange}
                  placeholder="VD: Cảm biến pH ao 1"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Loại cảm biến</label>
                  <select
                    name="sensorType"
                    value={formData.sensorType}
                    onChange={handleChange}
                    required
                  >
                    {sensorTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Số serial</label>
                  <input
                    type="text"
                    name="serialNumber"
                    value={formData.serialNumber}
                    onChange={handleChange}
                    placeholder="VD: SN-2024-001"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Trạng thái</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  required
                >
                  <option value="ACTIVE">✅ Hoạt động</option>
                  <option value="INACTIVE">❌ Ngừng hoạt động</option>
                  <option value="MAINTENANCE">🔧 Bảo trì</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  💾 Lưu
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  onClick={handleCloseModal}
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

export default ManagerSensors;
