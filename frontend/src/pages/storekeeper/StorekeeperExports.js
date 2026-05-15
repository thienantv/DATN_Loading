import React, { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import '../../styles/storekeeper/storekeeper-layout.css';
import '../../styles/storekeeper/storekeeper-exports.css';

const INITIAL_FORM = {
  productId: '',
  quantity: '',
  unitPrice: '',
  pondId: '',
  exportReason: '',
  note: '',
  exportDate: new Date().toISOString().split('T')[0],
};

const INITIAL_FILTERS = {
  productId: '',
  productCode: '',
  pondId: '',
  startDate: '',
  endDate: '',
};

const StorekeeperExports = () => {
  const [exports, setExports] = useState([]);
  const [products, setProducts] = useState([]);
  const [ponds, setPonds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [formData, setFormData] = useState(INITIAL_FORM);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    loadProducts();
    loadPonds();
    loadExports(INITIAL_FILTERS);
  }, []);

  const loadProducts = async () => {
    try {
      const response = await api.get('/inventory/products');
      setProducts(response.data?.data || []);
    } catch (err) {
      console.error('Lỗi tải sản phẩm:', err);
    }
  };

  const loadPonds = async () => {
    try {
      const response = await api.get('/ponds');
      setPonds(response.data?.data || []);
    } catch (err) {
      console.error('Lỗi tải danh sách ao:', err);
    }
  };

  const loadExports = async (activeFilters = filters) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (activeFilters.productId) params.append('productId', activeFilters.productId);
      if (activeFilters.pondId) params.append('pondId', activeFilters.pondId);
      if (activeFilters.startDate) params.append('startDate', activeFilters.startDate);
      if (activeFilters.endDate) params.append('endDate', activeFilters.endDate);

      const response = await api.get(`/inventory/exports?${params.toString()}`);
      setExports(response.data?.data || []);
    } catch (err) {
      setError('Lỗi tải dữ liệu xuất kho');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredExports = useMemo(() => {
    const keyword = filters.productCode.trim().toLowerCase();
    return exports.filter((item) => {
      if (!keyword) return true;
      return String(item.product_code || '').toLowerCase().includes(keyword);
    });
  }, [exports, filters.productCode]);

  const totalRecords = filteredExports.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const paginatedExports = filteredExports.slice(startIndex, startIndex + pageSize);

  const totalExportAmount = useMemo(
    () => filteredExports.reduce((sum, row) => sum + Number(row.total_amount || 0), 0),
    [filteredExports]
  );

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    loadExports(filters);
  };

  const handleResetFilters = () => {
    setFilters(INITIAL_FILTERS);
    setCurrentPage(1);
    loadExports(INITIAL_FILTERS);
  };

  const handleOpenModal = () => {
    setFormData(INITIAL_FORM);
    setError(null);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormData(INITIAL_FORM);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (!formData.productId || !formData.quantity) {
        setError('Vui lòng nhập đầy đủ sản phẩm và số lượng.');
        return;
      }

      const payload = {
        productId: Number(formData.productId),
        quantity: Number(formData.quantity),
        unitPrice: formData.unitPrice ? Number(formData.unitPrice) : null,
        pondId: formData.pondId ? Number(formData.pondId) : null,
        exportReason: formData.exportReason || null,
        note: formData.note || null,
        exportDate: formData.exportDate,
      };

      const response = await api.post('/inventory/exports', payload);
      if (response.data?.success) {
        setFormData(INITIAL_FORM);
        handleCloseModal();
        setError(null);
        loadExports(filters);
      }
    } catch (err) {
      setError(`Lỗi tạo phiếu xuất kho: ${err.response?.data?.message || err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="storekeeper-exports-container">
        <div className="loading-spinner">Đang tải dữ liệu...</div>
      </div>
    );
  }

  return (
    <div className="storekeeper-exports-container dashboard">
      <div className="dashboard-header storekeeper-exports-header">
        <div>
          <h2>Phiếu xuất kho</h2>
          <p>Theo dõi xuất kho theo ngày, ao nuôi và mã sản phẩm với phân trang chi tiết.</p>
        </div>
        <button className="btn-primary" onClick={handleOpenModal}>
          ➕ Tạo phiếu xuất
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="storekeeper-exports__summary">
        <div className="storekeeper-exports__summary-card">
          <span>Tổng chứng từ</span>
          <strong>{totalRecords.toLocaleString('vi-VN')}</strong>
        </div>
        <div className="storekeeper-exports__summary-card">
          <span>Tổng giá trị</span>
          <strong>{totalExportAmount.toLocaleString('vi-VN')} ₫</strong>
        </div>
      </div>

      {showModal && (
        <div className="storekeeper-exports__modal" onClick={handleCloseModal}>
          <div className="storekeeper-exports__modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="storekeeper-exports__modal-header">
              <h3>Tạo phiếu xuất kho</h3>
              <button className="storekeeper-exports__close-btn" onClick={handleCloseModal}>
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>

            <div className="storekeeper-exports__form-row">
              <div className="form-group">
                <label>Sản phẩm *</label>
                <select name="productId" value={formData.productId} onChange={handleFormChange} className="form-input" required>
                  <option value="">-- Chọn sản phẩm --</option>
                  {products.map((p) => (
                    <option key={p.product_id} value={p.product_id}>
                      {p.product_code} - {p.product_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Ngày xuất *</label>
                <input type="date" name="exportDate" value={formData.exportDate} onChange={handleFormChange} className="form-input" required />
              </div>
            </div>

            <div className="storekeeper-exports__form-row">
              <div className="form-group">
                <label>Số lượng *</label>
                <input type="number" name="quantity" value={formData.quantity} onChange={handleFormChange} className="form-input" step="0.01" required />
              </div>
              <div className="form-group">
                <label>Đơn giá</label>
                <input type="number" name="unitPrice" value={formData.unitPrice} onChange={handleFormChange} className="form-input" step="0.01" />
              </div>
            </div>

            <div className="storekeeper-exports__form-row">
              <div className="form-group">
                <label>Ao nuôi</label>
                <select name="pondId" value={formData.pondId} onChange={handleFormChange} className="form-input">
                  <option value="">-- Chọn ao --</option>
                  {ponds.map((p) => (
                    <option key={p.pond_id} value={p.pond_id}>
                      {p.pond_code} - {p.pond_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Lý do xuất</label>
                <select name="exportReason" value={formData.exportReason} onChange={handleFormChange} className="form-input">
                  <option value="">-- Chọn lý do --</option>
                  <option value="FEED">Cho ăn</option>
                  <option value="TREATMENT">Xử lý bệnh</option>
                  <option value="MAINTENANCE">Bảo trì</option>
                  <option value="OTHER">Khác</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Ghi chú</label>
              <textarea name="note" value={formData.note} onChange={handleFormChange} className="form-input" rows="3" />
            </div>

            <div className="storekeeper-exports__modal-actions">
              <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                Hủy
              </button>
              <button type="submit" className="btn btn-primary">Lưu phiếu xuất</button>
            </div>
          </form>
          </div>
        </div>
      )}

      <div className="storekeeper-exports__filters">
        <form onSubmit={handleFilterSubmit} className="storekeeper-exports__filter-form">
          <div className="storekeeper-exports__filter-row">
            <div className="form-group">
              <label>Mã sản phẩm</label>
              <input
                name="productCode"
                value={filters.productCode}
                onChange={handleFilterChange}
                className="form-input"
                placeholder="VD: SP001"
              />
            </div>

            <div className="form-group">
              <label>Sản phẩm</label>
              <select name="productId" value={filters.productId} onChange={handleFilterChange} className="form-input">
                <option value="">-- Tất cả sản phẩm --</option>
                {products.map((p) => (
                  <option key={p.product_id} value={p.product_id}>
                    {p.product_code} - {p.product_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Ao nuôi</label>
              <select name="pondId" value={filters.pondId} onChange={handleFilterChange} className="form-input">
                <option value="">-- Tất cả ao --</option>
                {ponds.map((p) => (
                  <option key={p.pond_id} value={p.pond_id}>
                    {p.pond_code} - {p.pond_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Từ ngày</label>
              <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} className="form-input" />
            </div>

            <div className="form-group">
              <label>Đến ngày</label>
              <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} className="form-input" />
            </div>

            <div className="storekeeper-exports__filter-actions">
              <button type="submit" className="btn-secondary">Lọc</button>
              <button type="button" className="btn-light" onClick={handleResetFilters}>Đặt lại</button>
            </div>
          </div>
        </form>
      </div>

      <div className="storekeeper-exports__table-container">
        <table className="storekeeper-exports__table">
          <thead>
            <tr>
              <th>Ngày xuất</th>
              <th>Mã sản phẩm</th>
              <th>Tên sản phẩm</th>
              <th>Số lượng</th>
              <th>Ao nuôi</th>
              <th>Lý do</th>
              <th>Đơn giá</th>
              <th>Thành tiền</th>
              <th>Người xuất</th>
              <th>Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            {paginatedExports.length === 0 ? (
              <tr>
                <td colSpan="10" className="text-center">Không có dữ liệu phù hợp</td>
              </tr>
            ) : (
              paginatedExports.map((exp) => (
                <tr key={exp.export_id}>
                  <td>{new Date(exp.export_date).toLocaleDateString('vi-VN')}</td>
                  <td className="font-mono">{exp.product_code}</td>
                  <td>{exp.product_name}</td>
                  <td className="text-right">{Number(exp.quantity).toLocaleString('vi-VN', { maximumFractionDigits: 2 })}</td>
                  <td>{exp.pond_code ? `${exp.pond_code} - ${exp.pond_name}` : '-'}</td>
                  <td>{exp.export_reason || '-'}</td>
                  <td className="text-right">{exp.unit_price ? `${Number(exp.unit_price).toLocaleString('vi-VN')} ₫` : '-'}</td>
                  <td className="text-right font-bold">{exp.total_amount ? `${Number(exp.total_amount).toLocaleString('vi-VN')} ₫` : '-'}</td>
                  <td>{exp.created_by_name || '-'}</td>
                  <td className="text-muted">{exp.note || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="storekeeper-exports__pagination">
        <div className="storekeeper-exports__pagination-info">
          Hiển thị {totalRecords === 0 ? 0 : startIndex + 1}-{Math.min(startIndex + pageSize, totalRecords)} / {totalRecords}
        </div>
        <div className="storekeeper-exports__pagination-controls">
          <label>
            Dòng/trang
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </label>
          <button type="button" className="btn-light" disabled={safeCurrentPage <= 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}>
            Trước
          </button>
          <span>Trang {safeCurrentPage}/{totalPages}</span>
          <button type="button" className="btn-light" disabled={safeCurrentPage >= totalPages} onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}>
            Sau
          </button>
        </div>
      </div>
    </div>
  );
};

export default StorekeeperExports;
