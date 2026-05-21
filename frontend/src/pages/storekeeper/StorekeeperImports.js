import React, { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import { showToast } from '../../utils/toast';
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
  const [showModal, setShowModal] = useState(false);

  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [formData, setFormData] = useState(INITIAL_FORM);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const todayKey = new Date().toISOString().split('T')[0];

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

      const params = new URLSearchParams();
      if (activeFilters.productId) params.append('productId', activeFilters.productId);
      if (activeFilters.startDate) params.append('startDate', activeFilters.startDate);
      if (activeFilters.endDate) params.append('endDate', activeFilters.endDate);

      const response = await api.get(`/inventory/imports?${params.toString()}`);
      setImports(response.data?.data || []);
    } catch (err) {
      showToast({ title: 'Lỗi tải dữ liệu nhập kho', type: 'error' })
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

  const importOverview = useMemo(() => {
    const uniqueProducts = new Set();
    const byProduct = new Map();

    filteredImports.forEach((item) => {
      const productKey = String(item.product_id || item.product_code || item.product_name || 'unknown');
      uniqueProducts.add(productKey);

      const current = byProduct.get(productKey) || {
        productCode: item.product_code || '---',
        productName: item.product_name || 'Không rõ sản phẩm',
        quantity: 0,
        amount: 0,
      };

      byProduct.set(productKey, {
        ...current,
        quantity: current.quantity + Number(item.quantity || 0),
        amount: current.amount + Number(item.total_amount || 0),
      });
    });

    const topProducts = [...byProduct.values()]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 2);

    const latestImport = [...filteredImports].sort(
      (a, b) => new Date(b.import_date || 0) - new Date(a.import_date || 0)
    )[0] || null;

    const today = new Date();
    const todayCount = imports.reduce((cnt, item) => {
      const d = item.import_date ? new Date(item.import_date) : null;
      if (!d || Number.isNaN(d.getTime())) return cnt;
      if (d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate()) {
        return cnt + 1;
      }
      return cnt;
    }, 0);

    return {
      totalRecords: filteredImports.length,
      totalQuantity: filteredImports.reduce((sum, row) => sum + Number(row.quantity || 0), 0),
      totalImportAmount,
      uniqueProducts: uniqueProducts.size,
      todayCount,
      topProducts,
      latestImport,
    };
  }, [filteredImports, todayKey, totalImportAmount]);

  const dateRangeLabel = useMemo(() => {
    if (filters.startDate && filters.endDate) {
      return `${filters.startDate} → ${filters.endDate}`;
    }
    if (filters.startDate) {
      return `Từ ${filters.startDate}`;
    }
    if (filters.endDate) {
      return `Đến ${filters.endDate}`;
    }
    return 'Tất cả thời gian';
  }, [filters.endDate, filters.startDate]);

  const maxTopProductAmount = Math.max(...importOverview.topProducts.map((item) => item.amount), 1);

  const formatCurrency = (value) => Number(value || 0).toLocaleString('vi-VN');

  const formatQuantity = (value) => Number(value || 0).toLocaleString('vi-VN', { maximumFractionDigits: 2 });

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
        showToast({ title: 'Vui lòng nhập đầy đủ sản phẩm, số lượng và đơn giá.', type: 'error' })
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
        showToast({ title: 'Tạo phiếu nhập thành công', type: 'success' })
        loadImports(filters);
      }
    } catch (err) {
      showToast({ title: `Lỗi tạo phiếu nhập kho: ${err.response?.data?.message || err.message}`, type: 'error' })
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
    <div className="storekeeper-imports storekeeper-page">
      <section className="storekeeper-imports_hero">
        <div className="storekeeper-imports_hero-copy">
          <h1>Nhập kho</h1>
          <p>Ghi nhận phiếu nhập, theo dõi giá trị hàng hóa và lọc nhanh theo sản phẩm hoặc thời gian.</p>
        </div>

        <button type="button" className="storekeeper-imports_add-btn" onClick={handleOpenModal}>
          + Thêm phiếu nhập mới
        </button>
      </section>

      <section className="storekeeper-imports_stats-grid">
        <article className="storekeeper-imports_stat-card storekeeper-imports_stat-card--blue">
          <div className="storekeeper-imports_stat-icon">📄</div>
          <div>
            <p>Tổng phiếu nhập</p>
            <h3>{importOverview.totalRecords.toLocaleString('vi-VN')}</h3>
          </div>
        </article>
        <article className="storekeeper-imports_stat-card storekeeper-imports_stat-card--green">
          <div className="storekeeper-imports_stat-icon">🗓️</div>
          <div>
            <p>Phiếu hôm nay</p>
            <h3>{importOverview.todayCount.toLocaleString('vi-VN')}</h3>
          </div>
        </article>
        <article className="storekeeper-imports_stat-card storekeeper-imports_stat-card--amber">
          <div className="storekeeper-imports_stat-icon">📦</div>
          <div>
            <p>Tổng số lượng</p>
            <h3>{formatQuantity(importOverview.totalQuantity)}</h3>
          </div>
        </article>
        <article className="storekeeper-imports_stat-card storekeeper-imports_stat-card--slate">
          <div className="storekeeper-imports_stat-icon">₫</div>
          <div>
            <p>Tổng giá trị nhập</p>
            <h3>{formatCurrency(importOverview.totalImportAmount)} ₫</h3>
          </div>
        </article>
      </section>

      <section className="storekeeper-imports_content-grid">
        <div className="storekeeper-imports_insight-row">
          <section className="storekeeper-imports_insight-card">
            <div className="storekeeper-imports_insight-head">
              <h2>Top sản phẩm nhập</h2>
              <p>Dựa trên tổng giá trị của các phiếu trong bộ lọc hiện tại.</p>
            </div>

            <div className="storekeeper-imports_bars">
              {importOverview.topProducts.length === 0 ? (
                <div className="storekeeper-imports_empty-block">Chưa có dữ liệu để thống kê</div>
              ) : (
                importOverview.topProducts.map((item) => {
                  const barWidth = Math.max(8, (item.amount / maxTopProductAmount) * 100);
                  return (
                    <div key={`${item.productCode}-${item.productName}`} className="storekeeper-imports_bar-item">
                      <div className="storekeeper-imports_bar-meta">
                        <span>{item.productCode}</span>
                        <span>{formatCurrency(item.amount)} ₫</span>
                      </div>
                      <div className="storekeeper-imports_bar-track">
                        <span className="storekeeper-imports_bar-fill" style={{ width: `${barWidth}%` }} />
                      </div>
                      <p>{item.productName}</p>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          <section className="storekeeper-imports_insight-card">
            <div className="storekeeper-imports_insight-head">
              <h2>Phiếu mới nhất</h2>
              <p>Thông tin nhập kho gần nhất đang có trong bảng.</p>
            </div>

            {importOverview.latestImport ? (
              <div className="storekeeper-imports_latest-card">
                <strong>{importOverview.latestImport.product_name}</strong>
                <span>{importOverview.latestImport.product_code}</span>
                <p>{new Date(importOverview.latestImport.import_date).toLocaleDateString('vi-VN')}</p>
                <div className="storekeeper-imports_latest-metrics">
                  <div>
                    <span>Số lượng</span>
                    <strong>{formatQuantity(importOverview.latestImport.quantity)}</strong>
                  </div>
                  <div>
                    <span>Giá trị</span>
                    <strong>{formatCurrency(importOverview.latestImport.total_amount)} ₫</strong>
                  </div>
                </div>
              </div>
            ) : (
              <div className="storekeeper-imports_empty-block">Chưa có phiếu nhập mới</div>
            )}
          </section>
        </div>

        <div className="storekeeper-imports_main-column">
          <section className="storekeeper-imports_toolbar-card">
            <form onSubmit={handleFilterSubmit} className="storekeeper-imports_toolbar-form">
              <div className="storekeeper-imports_toolbar-row">
                <div className="form-group storekeeper-imports_search-group">
                  <label>Tìm mã sản phẩm</label>
                  <input
                    name="productCode"
                    value={filters.productCode}
                    onChange={handleFilterChange}
                    className="form-input storekeeper-imports_search"
                    placeholder="VD: SP001"
                  />
                </div>

                <div className="form-group">
                  <label>Sản phẩm</label>
                  <select name="productId" value={filters.productId} onChange={handleFilterChange} className="form-input">
                    <option value="">Tất cả sản phẩm</option>
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

                <div className="storekeeper-imports_toolbar-actions">
                  <button type="submit" className="storekeeper-imports_button-primary">Lọc dữ liệu</button>
                  <button type="button" className="storekeeper-imports_button-secondary" onClick={handleResetFilters}>
                    Đặt lại
                  </button>
                </div>
              </div>
            </form>

            <div className="storekeeper-imports_toolbar-meta">
              <span>{dateRangeLabel}</span>
              <span>{filteredImports.length.toLocaleString('vi-VN')} phiếu phù hợp</span>
            </div>
          </section>

          <section className="storekeeper-imports_table-card">
            <div className="storekeeper-imports_table-head">
              <div>
                <h2>Danh sách phiếu nhập</h2>
                <p>Theo dõi chi tiết từng phiếu nhập và giá trị tương ứng.</p>
              </div>
            </div>

            <div className="storekeeper-imports_table-wrapper">
              <table className="storekeeper-imports_table">
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
                      <td colSpan="9" className="storekeeper-imports_empty">Không có dữ liệu phù hợp</td>
                    </tr>
                  ) : (
                    paginatedImports.map((imp) => (
                      <tr key={imp.import_id}>
                        <td>{new Date(imp.import_date).toLocaleDateString('vi-VN')}</td>
                        <td className="storekeeper-imports_mono">{imp.product_code}</td>
                        <td>{imp.product_name}</td>
                        <td className="text-right">{formatQuantity(imp.quantity)}</td>
                        <td>{imp.unit}</td>
                        <td className="text-right">{formatCurrency(imp.unit_price)} ₫</td>
                        <td className="text-right storekeeper-imports_strong">{formatCurrency(imp.total_amount)} ₫</td>
                        <td>{imp.created_by_name || '-'}</td>
                        <td className="storekeeper-imports_muted">{imp.note || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="storekeeper-imports_pagination">
              <div className="storekeeper-imports_pagination-left">
                <label htmlFor="pageSize">Số mục trên trang:</label>
                <select
                  id="pageSize"
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
                <span>
                  {totalRecords === 0 ? 0 : startIndex + 1}-{Math.min(startIndex + pageSize, totalRecords)} trên {totalRecords}
                </span>
              </div>

              <div className="storekeeper-imports_pagination-right">
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safeCurrentPage <= 1}
                >
                  ‹
                </button>

                <span className="storekeeper-imports_page-pill">{safeCurrentPage}</span>

                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safeCurrentPage >= totalPages}
                >
                  ›
                </button>
              </div>
            </div>
          </section>
        </div>

        
      </section>

      {showModal && (
        <div className="storekeeper-imports_modal" onClick={handleCloseModal}>
          <div className="storekeeper-imports_modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="storekeeper-imports_modal-header">
              <div>
                <h3>Tạo phiếu nhập kho</h3>
                <p>Nhập sản phẩm, số lượng và đơn giá để ghi nhận tồn kho.</p>
              </div>
              <button type="button" className="storekeeper-imports_close-btn" onClick={handleCloseModal}>
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="storekeeper-imports_form-row">
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

              <div className="storekeeper-imports_form-row">
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

              <div className="storekeeper-imports_modal-actions">
                <button type="button" className="storekeeper-imports_button-secondary" onClick={handleCloseModal}>
                  Hủy
                </button>
                <button type="submit" className="storekeeper-imports_button-primary">Lưu phiếu nhập</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StorekeeperImports;
