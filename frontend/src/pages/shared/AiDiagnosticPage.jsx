import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { showToast } from '../../utils/toast';
import { pondService } from '../../services/api';


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
      setShowMobileSourceSelector(false); 
    }
  };

  const handleDropzoneClick = () => {
    if (isMobile) {
      setShowMobileSourceSelector(true);
    } else {
      document.getElementById('ai-image-upload-gallery').click();
    }
  };

  const triggerCamera = () => document.getElementById('ai-image-upload-camera').click();
  const triggerGallery = () => document.getElementById('ai-image-upload-gallery').click();

  const handlePredict = async () => {
    if (!selectedFile) return showToast({ title: 'Vui lòng chọn hình ảnh', type: 'warning' });

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
      showToast({ title: err.response?.data?.message || 'Lỗi kết nối AI Server', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setPreviewUrl('');
    setResult(null);
  };

  // --- LỌC DỮ LIỆU ---
  const filteredHistory = history.filter(record => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm || 
      String(record.prediction_id).includes(searchLower) ||
      (record.disease_name && record.disease_name.toLowerCase().includes(searchLower));

    let matchesConfidence = true;
    const conf = Number(record.confidence);
    if (confidenceFilter === 'HIGH') matchesConfidence = conf >= 80;
    else if (confidenceFilter === 'MEDIUM') matchesConfidence = conf >= 50 && conf < 80;
    else if (confidenceFilter === 'LOW') matchesConfidence = conf < 50;

    return matchesSearch && matchesConfidence;
  });

  const totalPages = Math.max(1, Math.ceil(filteredHistory.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredHistory.length);
  const paginatedHistory = filteredHistory.slice(startIndex, endIndex);

  // --- HELPER RENDER ---
  const getConfidenceBadge = (conf) => {
    const val = Number(conf);
    if (val >= 80) return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">{val}% (Cao)</span>;
    if (val >= 50) return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700">{val}% (TB)</span>;
    return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">{val}% (Thấp)</span>;
  };

  const getBorderColor = (conf) => {
    if (conf >= 80) return 'border-emerald-500';
    if (conf >= 50) return 'border-amber-500';
    return 'border-red-500';
  };
  
  const getTextColor = (conf) => {
    if (conf >= 80) return 'text-emerald-600';
    if (conf >= 50) return 'text-amber-600';
    return 'text-red-600';
  };

  return (
    <div className="p-4 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-5 md:p-8">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight">Chuyên gia AI Chẩn Đoán</h1>
            <p className="text-slate-500 text-sm md:text-base mt-1">Hệ thống Computer Vision & Google Gemini AI phân tích hình ảnh ({roleLabel})</p>
          </div>
          {result && (
             <button 
                className="px-5 py-2.5 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-colors flex items-center gap-2" 
                onClick={resetForm}
              >
                <span>+</span> Chẩn đoán ca mới
              </button>
          )}
        </div>

        {/* TOP LAYOUT: UPLOAD & KẾT QUẢ */}
        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-8 items-start">
          
          {/* CỘT TRÁI: UPLOAD PANEL */}
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
            <div className="flex flex-col gap-2 mb-5">
              <label className="text-sm font-bold text-slate-700">Ao nuôi liên quan (Tùy chọn)</label>
              <select 
                className="w-full p-3 border border-slate-300 rounded-xl outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200 bg-white transition-all text-slate-700 font-medium"
                value={selectedPond} 
                onChange={(e) => setSelectedPond(e.target.value)}
              >
                <option value="">-- Không xác định ao --</option>
                {ponds.map(p => <option key={p.pond_id} value={p.pond_id}>{p.pond_name}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-slate-700">
                Hình ảnh mẫu vật <span className="text-red-500 ml-0.5">*</span>
              </label>
              
              <div 
                className={`relative overflow-hidden border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer bg-white transition-all hover:border-sky-500 hover:bg-sky-50 ${previewUrl ? 'p-2 border-slate-300' : 'p-12 border-slate-300'}`}
                onClick={handleDropzoneClick}
              >
                <input type="file" id="ai-image-upload-gallery" accept="image/*" className="hidden" onChange={handleFileChange} />
                <input type="file" id="ai-image-upload-camera" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
                
                {previewUrl ? (
                  <img src={previewUrl} alt="Preview" className="w-full h-[220px] object-cover rounded-xl shadow-sm" />
                ) : (
                  <>
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-3xl mb-3 shadow-sm border border-slate-200">📸</div>
                    <span className="text-slate-700 font-bold text-base">Nhấn để chọn ảnh tôm</span>
                    <span className="text-slate-400 text-xs mt-1.5 font-medium">Hỗ trợ JPG, PNG (Max: 5MB)</span>
                  </>
                )}
              </div>
            </div>

            <button 
              className="w-full mt-6 px-4 py-3.5 bg-sky-500 text-white text-base font-bold rounded-xl hover:bg-sky-600 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-sky-500/20" 
              onClick={handlePredict} 
              disabled={loading || !selectedFile}
            >
              {loading ? 'AI Đang Phân Tích...' : '✨ Khởi Động AI Chẩn Đoán'}
            </button>
          </div>

          {/* CỘT PHẢI: KẾT QUẢ DỰ ĐOÁN */}
          <div className="h-full min-h-[300px]">
            {!result && !loading && (
              <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 py-16 px-6 text-center">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-4xl mb-4 shadow-sm border border-slate-200 grayscale opacity-50">🤖</div>
                <p className="text-slate-500 font-medium max-w-sm">Tải ảnh lên và nhấn Khởi động để nhận phác đồ điều trị từ Bác sĩ AI</p>
              </div>
            )}

            {loading && (
              <div className="h-full flex flex-col items-center justify-center py-16 bg-slate-50 rounded-2xl border border-slate-100">
                 <div className="w-12 h-12 border-4 border-slate-200 border-t-sky-500 rounded-full animate-spin mb-5"></div>
                 <p className="text-sky-600 font-bold text-lg animate-pulse">Gemini đang hội chẩn phác đồ...</p>
              </div>
            )}

            {result && !loading && (
              <div className="flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-300">
                <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-5 rounded-2xl border-l-8 shadow-sm border border-slate-200 ${getBorderColor(result.confidence)}`}>
                   <div>
                      <h2 className="text-2xl font-extrabold text-slate-800 m-0">{result.disease_name}</h2>
                      <span className="inline-block mt-1 px-2.5 py-0.5 bg-slate-100 text-slate-500 text-xs font-bold rounded-md">Mã ca bệnh: #{result.prediction_id}</span>
                   </div>
                   <div className="mt-4 sm:mt-0 flex flex-col sm:items-end w-full sm:w-auto">
                      <div className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-0.5">Độ tin cậy AI</div>
                      <strong className={`text-3xl font-black ${getTextColor(result.confidence)}`}>{result.confidence}%</strong>
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2 bg-amber-50/80 border border-amber-200 p-5 rounded-2xl">
                      <label className="flex items-center gap-2 text-amber-800 font-bold mb-2.5 text-base"><span className="text-xl">🩺</span> Dấu hiệu thực tế:</label>
                      <p className="text-slate-700 leading-relaxed m-0 whitespace-pre-line text-sm md:text-base">{result.symptoms}</p>
                  </div>
                  <div className="bg-blue-50/80 border border-blue-200 p-5 rounded-2xl">
                      <label className="flex items-center gap-2 text-blue-800 font-bold mb-2.5 text-base"><span className="text-xl">💊</span> Phác đồ điều trị:</label>
                      <p className="text-slate-700 leading-relaxed font-medium m-0 whitespace-pre-line text-sm md:text-base">{result.treatment}</p>
                  </div>
                  <div className="bg-emerald-50/80 border border-emerald-200 p-5 rounded-2xl">
                      <label className="flex items-center gap-2 text-emerald-800 font-bold mb-2.5 text-base"><span className="text-xl">🛡️</span> Biện pháp phòng ngừa:</label>
                      <p className="text-slate-700 leading-relaxed m-0 whitespace-pre-line text-sm md:text-base">{result.prevention}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* BOTTOM LAYOUT: LỊCH SỬ CHẨN ĐOÁN */}
        <div className="mt-12 pt-8 border-t border-slate-200">
          <div className="mb-6">
            <h3 className="text-xl font-extrabold text-slate-800 m-0 mb-1.5">Lịch sử chẩn đoán bệnh tật</h3>
            <p className="text-slate-500 text-sm font-medium m-0">Tra cứu danh sách các mẫu vật đã được AI phân tích trước đây.</p>
          </div>

          {/* Thanh công cụ Tìm kiếm & Lọc */}
          <div className="flex flex-col sm:flex-row gap-4 mb-5">
            <div className="relative flex-1 min-w-[250px]">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg pointer-events-none">⌕</span>
              <input 
                type="search" 
                placeholder="Tìm theo mã ca bệnh hoặc tên bệnh..." 
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200 transition-all font-medium text-slate-700"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              />
            </div>
            <select 
              className="px-4 py-2.5 border border-slate-300 rounded-xl text-sm outline-none bg-white cursor-pointer w-full sm:w-auto focus:border-sky-500 focus:ring-2 focus:ring-sky-200 transition-all font-medium text-slate-700"
              value={confidenceFilter}
              onChange={(e) => { setConfidenceFilter(e.target.value); setCurrentPage(1); }}
            >
              <option value="ALL">Tất cả độ tin cậy</option>
              <option value="HIGH">Tin cậy Cao (≥ 80%)</option>
              <option value="MEDIUM">Tin cậy Trung bình (50-79%)</option>
              <option value="LOW">Tin cậy Thấp (&lt; 50%)</option>
            </select>
          </div>

          {/* Bảng dữ liệu - Cải tiến Layout tránh rớt chữ */}
          <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-sm">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3.5 text-sm font-bold text-slate-600 w-[90px] text-center">Hình ảnh</th>
                  <th className="px-4 py-3.5 text-sm font-bold text-slate-600 whitespace-nowrap">Mã ca bệnh</th>
                  <th className="px-4 py-3.5 text-sm font-bold text-slate-600">Kết quả (Tên bệnh)</th>
                  <th className="px-4 py-3.5 text-sm font-bold text-slate-600 whitespace-nowrap">Độ tin cậy</th>
                  <th className="px-4 py-3.5 text-sm font-bold text-slate-600 whitespace-nowrap">Ngày chẩn đoán</th>
                  <th className="px-4 py-3.5 text-sm font-bold text-slate-600 text-center w-[100px]">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {loadingHistory ? (
                  <tr><td colSpan="6" className="p-8 text-center text-slate-500 font-medium">Đang tải lịch sử...</td></tr>
                ) : paginatedHistory.length === 0 ? (
                  <tr><td colSpan="6" className="p-12 text-center text-slate-500 font-medium">Chưa có lịch sử chẩn đoán nào phù hợp.</td></tr>
                ) : (
                  paginatedHistory.map((record) => (
                    <tr key={record.prediction_id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-4 py-3 text-center">
                        {record.image_url ? (
                          <img 
                            src={`http://localhost:3000${record.image_url}`} 
                            alt="Mẫu" 
                            className="w-[50px] h-[50px] min-w-[50px] shrink-0 object-cover rounded-lg border border-slate-200 bg-slate-50 mx-auto block shadow-sm group-hover:border-sky-300 transition-colors" 
                          />
                        ) : (
                          <div className="w-[50px] h-[50px] min-w-[50px] shrink-0 flex items-center justify-center text-xl bg-slate-50 border border-slate-200 rounded-lg mx-auto shadow-sm">🦐</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-slate-700 whitespace-nowrap">#{record.prediction_id}</td>
                      <td className="px-4 py-3 text-sm font-bold text-slate-800 line-clamp-2 leading-relaxed">{record.disease_name || 'Bệnh lạ'}</td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap">{getConfidenceBadge(record.confidence)}</td>
                      <td className="px-4 py-3 text-sm font-medium text-slate-500 whitespace-nowrap">{formatDateTime(record.predicted_at)}</td>
                      <td className="px-4 py-3 text-center">
                          <button 
                            className="w-9 h-9 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-sky-50 hover:text-sky-600 hover:border-sky-200 flex items-center justify-center mx-auto transition-all shadow-sm"
                            title="Xem chi tiết" 
                            onClick={() => { setSelectedRecord(record); setShowDetailModal(true); }}
                          >
                            👁
                          </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Phân trang */}
          <div className="flex flex-col sm:flex-row justify-between items-center mt-5 gap-4 text-sm text-slate-600 font-medium">
            <div className="flex items-center gap-3">
              <span>Hiển thị</span>
              <select 
                className="border border-slate-300 rounded-lg px-2.5 py-1.5 outline-none bg-white focus:border-sky-500 focus:ring-1 focus:ring-sky-200"
                value={pageSize} 
                onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              >
                {[5, 10, 20, 50].map((size) => <option key={size} value={size}>{size}</option>)}
              </select>
              <span>{filteredHistory.length === 0 ? 0 : startIndex + 1}-{endIndex} trên {filteredHistory.length} mục</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button className="px-3 py-1.5 border border-slate-200 bg-white rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safePage <= 1}>Trang trước</button>
              <span className="px-3.5 py-1.5 font-bold text-sky-700 bg-sky-100 rounded-lg">{safePage} / {totalPages}</span>
              <button className="px-3 py-1.5 border border-slate-200 bg-white rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages}>Trang sau</button>
            </div>
          </div>
        </div>
      </div>

      {/* --- MODAL CHỌN NGUỒN ẢNH (MOBILE) --- */}
      {showMobileSourceSelector && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 sm:p-0" onClick={() => setShowMobileSourceSelector(false)}>
          <div className="bg-white w-full sm:max-w-sm p-6 text-center rounded-3xl sm:rounded-2xl shadow-2xl transform transition-all animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-0 sm:zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6 sm:hidden"></div>
            <h3 className="text-xl font-extrabold text-slate-800 mb-6 m-0">Nguồn tải ảnh</h3>
            
            <button className="w-full flex items-center justify-start gap-4 p-4 mb-3 bg-white border-2 border-slate-100 rounded-2xl font-bold text-slate-700 text-lg transition-all hover:bg-sky-50 hover:border-sky-200 hover:text-sky-700 active:scale-[0.98]" onClick={triggerCamera}>
              <span className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-xl">📷</span> Chụp ảnh Camera
            </button>
            
            <button className="w-full flex items-center justify-start gap-4 p-4 mb-6 bg-white border-2 border-slate-100 rounded-2xl font-bold text-slate-700 text-lg transition-all hover:bg-sky-50 hover:border-sky-200 hover:text-sky-700 active:scale-[0.98]" onClick={triggerGallery}>
              <span className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-xl">🖼️</span> Chọn từ Thư viện
            </button>

            <button className="w-full py-3.5 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors" onClick={() => setShowMobileSourceSelector(false)}>
              Hủy bỏ
            </button>
          </div>
        </div>
      )}

      {/* --- MODAL CHI TIẾT BỆNH ÁN --- */}
      {showDetailModal && selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 md:p-6 overflow-y-auto" onClick={() => setShowDetailModal(false)}>
          <div className="bg-white max-w-3xl w-full p-6 md:p-8 rounded-[24px] shadow-2xl my-8 relative animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            
            {/* Nút đóng góc phải */}
            <button 
              className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition-colors font-bold text-lg"
              onClick={() => setShowDetailModal(false)}
            >
              ×
            </button>

            <div className="mb-6 pr-10">
              <h2 className="text-2xl font-extrabold text-slate-800 m-0">Hồ sơ bệnh án #{selectedRecord.prediction_id}</h2>
              <p className="text-slate-500 mt-1.5 mb-0 font-medium">Chẩn đoán lúc: {formatDateTime(selectedRecord.predicted_at)}</p>
            </div>

            {selectedRecord.image_url && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-2 mb-6">
                <img 
                  src={`http://localhost:3000${selectedRecord.image_url}`} 
                  alt="Mẫu vật" 
                  className="w-full max-h-[350px] min-h-[200px] object-contain rounded-xl block" 
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div className="bg-slate-50 p-5 border border-slate-200 rounded-2xl">
                <label className="block text-sm font-bold text-slate-500 mb-1">Kết quả chẩn đoán</label>
                <strong className="text-xl text-slate-800">{selectedRecord.disease_name || 'Bệnh lạ'}</strong>
              </div>
              <div className="bg-slate-50 p-5 border border-slate-200 rounded-2xl">
                <label className="block text-sm font-bold text-slate-500 mb-2">Độ tin cậy AI</label>
                <div>{getConfidenceBadge(selectedRecord.confidence)}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 mb-2">
              <div className="bg-amber-50/80 border border-amber-200 p-5 rounded-2xl">
                <label className="flex items-center gap-2 text-amber-800 font-bold mb-2 text-base"><span className="text-lg">🩺</span> Dấu hiệu thực tế:</label>
                <p className="text-slate-700 m-0 whitespace-pre-line text-sm md:text-base leading-relaxed">{selectedRecord.symptoms || 'Chưa có thông tin'}</p>
              </div>
              <div className="bg-blue-50/80 border border-blue-200 p-5 rounded-2xl">
                <label className="flex items-center gap-2 text-blue-800 font-bold mb-2 text-base"><span className="text-lg">💊</span> Phác đồ điều trị:</label>
                <p className="text-slate-700 m-0 whitespace-pre-line text-sm md:text-base leading-relaxed font-semibold">{selectedRecord.treatment || 'Chưa có thông tin'}</p>
              </div>
              <div className="bg-emerald-50/80 border border-emerald-200 p-5 rounded-2xl">
                <label className="flex items-center gap-2 text-emerald-800 font-bold mb-2 text-base"><span className="text-lg">🛡️</span> Biện pháp phòng ngừa:</label>
                <p className="text-slate-700 m-0 whitespace-pre-line text-sm md:text-base leading-relaxed">{selectedRecord.prevention || 'Chưa có thông tin'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AiDiagnosticPage;