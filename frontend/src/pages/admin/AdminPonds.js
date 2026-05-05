import React, { useState, useEffect } from 'react';
import { pondService } from '../../services/api';
import '../../styles/dashboard.css';

export const AdminPonds = () => {
  const [ponds, setPonds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedPond, setSelectedPond] = useState(null);
  const [formData, setFormData] = useState({
    pondCode: '',
    pondName: '',
    areaMm2: '',
    depthM: '',
    maxDensity: '',
  });

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

  const handleOpenModal = (pond = null) => {
    if (pond) {
      setSelectedPond(pond);
      setFormData({
        pondCode: pond.pond_code || '',
        pondName: pond.pond_name || '',
        areaMm2: pond.area_m2 || '',
        depthM: pond.depth_m || '',
        maxDensity: pond.max_density || '',
      });
    } else {
      setSelectedPond(null);
      setFormData({
        pondCode: '',
        pondName: '',
        areaMm2: '',
        depthM: '',
        maxDensity: '',
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedPond(null);
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
      if (selectedPond) {
        // Update pond - send all fields including pond_code
        await pondService.updatePond(selectedPond.pond_id, {
          pond_code: formData.pondCode,
          pond_name: formData.pondName,
          area_m2: parseFloat(formData.areaMm2),
          depth_m: parseFloat(formData.depthM),
          max_density: parseInt(formData.maxDensity),
        });
        setSuccess('Cập nhật ao thành công');
      } else {
        // Create new pond - don't send pond_code (backend will auto-generate)
        await pondService.createPond({
          pond_name: formData.pondName,
          area_m2: parseFloat(formData.areaMm2),
          depth_m: parseFloat(formData.depthM),
          max_density: parseInt(formData.maxDensity),
        });
        setSuccess('Tạo ao mới thành công');
      }
      handleCloseModal();
      fetchPonds();
    } catch (err) {
      setError(err.response?.data?.message || 'Lỗi xử lý');
    }
  };

  const handleDeletePond = async (pondId) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa ao này?')) {
      try {
        await pondService.deletePond(pondId);
        setSuccess('Xóa ao thành công');
        fetchPonds();
      } catch (err) {
        setError('Lỗi xóa ao');
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
        <h1>🏞️ Quản lý Ao nuôi</h1>
        <p>Quản lý danh mục ao nuôi (template)</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="table-container">
        <div className="table-header">
          <h2>Danh sách ao nuôi</h2>
          <button className="btn btn-primary" onClick={() => handleOpenModal()}>
            ➕ Thêm ao
          </button>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Mã ao</th>
                <th>Tên ao</th>
                <th>Diện tích (m²)</th>
                <th>Sâu (m)</th>
                <th>Mật độ tối đa</th>
                <th>Trạng thái</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {ponds.length > 0 ? (
                ponds.map((pond) => (
                  <tr key={pond.pond_id}>
                    <td><strong>{pond.pond_code}</strong></td>
                    <td>{pond.pond_name}</td>
                    <td>{pond.area_m2}</td>
                    <td>{pond.depth_m}</td>
                    <td>{pond.max_density}</td>
                    <td>
                      <span className="status-badge status-active">
                        {pond.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '5px' }}>
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => handleOpenModal(pond)}
                          title="Chỉnh sửa"
                        >
                          ✏️
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDeletePond(pond.pond_id)}
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
                  <td colSpan="7" style={{ textAlign: 'center', padding: '20px' }}>
                    Không có ao nào
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
            <h2>{selectedPond ? '✏️ Chỉnh sửa ao' : '➕ Thêm ao mới'}</h2>

            <form onSubmit={handleSubmit}>
              {/* Mã ao - chỉ hiển thị khi chỉnh sửa */}
              {selectedPond && (
                <div className="form-group">
                  <label>Mã ao</label>
                  <input
                    type="text"
                    name="pondCode"
                    value={formData.pondCode}
                    onChange={handleChange}
                    disabled
                  />
                </div>
              )}

              <div className="form-group">
                <label>Tên ao</label>
                <input
                  type="text"
                  name="pondName"
                  value={formData.pondName}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Diện tích (m²)</label>
                  <input
                    type="number"
                    step="0.01"
                    name="areaMm2"
                    value={formData.areaMm2}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Sâu (m)</label>
                  <input
                    type="number"
                    step="0.01"
                    name="depthM"
                    value={formData.depthM}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Mật độ tối đa (cá/m²)</label>
                <input
                  type="number"
                  name="maxDensity"
                  value={formData.maxDensity}
                  onChange={handleChange}
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

export default AdminPonds;
