import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/api';
import '../../styles/dashboard.css';
import '../../styles/admin/admin-ai.css';
import '../../styles/admin-layout.css';

export const AdminAI = () => {
  const [activeTab, setActiveTab] = useState('training');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Training Data State
  const [trainingData, setTrainingData] = useState([]);
  const [uploadingFile, setUploadingFile] = useState(false);

  // Predictions State
  const [predictions, setPredictions] = useState([]);
  const [predictionsLoading, setPredictionsLoading] = useState(false);

  // Model State
  const [modelStatus, setModelStatus] = useState(null);
  const [modelLoading, setModelLoading] = useState(false);
  const [updatingModel, setUpdatingModel] = useState(false);

  useEffect(() => {
    if (activeTab === 'training') {
      fetchTrainingData();
    } else if (activeTab === 'predictions') {
      fetchPredictions();
    } else if (activeTab === 'model') {
      fetchModelStatus();
    }
  }, [activeTab]);

  // Training Data Functions
  const fetchTrainingData = async () => {
    try {
      setLoading(true);
      const response = await adminService.getTrainingData();
      setTrainingData(response.data.data || []);
    } catch (err) {
      setError('Lỗi tải dữ liệu huấn luyện');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploadingFile(true);
      await adminService.uploadTrainingData(formData);
      setSuccess('Upload dữ liệu huấn luyện thành công');
      fetchTrainingData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Lỗi upload dữ liệu');
      console.error(err);
    } finally {
      setUploadingFile(false);
    }
  };

  const handleDeleteTrainingData = async (dataId) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa dữ liệu này?')) {
      try {
        await adminService.deleteTrainingData(dataId);
        setSuccess('Xóa dữ liệu thành công');
        fetchTrainingData();
        setTimeout(() => setSuccess(null), 3000);
      } catch (err) {
        setError('Lỗi xóa dữ liệu');
      }
    }
  };

  // Predictions Functions
  const fetchPredictions = async () => {
    try {
      setPredictionsLoading(true);
      const response = await adminService.getPredictionHistory();
      setPredictions(response.data.data || []);
    } catch (err) {
      setError('Lỗi tải lịch sử dự đoán');
      console.error(err);
    } finally {
      setPredictionsLoading(false);
    }
  };

  // Model Functions
  const fetchModelStatus = async () => {
    try {
      setModelLoading(true);
      const response = await adminService.getModelStatus();
      setModelStatus(response.data.data);
    } catch (err) {
      setError('Lỗi tải trạng thái model');
      console.error(err);
    } finally {
      setModelLoading(false);
    }
  };

  const handleUpdateModel = async () => {
    if (window.confirm('Bạn có chắc chắn muốn cập nhật model? Quá trình này có thể mất vài phút.')) {
      try {
        setUpdatingModel(true);
        await adminService.updateAIModel();
        setSuccess('Cập nhật model thành công');
        fetchModelStatus();
        setTimeout(() => setSuccess(null), 3000);
      } catch (err) {
        setError('Lỗi cập nhật model');
      } finally {
        setUpdatingModel(false);
      }
    }
  };

  const getConfidenceBucket = (confidence) => {
    const percentage = Math.round((Number(confidence) || 0) * 100 / 10) * 10;
    return Math.max(0, Math.min(100, percentage));
  };

  if (loading && activeTab === 'training') {
    return (
      <div className="dashboard">
        <div className="flex-center admin-ai__loading-container--training">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard admin-page">
      <div className="dashboard-header">
        <h1>🤖 Quản lý AI & Machine Learning</h1>
        <p>Quản lý dữ liệu huấn luyện và mô hình dự đoán</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'training' ? 'active' : ''}`}
          onClick={() => setActiveTab('training')}
        >
          📊 Dữ liệu huấn luyện
        </button>
        <button
          className={`tab ${activeTab === 'predictions' ? 'active' : ''}`}
          onClick={() => setActiveTab('predictions')}
        >
          🔮 Lịch sử dự đoán
        </button>
        <button
          className={`tab ${activeTab === 'model' ? 'active' : ''}`}
          onClick={() => setActiveTab('model')}
        >
          ⚙️ Trạng thái Model
        </button>
      </div>

      {/* Training Data Tab */}
      {activeTab === 'training' && (
        <div className="tab-content">
          <div className="section-header">
            <h2>📊 Quản lý dữ liệu huấn luyện</h2>
            <label className="file-upload-label">
              <span className="btn-primary">➕ Upload dữ liệu</span>
              <input
                type="file"
                accept=".csv,.json"
                onChange={handleUploadFile}
                disabled={uploadingFile}
                className="admin-ai__file-input"
              />
            </label>
          </div>

          <div className="info-box">
            <p>
              💡 <strong>Hướng dẫn:</strong> Tải lên file CSV hoặc JSON chứa dữ liệu huấn luyện cho mô hình AI. 
              Định dạng: [disease, symptom1, symptom2, ...]
            </p>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Tên file</th>
                  <th>Kích thước</th>
                  <th>Ngày tải lên</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {trainingData.length > 0 ? (
                  trainingData.map((data) => (
                    <tr key={data.id}>
                      <td>{data.id}</td>
                      <td>{data.filename}</td>
                      <td>{(data.size / 1024).toFixed(2)} KB</td>
                      <td>{new Date(data.created_at).toLocaleString('vi-VN')}</td>
                      <td>
                        <button
                          className="btn-small btn-danger"
                          onClick={() => handleDeleteTrainingData(data.id)}
                        >
                          🗑️ Xóa
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="empty-cell">
                      Chưa có dữ liệu huấn luyện nào
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Predictions Tab */}
      {activeTab === 'predictions' && (
        <div className="tab-content">
          <div className="section-header">
            <h2>🔮 Lịch sử dự đoán bệnh</h2>
            <button className="btn-primary" onClick={fetchPredictions}>
              🔄 Làm mới
            </button>
          </div>

          {predictionsLoading ? (
            <div className="flex-center admin-ai__loading-container--predictions">
              <div className="spinner"></div>
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Bệnh dự đoán</th>
                    <th>Độ tin cậy</th>
                    <th>Triệu chứng</th>
                    <th>Ngày dự đoán</th>
                  </tr>
                </thead>
                <tbody>
                  {predictions.length > 0 ? (
                    predictions.map((pred) => (
                      <tr key={pred.id}>
                        <td>{pred.id}</td>
                        <td>{pred.disease_name}</td>
                        <td>
                          <div className="confidence-bar">
                            <div
                              className={`confidence-fill admin-ai__confidence-bar-fill admin-ai__confidence-bar-fill--${getConfidenceBucket(pred.confidence)}`}
                            ></div>
                            <span className="confidence-text">{(pred.confidence * 100).toFixed(1)}%</span>
                          </div>
                        </td>
                        <td>{pred.symptoms}</td>
                        <td>{new Date(pred.created_at).toLocaleString('vi-VN')}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="empty-cell">
                        Chưa có dữ liệu dự đoán nào
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Model Status Tab */}
      {activeTab === 'model' && (
        <div className="tab-content">
          <div className="section-header">
            <h2>⚙️ Trạng thái và quản lý Model</h2>
            <button
              className="btn-primary"
              onClick={handleUpdateModel}
              disabled={updatingModel}
            >
              {updatingModel ? '⏳ Đang cập nhật...' : '🚀 Cập nhật Model'}
            </button>
          </div>

          {modelLoading ? (
            <div className="flex-center admin-ai__loading-container--model">
              <div className="spinner"></div>
            </div>
          ) : modelStatus ? (
            <div className="model-status-grid">
              <div className="status-card">
                <h3>📦 Phiên bản Model</h3>
                <p className="status-value">{modelStatus.version || 'N/A'}</p>
              </div>

              <div className="status-card">
                <h3>🎯 Độ chính xác</h3>
                <p className="status-value">{(modelStatus.accuracy * 100).toFixed(2)}%</p>
              </div>

              <div className="status-card">
                <h3>📊 Số dữ liệu huấn luyện</h3>
                <p className="status-value">{modelStatus.training_samples}</p>
              </div>

              <div className="status-card">
                <h3>⏰ Lần cập nhật cuối</h3>
                <p className="status-value">
                  {modelStatus.last_updated
                    ? new Date(modelStatus.last_updated).toLocaleString('vi-VN')
                    : 'Chưa cập nhật'}
                </p>
              </div>

              <div className="status-card">
                <h3>🔄 Trạng thái</h3>
                <p className={`status-badge ${modelStatus.status.toLowerCase()}`}>
                  {modelStatus.status === 'READY' && '✅ Sẵn sàng'}
                  {modelStatus.status === 'UPDATING' && '⏳ Đang cập nhật'}
                  {modelStatus.status === 'TRAINING' && '🔄 Đang huấn luyện'}
                  {modelStatus.status === 'ERROR' && '❌ Lỗi'}
                </p>
              </div>

              <div className="status-card">
                <h3>🎯 F1 Score</h3>
                <p className="status-value">{(modelStatus.f1_score * 100).toFixed(2)}%</p>
              </div>
            </div>
          ) : (
            <div className="empty-state">Không có dữ liệu model</div>
          )}

          <div className="info-box admin-ai__info-box-margin">
            <h3>ℹ️ Thông tin về cập nhật Model</h3>
            <ul>
              <li>Cập nhật model sẽ sử dụng tất cả dữ liệu huấn luyện được tải lên</li>
              <li>Quá trình này có thể mất từ 5 đến 30 phút tùy thuộc vào lượng dữ liệu</li>
              <li>Model sẽ được validate tự động sau khi huấn luyện xong</li>
              <li>Nếu độ chính xác thấp hơn model cũ, cập nhật sẽ được hủy</li>
            </ul>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminAI;
