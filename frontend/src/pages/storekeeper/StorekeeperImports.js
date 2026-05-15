import React, { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import '../../styles/storekeeper/storekeeper-layout.css';
import '../../styles/storekeeper/storekeeper-imports.css';

const INITIAL_FORM = {
  productId: '',
  quantity: '',
  unitPrice: '',
  note: '',
  importDate: new Date().toISOString().split('T')[0],
};

const INITIAL_FILTERS = {
  productId: '',
  productCode: '',
  startDate: '',
  endDate: '',
};

const StorekeeperImports = () => {
  const [imports, setImports] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [formData, setFormData] = useState(INITIAL_FORM);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    loadProducts();
    loadImports(INITIAL_FILTERS);
  }, []);

  const loadProducts = async () => {
    try {
      const response = await api.get('/inventory/products');
      setProducts(response.data?.data || []);
    } catch (err) {
      console.error('Lỗi tải sản phẩm:', err);
    }
  };

  const loadImports = async (activeFilters = filters) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (activeFilters.productId) params.append('productId', activeFilters.productId);
      if (activeFilters.startDate) params.append('startDate', activeFilters.startDate);
      if (activeFilters.endDate) params.append('endDate', activeFilters.endDate);

      const response = await api.get(`/inventory/imports?${params.toString()}`);
      setImports(response.data?.data || []);
    } catch (err) {
      setError('Lỗi tải dữ liệu nhập kho');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredImports = useMemo(() => {
    const keyword = filters.productCode.trim().toLowerCase();
    return imports.filter((item) => {
      if (!keyword) return true;
      return String(item.product_code || '').toLowerCase().includes(keyword);
    });
  }, [imports, filters.productCode]);

  const totalRecords = filteredImports.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const paginatedImports = filteredImports.slice(startIndex, startIndex + pageSize);

  const totalImportAmount = useMemo(
    () => filteredImports.reduce((sum, row) => sum + Number(row.total_amount || 0), 0),
    [filteredImports]
  );

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    loadImports(filters);
  };

  const handleResetFilters = () => {
    setFilters(INITIAL_FILTERS);
    setCurrentPage(1);
    loadImports(INITIAL_FILTERS);
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
      if (!formData.productId || !formData.quantity || formData.unitPrice === '') {
        setError('Vui lòng nhập đầy đủ sản phẩm, số lượng và đơn giá.');
        return;
      }

      const payload = {
        productId: Number(formData.productId),
        quantity: Number(formData.quantity),
        unitPrice: Number(formData.unitPrice),
        note: formData.note || null,
        importDate: formData.importDate,
      };

      const response = await api.post('/inventory/imports', payload);
      if (response.data?.success) {
        setFormData(INITIAL_FORM);
        handleCloseModal();
        setError(null);
        loadImports(filters);
      }
    } catch (err) {
      setError(`Lỗi tạo phiếu nhập kho: ${err.response?.data?.message || err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="storekeeper-imports-container">
        <div className="loading-spinner">Đang tải dữ liệu...</div>
      </div>
    );
  }

  return (
    <div className="storekeeper-imports-container dashboard">
      <div className="dashboard-header storekeeper-imports-header">
        <div>
          <h2>Phiếu nhập kho</h2>
          <p>Ghi nhận nhập kho, lọc theo ngày và mã sản phẩm, theo dõi giá trị nhập.</p>
        </div>
        <button className="btn-primary" onClick={handleOpenModal}>
          ➕ Tạo phiếu nhập
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="storekeeper-imports__summary">
        <div className="storekeeper-imports__summary-card">
          <span>Tổng chứng từ</span>
          <strong>{totalRecords.toLocaleString('vi-VN')}</strong>
        </div>
        <div className="storekeeper-imports__summary-card">
          <span>Tổng giá trị</span>
          <strong>{totalImportAmount.toLocaleString('vi-VN')} ₫</strong>
        </div>
      </div>

      {showModal && (
        <div className="storekeeper-imports__modal" onClick={handleCloseModal}>
          <div className="storekeeper-imports__modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="storekeeper-imports__modal-header">
              <h3>Tạo phiếu nhập kho</h3>
              <button className="storekeeper-imports__close-btn" onClick={handleCloseModal}>
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>

            <div className="storekeeper-imports__form-row">
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
                <label>Ngày nhập *</label>
                <input type="date" name="importDate" value={formData.importDate} onChange={handleFormChange} className="form-input" required />
              </div>
            </div>

            <div className="storekeeper-imports__form-row">
              <div className="form-group">
                <label>Số lượng *</label>
                <input type="number" name="quantity" value={formData.quantity} onChange={handleFormChange} step="0.01" className="form-input" required />
              </div>
              <div className="form-group">
                <label>Đơn giá *</label>
                <input type="number" name="unitPrice" value={formData.unitPrice} onChange={handleFormChange} step="0.01" className="form-input" required />
              </div>
            </div>

            <div className="form-group">
              <label>Ghi chú</label>
              <textarea name="note" value={formData.note} onChange={handleFormChange} className="form-input" rows="3" />
            </div>

            <div className="storekeeper-imports__modal-actions">
              <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                Hủy
              </button>
              <button type="submit" className="btn btn-primary">Lưu phiếu nhập</button>
            </div>
          </form>
          </div>
        </div>
      )}

      <div className="storekeeper-imports__filters">
        <form onSubmit={handleFilterSubmit} className="storekeeper-imports__filter-form">
          <div className="storekeeper-imports__filter-row">
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
              <label>Từ ngày</label>
              <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} className="form-input" />
            </div>

            <div className="form-group">
              <label>Đến ngày</label>
              <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} className="form-input" />
            </div>

            <div className="storekeeper-imports__filter-actions">
              <button type="submit" className="btn-secondary">Lọc</button>
              <button type="button" className="btn-light" onClick={handleResetFilters}>Đặt lại</button>
            </div>
          </div>
        </form>
      </div>

      <div className="storekeeper-imports__table-container">
        <table className="storekeeper-imports__table">
          <thead>
            <tr>
              <th>Ngày nhập</th>
              <th>Mã sản phẩm</th>
              <th>Tên sản phẩm</th>
              <th>Số lượng</th>
              <th>Đơn vị</th>
              <th>Đơn giá</th>
              <th>Thành tiền</th>
              <th>Người nhập</th>
              <th>Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            {paginatedImports.length === 0 ? (
              <tr>
                <td colSpan="9" className="text-center">Không có dữ liệu phù hợp</td>
              </tr>
            ) : (
              paginatedImports.map((imp) => (
                <tr key={imp.import_id}>
                  <td>{new Date(imp.import_date).toLocaleDateString('vi-VN')}</td>
                  <td className="font-mono">{imp.product_code}</td>
                  <td>{imp.product_name}</td>
                  <td className="text-right">{Number(imp.quantity).toLocaleString('vi-VN', { maximumFractionDigits: 2 })}</td>
                  <td>{imp.unit}</td>
                  <td className="text-right">{Number(imp.unit_price).toLocaleString('vi-VN')} ₫</td>
                  <td className="text-right font-bold">{Number(imp.total_amount).toLocaleString('vi-VN')} ₫</td>
                  <td>{imp.created_by_name || '-'}</td>
                  <td className="text-muted">{imp.note || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="storekeeper-imports__pagination">
        <div className="storekeeper-imports__pagination-info">
          Hiển thị {totalRecords === 0 ? 0 : startIndex + 1}-{Math.min(startIndex + pageSize, totalRecords)} / {totalRecords}
        </div>
        <div className="storekeeper-imports__pagination-controls">
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

export default StorekeeperImports;
