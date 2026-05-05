import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/api';
import '../../styles/dashboard.css';

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

  if (loading && activeTab === 'training') {
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
                style={{ display: 'none' }}
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
            <div className="flex-center" style={{ minHeight: '300px' }}>
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
                              className="confidence-fill"
                              style={{ width: `${pred.confidence * 100}%` }}
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
            <div className="flex-center" style={{ minHeight: '300px' }}>
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

          <div className="info-box" style={{ marginTop: '30px' }}>
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

      <style>{`
        .tabs {
          display: flex;
          gap: 10px;
          margin-bottom: 30px;
          border-bottom: 2px solid #e5e7eb;
          background: white;
          border-radius: 8px 8px 0 0;
          padding: 10px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .tab {
          padding: 12px 20px;
          background: transparent;
          border: none;
          cursor: pointer;
          font-weight: 600;
          color: #6b7280;
          font-size: 14px;
          transition: all 0.3s;
          border-bottom: 3px solid transparent;
          margin-bottom: -10px;
        }

        .tab:hover {
          color: #3b82f6;
        }

        .tab.active {
          color: #3b82f6;
          border-bottom-color: #3b82f6;
        }

        .tab-content {
          background: white;
          border-radius: 0 0 8px 8px;
          padding: 30px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 20px;
          border-bottom: 2px solid #e5e7eb;
        }

        .section-header h2 {
          margin: 0;
          color: #1f2937;
        }

        .file-upload-label {
          cursor: pointer;
        }

        .btn-primary {
          padding: 10px 20px;
          background-color: #3b82f6;
          color: white;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 14px;
        }

        .btn-primary:hover:not(:disabled) {
          background-color: #2563eb;
          box-shadow: 0 4px 6px rgba(37, 99, 235, 0.2);
        }

        .btn-primary:disabled {
          background-color: #d1d5db;
          cursor: not-allowed;
        }

        .btn-small {
          padding: 6px 12px;
          font-size: 12px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s;
        }

        .btn-danger {
          background-color: #ef4444;
          color: white;
        }

        .btn-danger:hover {
          background-color: #dc2626;
        }

        .info-box {
          background-color: #f0f9ff;
          border: 1px solid #bae6fd;
          border-radius: 6px;
          padding: 15px;
          margin-bottom: 20px;
          color: #0c4a6e;
          font-size: 13px;
        }

        .info-box h3 {
          margin: 0 0 10px 0;
          color: #0c4a6e;
        }

        .info-box ul {
          margin: 0;
          padding-left: 20px;
        }

        .info-box li {
          margin: 5px 0;
        }

        .table-container {
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .data-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }

        .data-table thead {
          background-color: #f9fafb;
          border-bottom: 2px solid #e5e7eb;
        }

        .data-table th {
          padding: 12px;
          text-align: left;
          font-weight: 600;
          color: #374151;
        }

        .data-table td {
          padding: 12px;
          border-bottom: 1px solid #e5e7eb;
        }

        .data-table tbody tr:hover {
          background-color: #f9fafb;
        }

        .empty-cell {
          text-align: center;
          color: #9ca3af;
          padding: 40px 12px !important;
        }

        .confidence-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          height: 24px;
          background: #f3f4f6;
          border-radius: 4px;
          overflow: hidden;
        }

        .confidence-fill {
          height: 100%;
          background: linear-gradient(90deg, #10b981, #059669);
          transition: width 0.3s;
        }

        .confidence-text {
          font-weight: 600;
          color: #374151;
          font-size: 12px;
          padding: 0 8px;
          white-space: nowrap;
        }

        .model-status-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }

        .status-card {
          background: white;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          padding: 20px;
          text-align: center;
          transition: all 0.3s;
        }

        .status-card:hover {
          border-color: #3b82f6;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.1);
        }

        .status-card h3 {
          margin: 0 0 10px 0;
          color: #6b7280;
          font-size: 14px;
        }

        .status-value {
          margin: 0;
          color: #1f2937;
          font-size: 24px;
          font-weight: 700;
        }

        .status-badge {
          display: inline-block;
          padding: 6px 12px;
          border-radius: 20px;
          font-weight: 600;
          font-size: 12px;
        }

        .status-badge.ready {
          background-color: #dcfce7;
          color: #166534;
        }

        .status-badge.updating {
          background-color: #fef3c7;
          color: #b45309;
        }

        .status-badge.training {
          background-color: #dbeafe;
          color: #0c4a6e;
        }

        .status-badge.error {
          background-color: #fee2e2;
          color: #991b1b;
        }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: #9ca3af;
        }

        .flex-center {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #f3f4f6;
          border-top: 4px solid #3b82f6;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .alert {
          padding: 12px 16px;
          border-radius: 6px;
          margin-bottom: 20px;
          font-size: 14px;
        }

        .alert-error {
          background-color: #fee2e2;
          color: #991b1b;
          border: 1px solid #fecaca;
        }

        .alert-success {
          background-color: #dcfce7;
          color: #166534;
          border: 1px solid #bbf7d0;
        }
      `}</style>
    </div>
  );
};

export default AdminAI;
