import React, { useState, useEffect } from 'react';
import { diseaseService } from '../../services/api';
import '../../styles/dashboard.css';

export const AdminDiseases = () => {
  const [diseases, setDiseases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedDisease, setSelectedDisease] = useState(null);
  const [formData, setFormData] = useState({
    diseaseName: '',
    symptoms: '',
    treatment: '',
    prevention: '',
  });

  useEffect(() => {
    fetchDiseases();
  }, []);

  const fetchDiseases = async () => {
    try {
      setLoading(true);
      const response = await diseaseService.getAllDiseases();
      setDiseases(response.data.data || []);
    } catch (err) {
      setError('Lỗi tải danh sách bệnh');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (disease = null) => {
    if (disease) {
      setSelectedDisease(disease);
      setFormData({
        diseaseName: disease.disease_name || '',
        symptoms: disease.symptoms || '',
        treatment: disease.treatment || '',
        prevention: disease.prevention || '',
      });
    } else {
      setSelectedDisease(null);
      setFormData({
        diseaseName: '',
        symptoms: '',
        treatment: '',
        prevention: '',
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      const data = {
        disease_name: formData.diseaseName,
        symptoms: formData.symptoms,
        treatment: formData.treatment,
        prevention: formData.prevention,
      };

      if (selectedDisease) {
        await diseaseService.updateDisease(selectedDisease.disease_id, data);
        setSuccess('Cập nhật bệnh thành công');
      } else {
        await diseaseService.createDisease(data);
        setSuccess('Tạo bệnh mới thành công');
      }
      setShowModal(false);
      fetchDiseases();
    } catch (err) {
      setError(err.response?.data?.message || 'Lỗi xử lý');
    }
  };

  const handleDeleteDisease = async (diseaseId) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa bệnh này?')) {
      try {
        await diseaseService.deleteDisease(diseaseId);
        setSuccess('Xóa bệnh thành công');
        fetchDiseases();
      } catch (err) {
        setError('Lỗi xóa bệnh');
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
        <h1>🏥 Quản lý loại bệnh</h1>
        <p>Quản lý danh mục bệnh tôm</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="table-container">
        <div className="table-header">
          <h2>Danh sách loại bệnh</h2>
          <button className="btn btn-primary" onClick={() => handleOpenModal()}>
            ➕ Thêm bệnh
          </button>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Tên bệnh</th>
                <th>Triệu chứng</th>
                <th>Điều trị</th>
                <th>Dự phòng</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {diseases.length > 0 ? (
                diseases.map((disease) => (
                  <tr key={disease.disease_id}>
                    <td><strong>{disease.disease_name}</strong></td>
                    <td>{disease.symptoms}</td>
                    <td>{disease.treatment}</td>
                    <td>{disease.prevention}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '5px' }}>
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => handleOpenModal(disease)}
                        >
                          ✏️
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDeleteDisease(disease.disease_id)}
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>
                    Không có bệnh nào
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
            <h2>{selectedDisease ? '✏️ Chỉnh sửa bệnh' : '➕ Thêm bệnh mới'}</h2>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Tên bệnh</label>
                <input
                  type="text"
                  value={formData.diseaseName}
                  onChange={(e) =>
                    setFormData({ ...formData, diseaseName: e.target.value })
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label>Triệu chứng</label>
                <textarea
                  value={formData.symptoms}
                  onChange={(e) =>
                    setFormData({ ...formData, symptoms: e.target.value })
                  }
                />
              </div>

              <div className="form-group">
                <label>Điều trị</label>
                <textarea
                  value={formData.treatment}
                  onChange={(e) =>
                    setFormData({ ...formData, treatment: e.target.value })
                  }
                />
              </div>

              <div className="form-group">
                <label>Dự phòng</label>
                <textarea
                  value={formData.prevention}
                  onChange={(e) =>
                    setFormData({ ...formData, prevention: e.target.value })
                  }
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

export default AdminDiseases;
