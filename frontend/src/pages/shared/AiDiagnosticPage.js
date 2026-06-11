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
  const [, setPonds] = useState([]);
  // const [ponds, setPonds] = useState([]);
  // const [selectedPond, setSelectedPond] = useState('');
  const [selectedPond] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [confidenceFilter, setConfidenceFilter] = useState('ALL');
  
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // --- STATE HỖ TRỢ ĐIỆN THOẠI (MOBILE) ---
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showMobileSourceSelector, setShowMobileSourceSelector] = useState(false);

  useEffect(() => {
    fetchPonds();
    fetchHistory();

    // Lắng nghe thay đổi kích thước màn hình
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
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
      setShowMobileSourceSelector(false); // Ẩn form khi chọn ảnh xong
    }
  };

  // Logic Xử lý khi nhấn vào khung tải ảnh
  const handleDropzoneClick = () => {
    if (isMobile) {
      // Mở Form chọn nguồn ảnh cho Mobile
      setShowMobileSourceSelector(true);
    } else {
      // Mở hộp thoại hệ thống bình thường cho Desktop
      document.getElementById('ai-image-upload-gallery').click();
    }
  };

  // Kích hoạt Camera trực tiếp
  const triggerCamera = () => {
    document.getElementById('ai-image-upload-camera').click();
  };

  // Kích hoạt Thư viện ảnh
  const triggerGallery = () => {
    document.getElementById('ai-image-upload-gallery').click();
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

// --- LOGIC LỌC DỮ LIỆU ---
  const filteredHistory = history.filter(record => {
    // 1. Lọc theo từ khóa tìm kiếm (Mã ca bệnh hoặc tên bệnh)
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm || 
      String(record.prediction_id).includes(searchLower) ||
      (record.disease_name && record.disease_name.toLowerCase().includes(searchLower));

    // 2. Lọc theo độ tin cậy
    let matchesConfidence = true;
    const conf = Number(record.confidence);
    if (confidenceFilter === 'HIGH') matchesConfidence = conf >= 80;
    else if (confidenceFilter === 'MEDIUM') matchesConfidence = conf >= 50 && conf < 80;
    else if (confidenceFilter === 'LOW') matchesConfidence = conf < 50;

    return matchesSearch && matchesConfidence;
  });

  // --- LOGIC PHÂN TRANG (Dựa trên dữ liệu đã lọc) ---
  const totalPages = Math.max(1, Math.ceil(filteredHistory.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredHistory.length);
  const paginatedHistory = filteredHistory.slice(startIndex, endIndex);

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
            {/* <div className="product-management_form-group">
              <label>Ao nuôi liên quan (Tùy chọn)</label>
              <select value={selectedPond} onChange={(e) => setSelectedPond(e.target.value)}>
                <option value="">-- Không xác định ao --</option>
                {ponds.map(p => <option key={p.pond_id} value={p.pond_id}>{p.pond_name}</option>)}
              </select>
            </div> */}

            <div className="product-management_form-group ai-diagnostic_form-group--mt">
              <label>Hình ảnh mẫu vật <span className="ai-diagnostic_required">*</span></label>
              <div 
                className={`ai-diagnostic_dropzone ${previewUrl ? 'ai-diagnostic_dropzone--has-preview' : ''}`} 
                onClick={handleDropzoneClick}
              >
                {/* 🌟 2 INPUT ẨN XỬ LÝ RIÊNG CHO CAMERA VÀ THƯ VIỆN */}
                <input type="file" id="ai-image-upload-gallery" accept="image/*" className="ai-diagnostic_hidden-input" onChange={handleFileChange} />
                <input type="file" id="ai-image-upload-camera" accept="image/*" capture="environment" className="ai-diagnostic_hidden-input" onChange={handleFileChange} />
                
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
                    <label className="ai-diagnostic_card-label">💊 Phác đồ điều trị:</label>
                    <p className="ai-diagnostic_card-text">{result.treatment}</p>
                </div>
                <div className="modal-info-card ai-diagnostic_card ai-diagnostic_card--prevention">
                    <label className="ai-diagnostic_card-label">🛡️ Biện pháp phòng ngừa:</label>
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

          {/* THANH CÔNG CỤ TÌM KIẾM VÀ LỌC */}
          <div className="ai-diagnostic_toolbar">
            <div className="ai-diagnostic_search">
              <span className="ai-diagnostic_search-icon">⌕</span>
              <input 
                type="search" 
                placeholder="Tìm theo mã ca bệnh hoặc tên bệnh..." 
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              />
            </div>
            <select 
              className="ai-diagnostic_filter"
              value={confidenceFilter}
              onChange={(e) => { setConfidenceFilter(e.target.value); setCurrentPage(1); }}
            >
              <option value="ALL">Tất cả độ tin cậy</option>
              <option value="HIGH">Độ tin cậy Cao (≥ 80%)</option>
              <option value="MEDIUM">Độ tin cậy Trung bình (50-79%)</option>
              <option value="LOW">Độ tin cậy Thấp (&lt; 50%)</option>
            </select>
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

      {/* 🌟 FORM CHỌN NGUỒN ẢNH (CHỈ HIỂN THỊ TRÊN MOBILE) */}
      {showMobileSourceSelector && (
        <div className="modal" onClick={() => setShowMobileSourceSelector(false)}>
          <div className="modal-content ai-diagnostic_mobile-options" onClick={(e) => e.stopPropagation()}>
            <h3>Nguồn tải ảnh</h3>
            
            <div className="ai-diagnostic_option-btn" onClick={triggerCamera}>
              <span className="ai-diagnostic_option-icon">📷</span>
              Chụp ảnh bằng Camera
            </div>
            
            <div className="ai-diagnostic_option-btn" onClick={triggerGallery}>
              <span className="ai-diagnostic_option-icon">🖼️</span>
              Chọn từ Thư viện ảnh
            </div>

            <button className="btn btn-secondary" style={{ width: '100%', marginTop: '8px' }} onClick={() => setShowMobileSourceSelector(false)}>
              Hủy bỏ
            </button>
          </div>
        </div>
      )}

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