import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { showToast } from '../../utils/toast';
import { pondService } from '../../services/api';
import '../../styles/ai-diagnostic.css'; 

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh',
  }).format(date);
};

const AiDiagnosticPage = ({ roleLabel = 'Owner' }) => {
  const [ponds, setPonds] = useState([]);
  const [selectedPond, setSelectedPond] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    fetchPonds();
    fetchHistory();
  }, []);

  const fetchPonds = async () => {
    try {
      const res = await pondService.getAllPonds();
      setPonds(res?.data?.data || []);
    } catch (err) {
      console.error("Không thể tải danh sách ao", err);
    }
  };

  const fetchHistory = async () => {
    try {
      setLoadingHistory(true);
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:3000/api/diseases/history', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setHistory(res?.data?.data || []);
    } catch (err) {
      console.error("Chưa tải được lịch sử", err);
      setHistory([]); 
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setResult(null);
    }
  };

  const handlePredict = async () => {
    if (!selectedFile) {
      return showToast({ title: 'Vui lòng chọn hình ảnh tôm để phân tích', type: 'warning' });
    }

    const formData = new FormData();
    formData.append('image', selectedFile);
    if (selectedPond) formData.append('pond_id', selectedPond);

    try {
      setLoading(true);
      const token = localStorage.getItem('token'); 
      const response = await axios.post('http://localhost:3000/api/diseases/predict', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.success) {
        setResult(response.data.data);
        showToast({ title: 'AI phân tích thành công!', type: 'success' });
        fetchHistory();
      }
    } catch (err) {
      showToast({ title: err.response?.data?.message || 'Lỗi khi kết nối đến AI Server', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setPreviewUrl('');
    setResult(null);
  };

  const totalPages = Math.max(1, Math.ceil(history.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, history.length);
  const paginatedHistory = history.slice(startIndex, endIndex);

  const getConfidenceBadge = (conf) => {
    const val = Number(conf);
    if (val >= 80) return <span className="ai-badge ai-badge--high">{val}% (Cao)</span>;
    if (val >= 50) return <span className="ai-badge ai-badge--medium">{val}% (Trung bình)</span>;
    return <span className="ai-badge ai-badge--low">{val}% (Thấp)</span>;
  };

  const getStatusModifier = (conf) => {
    if (conf >= 80) return 'success';
    if (conf >= 50) return 'warning';
    return 'danger';
  };

  return (
    <div className="dashboard admin-page ai-diagnostic_page">
      <div className="table-container table-panel">
        
        <div className="table-header">
          <div>
            <h1>Chuyên gia AI Chẩn Đoán</h1>
            <p className="table-subtitle">Hệ thống Computer Vision & Google Gemini AI phân tích hình ảnh ({roleLabel})</p>
          </div>
          {result && (
             <button className="btn btn-secondary" onClick={resetForm}>+ Chẩn đoán ca mới</button>
          )}
        </div>

        <div className="ai-diagnostic_layout">
          <div className="ai-diagnostic_upload-card">
            <div className="product-management_form-group">
              <label>Ao nuôi liên quan (Tùy chọn)</label>
              <select value={selectedPond} onChange={(e) => setSelectedPond(e.target.value)}>
                <option value="">-- Không xác định ao --</option>
                {ponds.map(p => <option key={p.pond_id} value={p.pond_id}>{p.pond_name}</option>)}
              </select>
            </div>

            <div className="product-management_form-group ai-diagnostic_form-group--mt">
              <label>Hình ảnh mẫu vật <span className="ai-diagnostic_required">*</span></label>
              <div className={`ai-diagnostic_dropzone ${previewUrl ? 'ai-diagnostic_dropzone--has-preview' : ''}`} onClick={() => document.getElementById('ai-image-upload').click()}>
                <input type="file" id="ai-image-upload" accept="image/*" className="ai-diagnostic_hidden-input" onChange={handleFileChange} />
                {previewUrl ? (
                  <img src={previewUrl} alt="Preview" className="ai-diagnostic_preview-image" />
                ) : (
                  <>
                    <span className="ai-diagnostic_dropzone-icon">📸</span>
                    <span className="ai-diagnostic_dropzone-text">Nhấn để chọn ảnh tôm</span>
                    <span className="ai-diagnostic_dropzone-subtext">Hỗ trợ JPG, PNG (Max: 5MB)</span>
                  </>
                )}
              </div>
            </div>

            <button className="btn btn-primary ai-diagnostic_btn-submit" onClick={handlePredict} disabled={loading || !selectedFile}>
              {loading ? 'AI Đang Phân Tích...' : '✨ Khởi Động AI Chẩn Đoán'}
            </button>
          </div>

          <div>
            {!result && !loading && (
              <div className="ai-diagnostic_empty-state">
                <span className="ai-diagnostic_empty-icon">🤖</span>
                <p>Tải ảnh lên và nhấn Khởi động để nhận phác đồ điều trị từ Bác sĩ AI</p>
              </div>
            )}

            {loading && (
              <div className="ai-diagnostic_loading-state">
                 <div className="spinner ai-diagnostic_spinner"></div>
                 <p className="ai-diagnostic_loading-text">Gemini đang suy luận phác đồ điều trị...</p>
              </div>
            )}

            {result && !loading && (
              <div className="ai-diagnostic_result-grid">
                <div className={`ai-diagnostic_result-header ai-diagnostic_result-header--${getStatusModifier(result.confidence)}`}>
                   <div>
                      <h2 className="ai-diagnostic_disease-name">{result.disease_name}</h2>
                      <span className="ai-diagnostic_prediction-id">Mã dự đoán: #{result.prediction_id}</span>
                   </div>
                   <div className="ai-diagnostic_confidence-block">
                      <div className="ai-diagnostic_confidence-label">Độ tin cậy AI</div>
                      <strong className={`ai-diagnostic_confidence-value ai-diagnostic_confidence-value--${getStatusModifier(result.confidence)}`}>{result.confidence}%</strong>
                   </div>
                </div>

                <div className="modal-info-card ai-diagnostic_card ai-diagnostic_card--symptoms">
                    <label className="ai-diagnostic_card-label">🩺 Dấu hiệu thực tế:</label>
                    <p className="ai-diagnostic_card-text">{result.symptoms}</p>
                </div>
                <div className="modal-info-card ai-diagnostic_card ai-diagnostic_card--treatment">
                    <label className="ai-diagnostic_card-label">💊 Phác đồ điều trị khẩn cấp:</label>
                    <p className="ai-diagnostic_card-text">{result.treatment}</p>
                </div>
                <div className="modal-info-card ai-diagnostic_card ai-diagnostic_card--prevention">
                    <label className="ai-diagnostic_card-label">🛡️ Phòng ngừa lâu dài:</label>
                    <p className="ai-diagnostic_card-text">{result.prevention}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="ai-diagnostic_history-section">
          <div className="ai-diagnostic_history-header">
            <h3>Lịch sử chẩn đoán bệnh tật</h3>
            <p>Danh sách các mẫu vật đã được AI phân tích trước đây.</p>
          </div>

          <div className="table-wrapper">
            <table className="table-base">
              <thead>
                <tr>
                  <th className="ai-diagnostic_th-image">Hình ảnh</th>
                  <th>Mã ca bệnh</th>
                  <th>Kết quả (Tên bệnh)</th>
                  <th>Độ tin cậy</th>
                  <th>Ngày chẩn đoán</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {loadingHistory ? (
                  <tr><td colSpan="6" className="ai-diagnostic_td-loading">Đang tải lịch sử...</td></tr>
                ) : paginatedHistory.length === 0 ? (
                  <tr><td colSpan="6" className="ai-diagnostic_td-empty">Chưa có lịch sử chẩn đoán nào.</td></tr>
                ) : (
                  paginatedHistory.map((record) => (
                    <tr key={record.prediction_id}>
                      <td>
                        {record.image_url ? (
                          <img src={`http://localhost:3000${record.image_url}`} alt="Mẫu vật" className="ai-diagnostic_thumbnail" />
                        ) : (
                          <div className="ai-diagnostic_thumbnail ai-diagnostic_thumbnail--fallback">🦐</div>
                        )}
                      </td>
                      <td><strong>#{record.prediction_id}</strong></td>
                      <td className="ai-diagnostic_td-disease">{record.disease_name || 'Bệnh lạ'}</td>
                      <td>{getConfidenceBadge(record.confidence)}</td>
                      <td>{formatDateTime(record.predicted_at)}</td>
                      <td>
                        <div className="table-actions">
                          <button 
                            className="table-action-btn table-action-btn--view" 
                            title="Xem chi tiết bệnh án" 
                            onClick={() => {
                              setSelectedRecord(record);
                              setShowDetailModal(true);
                            }}
                          >
                            👁
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="table-pagination">
            <div className="table-pagination-left">
              <span>Số mục trên trang</span>
              <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}>
                {[5, 10, 20, 50].map((size) => <option key={size} value={size}>{size}</option>)}
              </select>
              <span>{history.length === 0 ? 0 : startIndex + 1}-{endIndex} / {history.length}</span>
            </div>
            <div className="table-pagination-right">
              <button className="btn btn-sm btn-secondary" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safePage <= 1}>‹</button>
              <span className="table-page-pill">{safePage}</span>
              <button className="btn btn-sm btn-secondary" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages}>›</button>
            </div>
          </div>
        </div>
      </div>

      {showDetailModal && selectedRecord && (
        <div className="modal" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content product-management_modal-content ai-diagnostic_modal-content--large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header ai-diagnostic_modal-header">
              <h2>Hồ sơ bệnh án chi tiết #{selectedRecord.prediction_id}</h2>
              <p className="ai-diagnostic_modal-subtitle">Được chẩn đoán vào lúc {formatDateTime(selectedRecord.predicted_at)}</p>
            </div>

            {selectedRecord.image_url && (
              <img src={`http://localhost:3000${selectedRecord.image_url}`} alt="Mẫu vật" className="ai-diagnostic_modal-image" />
            )}

            <div className="ai-diagnostic_modal-grid">
              <div className="modal-info-card">
                <label>Kết quả chẩn đoán</label>
                <strong className="ai-diagnostic_result-text">{selectedRecord.disease_name || 'Bệnh lạ'}</strong>
              </div>
              <div className="modal-info-card">
                <label>Độ tin cậy AI</label>
                <div className="ai-diagnostic_badge-wrap">{getConfidenceBadge(selectedRecord.confidence)}</div>
              </div>
            </div>

            <div className="ai-diagnostic_modal-grid" style={{ gap: '12px' }}>
              <div className="modal-info-card ai-diagnostic_modal-full ai-diagnostic_card--symptoms">
                <label className="ai-diagnostic_card-label">🩺 Dấu hiệu thực tế:</label>
                <p className="ai-diagnostic_card-text">{selectedRecord.symptoms || 'Chưa có thông tin'}</p>
              </div>
              <div className="modal-info-card ai-diagnostic_modal-full ai-diagnostic_card--treatment">
                <label className="ai-diagnostic_card-label">💊 Phác đồ điều trị:</label>
                <p className="ai-diagnostic_card-text">{selectedRecord.treatment || 'Chưa có thông tin'}</p>
              </div>
              <div className="modal-info-card ai-diagnostic_modal-full ai-diagnostic_card--prevention">
                <label className="ai-diagnostic_card-label">🛡️ Biện pháp phòng ngừa:</label>
                <p className="ai-diagnostic_card-text">{selectedRecord.prevention || 'Chưa có thông tin'}</p>
              </div>
            </div>

            <div className="modal-actions ai-diagnostic_modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowDetailModal(false)}>Đóng bệnh án</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AiDiagnosticPage;