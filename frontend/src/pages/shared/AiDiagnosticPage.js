import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { showToast } from '../../utils/toast';
import { pondService } from '../../services/api';
import '../../styles/ai-diagnostic.css'; // Import file CSS riêng vừa tạo

const AiDiagnosticPage = ({ roleLabel = 'Owner' }) => {
  const [ponds, setPonds] = useState([]);
  const [selectedPond, setSelectedPond] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    const fetchPonds = async () => {
      try {
        const res = await pondService.getAllPonds();
        setPonds(res?.data?.data || []);
      } catch (err) {
        console.error("Không thể tải danh sách ao", err);
      }
    };
    fetchPonds();
  }, []);

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
      showToast({ title: 'Vui lòng chọn hình ảnh tôm để phân tích', type: 'warning' });
      return;
    }

    const formData = new FormData();
    formData.append('image', selectedFile);
    if (selectedPond) {
      formData.append('pond_id', selectedPond);
    }

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
      }
    } catch (err) {
      showToast({ 
        title: err.response?.data?.message || 'Lỗi khi kết nối đến AI Server', 
        type: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setPreviewUrl('');
    setResult(null);
  };

  // Trả về hậu tố Class động dựa theo ngưỡng điểm tin cậy
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
            <p className="table-subtitle">Hệ thống Computer Vision & Google Gemini AI phân tích hình ảnh và đưa ra phác đồ ({roleLabel})</p>
          </div>
          {result && (
             <button className="btn btn-secondary" onClick={resetForm}>
               + Chẩn đoán ca mới
             </button>
          )}
        </div>

        {/* Lưới bố cục chính */}
        <div className="ai-diagnostic_layout">
          
          {/* CỘT TRÁI: FORM ĐIỀU KHIỂN */}
          <div className="ai-diagnostic_upload-card">
            <div className="product-management_form-group">
              <label>Ao nuôi liên quan (Tùy chọn)</label>
              <select value={selectedPond} onChange={(e) => setSelectedPond(e.target.value)}>
                <option value="">-- Không xác định ao --</option>
                {ponds.map(p => (
                  <option key={p.pond_id} value={p.pond_id}>{p.pond_name}</option>
                ))}
              </select>
            </div>

            <div className="product-management_form-group" style={{ marginTop: '16px' }}>
              <label>Hình ảnh mẫu vật <span className="ai-diagnostic_required">*</span></label>
              <div 
                className={`ai-diagnostic_dropzone ${previewUrl ? 'ai-diagnostic_dropzone--has-preview' : ''}`}
                onClick={() => document.getElementById('ai-image-upload').click()}
              >
                <input 
                  type="file" 
                  id="ai-image-upload" 
                  accept="image/*" 
                  style={{ display: 'none' }} 
                  onChange={handleFileChange} 
                />
                
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

            <button 
              className="btn btn-primary ai-diagnostic_btn-submit" 
              onClick={handlePredict}
              disabled={loading || !selectedFile}
            >
              {loading ? 'AI Đang Phân Tích...' : '✨ Khởi Động AI Chẩn Đoán'}
            </button>
          </div>

          {/* CỘT PHẢI: KHU VỰC HIỂN THỊ KẾT QUẢ VÀ LOGIC TRẠNG THÁI */}
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
                
                {/* Header bệnh án động */}
                <div className={`ai-diagnostic_result-header ai-diagnostic_result-header--${getStatusModifier(result.confidence)}`}>
                   <div>
                      <h2 className="ai-diagnostic_disease-name">{result.disease_name}</h2>
                      <span className="ai-diagnostic_prediction-id">Mã dự đoán: #{result.prediction_id}</span>
                   </div>
                   <div className="ai-diagnostic_confidence-block">
                      <div className="ai-diagnostic_confidence-label">Độ tin cậy AI</div>
                      <strong className={`ai-diagnostic_confidence-value ai-diagnostic_confidence-value--${getStatusModifier(result.confidence)}`}>
                        {result.confidence}%
                      </strong>
                   </div>
                </div>

                {/* Các block chi tiết lời khuyên */}
                <div className="modal-info-card ai-diagnostic_card ai-diagnostic_card--symptoms">
                    <label className="ai-diagnostic_card-label">Components 🩺 Dấu hiệu thực tế:</label>
                    <p className="ai-diagnostic_card-text">{result.symptoms}</p>
                </div>

                <div className="modal-info-card ai-diagnostic_card ai-diagnostic_card--treatment">
                    <label className="ai-diagnostic_card-label">Components 💊 Phác đồ điều trị khẩn cấp:</label>
                    <p className="ai-diagnostic_card-text">{result.treatment}</p>
                </div>

                <div className="modal-info-card ai-diagnostic_card ai-diagnostic_card--prevention">
                    <label className="ai-diagnostic_card-label">Components 🛡️ Phòng ngừa lâu dài:</label>
                    <p className="ai-diagnostic_card-text">{result.prevention}</p>
                </div>

              </div>
            )}
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default AiDiagnosticPage;