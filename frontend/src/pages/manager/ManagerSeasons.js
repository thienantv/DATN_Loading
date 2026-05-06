import React, { useState, useEffect } from 'react';
import { seasonService, pondService } from '../../services/api';
import '../../styles/dashboard.css';

export const ManagerSeasons = () => {
  const [seasons, setSeasons] = useState([]);
  const [ponds, setPonds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showHarvestModal, setShowHarvestModal] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState(null);
  const [harvestData, setHarvestData] = useState({
    actualHarvestDate: '',
    note: '',
  });
  const [formData, setFormData] = useState({
    pondId: '',
    seasonName: '',
    startDate: '',
    shrimpType: '',
    density: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [seasonsRes, pondsRes] = await Promise.all([
        seasonService.getAllSeasons(),
        pondService.getAllPonds(),
      ]);
      setSeasons(seasonsRes.data.data || []);
      setPonds(pondsRes.data.data || []);
    } catch (err) {
      setError('Lỗi tải dữ liệu');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (season = null) => {
    if (season) {
      setSelectedSeason(season);
      setFormData({
        pondId: season.pond_id || '',
        seasonName: season.season_name || '',
        startDate: season.start_date || '',
        shrimpType: season.shrimp_type || '',
        density: season.density || '',
      });
    } else {
      setSelectedSeason(null);
      setFormData({
        pondId: '',
        seasonName: '',
        startDate: '',
        shrimpType: '',
        density: '',
      });
    }
    setShowModal(true);
  };

  const handleOpenHarvestModal = (season) => {
    setSelectedSeason(season);
    setHarvestData({
      actualHarvestDate: '',
      note: '',
    });
    setShowHarvestModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!formData.pondId || !formData.seasonName || !formData.startDate || !formData.shrimpType || !formData.density) {
      setError('Vui lòng điền đầy đủ các trường bắt buộc');
      return;
    }

    try {
      const data = {
        pond_id: parseInt(formData.pondId),
        season_name: formData.seasonName,
        start_date: formData.startDate,
        shrimp_type: formData.shrimpType,
        density: parseFloat(formData.density),
      };

      if (selectedSeason) {
        await seasonService.updateSeason(selectedSeason.season_id, data);
        setSuccess('Cập nhật mùa vụ thành công');
      } else {
        await seasonService.createSeason(data);
        setSuccess('Tạo mùa vụ mới thành công');
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Lỗi xử lý');
    }
  };

  const handleHarvestSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!harvestData.actualHarvestDate || !selectedSeason) {
      setError('Vui lòng nhập ngày thu hoạch');
      return;
    }

    try {
      await seasonService.harvestSeason(selectedSeason.season_id, {
        actual_harvest: harvestData.actualHarvestDate,
        note: harvestData.note,
      });
      setSuccess('Hoàn thành mùa vụ thành công');
      setShowHarvestModal(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Lỗi hoàn thành mùa vụ');
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

  const getPondName = (pondId) => {
    const pond = ponds.find((p) => p.pond_id === pondId);
    return pond ? pond.pond_name : `Ao ${pondId}`;
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>🌾 Quản lý mùa vụ</h1>
        <p>Quản lý và giám sát các mùa vụ nuôi tôm</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="table-container">
        <div className="table-header">
          <h2>Danh sách mùa vụ</h2>
          <button className="btn btn-primary" onClick={() => handleOpenModal()}>
            ➕ Tạo mùa vụ
          </button>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Tên mùa vụ</th>
                <th>Ao</th>
                <th>Ngày bắt đầu</th>
                <th>Dự kiến thu hoạch</th>
                <th>Loại tôm</th>
                <th>Trạng thái</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {seasons.length > 0 ? (
                seasons.map((season) => (
                  <tr key={season.season_id}>
                    <td><strong>{season.season_name}</strong></td>
                    <td>{getPondName(season.pond_id)}</td>
                    <td>{new Date(season.start_date).toLocaleDateString('vi-VN')}</td>
                    <td>{new Date(season.expected_harvest).toLocaleDateString('vi-VN')}</td>
                    <td>{season.shrimp_type}</td>
                    <td>
                      <span
                        className={`status-badge ${
                          season.status === 'RUNNING'
                            ? 'status-running'
                            : season.status === 'COMPLETED'
                            ? 'status-inactive'
                            : 'status-pending'
                        }`}
                      >
                        {season.status === 'RUNNING' && '🟢 Đang chạy'}
                        {season.status === 'COMPLETED' && '✅ Hoàn thành'}
                        {season.status === 'PLANNING' && '📋 Lên kế hoạch'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '5px' }}>
                        {season.status === 'RUNNING' && (
                          <button
                            className="btn btn-sm btn-warning"
                            onClick={() => handleOpenHarvestModal(season)}
                            title="Thu hoạch"
                          >
                            🌾
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '20px' }}>
                    Không có mùa vụ nào
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal tạo/cập nhật mùa vụ */}
      {showModal && (
        <div className="modal" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{selectedSeason ? '✏️ Chỉnh sửa mùa vụ' : '🌾 Tạo mùa vụ mới'}</h2>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Ao nuôi <span style={{color: 'red'}}>*</span></label>
                <select
                  value={formData.pondId}
                  onChange={(e) => setFormData({ ...formData, pondId: e.target.value })}
                  required
                  disabled={!!selectedSeason}
                >
                  <option value="">-- Chọn ao --</option>
                  {ponds.map((pond) => (
                    <option key={pond.pond_id} value={pond.pond_id}>
                      {pond.pond_name} ({pond.pond_code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Tên mùa vụ <span style={{color: 'red'}}>*</span></label>
                <input
                  type="text"
                  placeholder="VD: Mùa xuân 2024, Mùa hè 2024"
                  value={formData.seasonName}
                  onChange={(e) =>
                    setFormData({ ...formData, seasonName: e.target.value })
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label>Ngày thả tôm <span style={{color: 'red'}}>*</span></label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) =>
                    setFormData({ ...formData, startDate: e.target.value })
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label>Loại tôm <span style={{color: 'red'}}>*</span></label>
                <select
                  value={formData.shrimpType}
                  onChange={(e) =>
                    setFormData({ ...formData, shrimpType: e.target.value })
                  }
                  required
                >
                  <option value="">-- Chọn loại --</option>
                  <option value="Tôm sú">Tôm sú</option>
                  <option value="Tôm thẻ chân trắng">Tôm thẻ chân trắng</option>
                  <option value="Tôm cá nước lợ">Tôm cá nước lợ</option>
                  <option value="Khác">Khác</option>
                </select>
              </div>

              <div className="form-group">
                <label>Mật độ (cá/m²) <span style={{color: 'red'}}>*</span></label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.density}
                  onChange={(e) =>
                    setFormData({ ...formData, density: e.target.value })
                  }
                  required
                  placeholder="VD: 50"
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

      {/* Modal thu hoạch */}
      {showHarvestModal && (
        <div className="modal" onClick={() => setShowHarvestModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>🌾 Thu hoạch mùa vụ</h2>
            <p>Mùa vụ: <strong>{selectedSeason?.season_name}</strong></p>

            <form onSubmit={handleHarvestSubmit}>
              <div className="form-group">
                <label>Ngày thu hoạch <span style={{color: 'red'}}>*</span></label>
                <input
                  type="date"
                  value={harvestData.actualHarvestDate}
                  onChange={(e) =>
                    setHarvestData({ ...harvestData, actualHarvestDate: e.target.value })
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label>Ghi chú</label>
                <textarea
                  value={harvestData.note}
                  onChange={(e) =>
                    setHarvestData({ ...harvestData, note: e.target.value })
                  }
                  placeholder="Kết quả, sản lượng, ..."
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  ✅ Hoàn thành
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => setShowHarvestModal(false)}
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

export default ManagerSeasons;
