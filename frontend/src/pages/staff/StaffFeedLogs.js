import React, { useState, useEffect } from 'react';
import { feedLogService, seasonService, productService } from '../../services/api';
import '../../styles/dashboard.css';

export const StaffFeedLogs = () => {
  const [feedLogs, setFeedLogs] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [selectedSeasonId, setSelectedSeasonId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    productId: '',
    feedingDate: '',
    feedingTime: '',
    mealNo: 1,
    quantityKg: '',
    note: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedSeasonId) {
      fetchFeedLogs(selectedSeasonId);
    }
  }, [selectedSeasonId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [seasonsRes, productsRes] = await Promise.all([
        seasonService.getAllSeasons(),
        productService.getAllProducts(),
      ]);

      setSeasons(seasonsRes.data.data || []);
      setProducts(productsRes.data.data || []);

      if (seasonsRes.data.data?.length > 0) {
        setSelectedSeasonId(seasonsRes.data.data[0].season_id);
      }
    } catch (err) {
      setError('Lỗi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const fetchFeedLogs = async (seasonId) => {
    try {
      const res = await feedLogService.getFeedLogsBySeasonId(seasonId);
      setFeedLogs(res.data.data || []);
    } catch (err) {
      setError('Lỗi tải nhật ký cho ăn');
    }
  };

  const handleAddLog = async (e) => {
    e.preventDefault();
    if (!formData.productId || !formData.feedingDate || !formData.quantityKg) {
      setError('Vui lòng điền đầy đủ thông tin');
      return;
    }

    try {
      await feedLogService.createFeedLog({
        seasonId: selectedSeasonId,
        ...formData,
        quantityKg: parseFloat(formData.quantityKg),
        mealNo: parseInt(formData.mealNo),
      });
      setSuccess('Đã ghi nhật ký cho ăn');
      fetchFeedLogs(selectedSeasonId);
      setFormData({
        productId: '',
        feedingDate: '',
        feedingTime: '',
        mealNo: 1,
        quantityKg: '',
        note: '',
      });
      setShowModal(false);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Lỗi khi lưu nhật ký');
    }
  };

  if (loading) return <div className="loading">⏳ Đang tải...</div>;

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h2>📋 Nhật ký cho ăn</h2>
        <div className="filters">
          <select
            value={selectedSeasonId || ''}
            onChange={(e) => setSelectedSeasonId(parseInt(e.target.value))}
            className="select-input"
          >
            <option value="">-- Chọn mùa vụ --</option>
            {seasons.map((season) => (
              <option key={season.season_id} value={season.season_id}>
                {season.season_name}
              </option>
            ))}
          </select>
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            ➕ Thêm nhật ký
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Thêm nhật ký cho ăn</h3>
            <form onSubmit={handleAddLog}>
              <div className="form-group">
                <label>Sản phẩm *</label>
                <select
                  value={formData.productId}
                  onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                  className="form-input"
                >
                  <option value="">-- Chọn sản phẩm --</option>
                  {products.map((product) => (
                    <option key={product.product_id} value={product.product_id}>
                      {product.product_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Ngày cho ăn *</label>
                  <input
                    type="date"
                    value={formData.feedingDate}
                    onChange={(e) => setFormData({ ...formData, feedingDate: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>Giờ</label>
                  <input
                    type="time"
                    value={formData.feedingTime}
                    onChange={(e) => setFormData({ ...formData, feedingTime: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Lần ăn</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.mealNo}
                    onChange={(e) => setFormData({ ...formData, mealNo: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>Lượng (kg) *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={formData.quantityKg}
                    onChange={(e) => setFormData({ ...formData, quantityKg: e.target.value })}
                    className="form-input"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Ghi chú</label>
                <textarea
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  className="form-input"
                  rows="3"
                  placeholder="Ghi chú thêm (nếu có)"
                />
              </div>

              <div className="modal-actions">
                <button type="submit" className="btn-primary">
                  💾 Lưu
                </button>
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  ❌ Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Ngày</th>
              <th>Giờ</th>
              <th>Sản phẩm</th>
              <th>Lần ăn</th>
              <th>Lượng (kg)</th>
              <th>Người ghi</th>
              <th>Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            {feedLogs.length > 0 ? (
              feedLogs.map((log) => (
                <tr key={log.feed_log_id}>
                  <td>{log.feeding_date}</td>
                  <td>{log.feeding_time || '-'}</td>
                  <td>{log.product_name || 'N/A'}</td>
                  <td>{log.meal_no || '-'}</td>
                  <td>{log.quantity_kg}</td>
                  <td>{log.created_by_name || 'Hệ thống'}</td>
                  <td>{log.note || '-'}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="empty-cell">Chưa có nhật ký cho ăn</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StaffFeedLogs;
