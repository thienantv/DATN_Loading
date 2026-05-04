import React, { useState, useEffect } from 'react';
import { pondService, diseaseService } from '../../services/api';
import '../../styles/dashboard.css';

export const StaffDiseaseReport = () => {
  const [ponds, setPonds] = useState([]);
  const [diseases, setDiseases] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    pondId: '',
    diseaseId: '',
    symptoms: '',
    affectedArea: '',
    severity: 'MEDIUM',
    reportedDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [pondsRes, diseasesRes] = await Promise.all([
        pondService.getAllPonds(),
        diseaseService.getAllDiseases(),
      ]);
      setPonds(pondsRes.data.data || []);
      setDiseases(diseasesRes.data.data || []);
      if (pondsRes.data.data?.length > 0) {
        setFormData((prev) => ({
          ...prev,
          pondId: pondsRes.data.data[0].pond_id,
        }));
      }
    } catch (err) {
      setError('Lỗi tải dữ liệu');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      // Create disease report
      await diseaseService.createDiseaseReport({
        pond_id: parseInt(formData.pondId),
        disease_id: parseInt(formData.diseaseId),
        symptoms: formData.symptoms,
        affected_area: parseInt(formData.affectedArea),
        severity: formData.severity,
        reported_date: formData.reportedDate,
        reported_by: 'STAFF',
      });
      setSuccess('Báo cáo bệnh thành công. Quản lý sẽ xem xét sớm.');
      setShowModal(false);
      setFormData({
        pondId: formData.pondId,
        diseaseId: '',
        symptoms: '',
        affectedArea: '',
        severity: 'MEDIUM',
        reportedDate: new Date().toISOString().split('T')[0],
      });
      // Optionally refresh reports
      // fetchReports();
    } catch (err) {
      setError(err.response?.data?.message || 'Lỗi báo cáo bệnh');
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
        <h1>🦠 Báo cáo bệnh</h1>
        <p>Báo cáo các triệu chứng bệnh phát hiện được trong ao</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="table-container">
        <div className="table-header">
          <h2>Báo cáo bệnh của tôi</h2>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            ➕ Báo cáo bệnh
          </button>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Ao</th>
                <th>Bệnh</th>
                <th>Ngày báo cáo</th>
                <th>Độ nghiêm trọng</th>
                <th>Triệu chứng</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>
                  Chưa có báo cáo nào
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>🦠 Báo cáo bệnh mới</h2>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Ao nuôi</label>
                <select
                  value={formData.pondId}
                  onChange={(e) =>
                    setFormData({ ...formData, pondId: e.target.value })
                  }
                  required
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
                <label>Loại bệnh</label>
                <select
                  value={formData.diseaseId}
                  onChange={(e) =>
                    setFormData({ ...formData, diseaseId: e.target.value })
                  }
                  required
                >
                  <option value="">-- Chọn bệnh --</option>
                  {diseases.map((disease) => (
                    <option key={disease.disease_id} value={disease.disease_id}>
                      {disease.disease_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Triệu chứng quan sát được</label>
                <textarea
                  value={formData.symptoms}
                  onChange={(e) =>
                    setFormData({ ...formData, symptoms: e.target.value })
                  }
                  placeholder="Mô tả chi tiết các triệu chứng..."
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Vùng bị ảnh hưởng (%)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={formData.affectedArea}
                    onChange={(e) =>
                      setFormData({ ...formData, affectedArea: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Độ nghiêm trọng</label>
                  <select
                    value={formData.severity}
                    onChange={(e) =>
                      setFormData({ ...formData, severity: e.target.value })
                    }
                    required
                  >
                    <option value="MILD">⚪ Nhẹ</option>
                    <option value="MEDIUM">🟡 Trung bình</option>
                    <option value="SEVERE">🔴 Nặng</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Ngày báo cáo</label>
                <input
                  type="date"
                  value={formData.reportedDate}
                  onChange={(e) =>
                    setFormData({ ...formData, reportedDate: e.target.value })
                  }
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  💾 Gửi báo cáo
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

export default StaffDiseaseReport;
