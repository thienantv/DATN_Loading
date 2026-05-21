import React, { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import { showToast } from '../../utils/toast'
import '../../styles/storekeeper/storekeeper-layout.css';
import '../../styles/storekeeper/storekeeper-exports.css';
import '../../styles/storekeeper/storekeeper-imports.css';

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

      const params = new URLSearchParams();
      if (activeFilters.productId) params.append('productId', activeFilters.productId);
      if (activeFilters.pondId) params.append('pondId', activeFilters.pondId);
      if (activeFilters.startDate) params.append('startDate', activeFilters.startDate);
      if (activeFilters.endDate) params.append('endDate', activeFilters.endDate);

      const response = await api.get(`/inventory/exports?${params.toString()}`);
      setExports(response.data?.data || []);
    } catch (err) {
      showToast({ title: 'Lỗi tải dữ liệu xuất kho', type: 'error' })
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

  const exportOverview = useMemo(() => {
    const uniqueProducts = new Set();
    const byProduct = new Map();

    filteredExports.forEach((item) => {
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

    const latestExport = [...filteredExports].sort(
      (a, b) => new Date(b.export_date || 0) - new Date(a.export_date || 0)
    )[0] || null;

    const today = new Date();
    const todayCount = exports.reduce((cnt, item) => {
      const d = item.export_date ? new Date(item.export_date) : null;
      if (!d || Number.isNaN(d.getTime())) return cnt;
      if (d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate()) {
        return cnt + 1;
      }
      return cnt;
    }, 0);

    return {
      totalRecords: filteredExports.length,
      totalQuantity: filteredExports.reduce((sum, row) => sum + Number(row.quantity || 0), 0),
      totalExportAmount,
      uniqueProducts: uniqueProducts.size,
      todayCount,
      topProducts,
      latestExport,
    };
  }, [filteredExports, exports, totalExportAmount]);

  const formatCurrency = (value) => Number(value || 0).toLocaleString('vi-VN');

  const formatQuantity = (value) => Number(value || 0).toLocaleString('vi-VN', { maximumFractionDigits: 2 });

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

  useEffect(() => {
    // Auto-fill unitPrice in modal based on latest import for selected product
    const pid = formData.productId;
    if (!pid) return;

    let cancelled = false;
    const loadLatest = async () => {
      try {
        const resp = await api.get(`/inventory/imports?productId=${pid}`);
        const items = resp.data?.data || [];
        if (!items || items.length === 0) return;
        const latest = items
          .filter((it) => it.unit_price != null)
          .sort((a, b) => new Date(b.import_date || 0) - new Date(a.import_date || 0))[0];
        if (latest && !cancelled) {
          setFormData((prev) => ({ ...prev, unitPrice: latest.unit_price }));
        }
      } catch (err) {
        // silent
      }
    };

    loadLatest();
    return () => { cancelled = true; };
  }, [formData.productId]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (!formData.productId || !formData.quantity) {
        showToast({ title: 'Vui lòng nhập đầy đủ sản phẩm và số lượng.', type: 'error' })
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
        showToast({ title: 'Tạo phiếu xuất thành công', type: 'success' })
        loadExports(filters);
      }
    } catch (err) {
      showToast({ title: `Lỗi tạo phiếu xuất kho: ${err.response?.data?.message || err.message}`, type: 'error' })
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
    <div className="storekeeper-imports storekeeper-page">
      <section className="storekeeper-imports_hero">
        <div className="storekeeper-imports_hero-copy">
          <p className="storekeeper-imports_eyebrow">Quản lý kho</p>
          <h1>Xuất kho</h1>
          <p>Theo dõi phiếu xuất, giá trị sản phẩm và lọc theo ao, sản phẩm hoặc thời gian.</p>
        </div>

        <button type="button" className="storekeeper-imports_add-btn" onClick={handleOpenModal}>
          + Thêm phiếu xuất mới
        </button>
      </section>

      <section className="storekeeper-imports_stats-grid">
        <article className="storekeeper-imports_stat-card storekeeper-imports_stat-card--blue">
          <div className="storekeeper-imports_stat-icon">📄</div>
          <div>
            <p>Tổng phiếu xuất</p>
            <h3>{exportOverview.totalRecords.toLocaleString('vi-VN')}</h3>
          </div>
        </article>
        <article className="storekeeper-imports_stat-card storekeeper-imports_stat-card--green">
          <div className="storekeeper-imports_stat-icon">🗓️</div>
          <div>
            <p>Phiếu hôm nay</p>
            <h3>{exportOverview.todayCount.toLocaleString('vi-VN')}</h3>
          </div>
        </article>
        <article className="storekeeper-imports_stat-card storekeeper-imports_stat-card--amber">
          <div className="storekeeper-imports_stat-icon">📦</div>
          <div>
            <p>Tổng số lượng</p>
            <h3>{formatQuantity(exportOverview.totalQuantity)}</h3>
          </div>
        </article>
        <article className="storekeeper-imports_stat-card storekeeper-imports_stat-card--slate">
          <div className="storekeeper-imports_stat-icon">₫</div>
          <div>
            <p>Tổng giá trị xuất</p>
            <h3>{formatCurrency(exportOverview.totalExportAmount)} ₫</h3>
          </div>
        </article>
      </section>

      <section className="storekeeper-imports_content-grid">
        <div className="storekeeper-imports_insight-row">
          <section className="storekeeper-imports_insight-card">
            <div className="storekeeper-imports_insight-head">
              <h2>Top sản phẩm xuất</h2>
              <p>Dựa trên tổng giá trị của các phiếu trong bộ lọc hiện tại.</p>
            </div>

            <div className="storekeeper-imports_bars">
              {exportOverview.topProducts.length === 0 ? (
                <div className="storekeeper-imports_empty-block">Chưa có dữ liệu để thống kê</div>
              ) : (
                exportOverview.topProducts.map((item) => {
                  const barWidth = Math.max(8, (item.amount / Math.max(...exportOverview.topProducts.map((i) => i.amount), 1)) * 100);
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
              <p>Thông tin xuất kho gần nhất đang có trong bảng.</p>
            </div>

            {exportOverview.latestExport ? (
              <div className="storekeeper-imports_latest-card">
                <strong>{exportOverview.latestExport.product_name}</strong>
                <span>{exportOverview.latestExport.product_code}</span>
                <p>{new Date(exportOverview.latestExport.export_date).toLocaleDateString('vi-VN')}</p>
                <div className="storekeeper-imports_latest-metrics">
                  <div>
                    <span>Số lượng</span>
                    <strong>{formatQuantity(exportOverview.latestExport.quantity)}</strong>
                  </div>
                  <div>
                    <span>Giá trị</span>
                    <strong>{formatCurrency(exportOverview.latestExport.total_amount)} ₫</strong>
                  </div>
                </div>
              </div>
            ) : (
              <div className="storekeeper-imports_empty-block">Chưa có phiếu xuất mới</div>
            )}
          </section>
        </div>

        <div className="storekeeper-imports_main-column">
          <section className="storekeeper-imports_toolbar-card">
            <form onSubmit={handleFilterSubmit} className="storekeeper-imports_toolbar-form">
              <div className="storekeeper-imports_toolbar-row">
                <div className="form-group storekeeper-imports_search-group storekeeper-exports_product-code-group">
                  <label>Mã sản phẩm</label>
                  <input
                    name="productCode"
                    value={filters.productCode}
                    onChange={handleFilterChange}
                    className="form-input storekeeper-imports_search storekeeper-exports_product-code"
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
                  <label>Ao nuôi</label>
                  <select name="pondId" value={filters.pondId} onChange={handleFilterChange} className="form-input">
                    <option value="">Tất cả ao</option>
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

                <div className="storekeeper-imports_toolbar-actions">
                  <button type="submit" className="storekeeper-imports_button-primary">Lọc dữ liệu</button>
                  <button type="button" className="storekeeper-imports_button-secondary" onClick={handleResetFilters}>
                    Đặt lại
                  </button>
                </div>
              </div>
            </form>

            <div className="storekeeper-imports_toolbar-meta">
              <span>{filters.startDate || filters.endDate ? `${filters.startDate || ''} → ${filters.endDate || ''}` : 'Tất cả thời gian'}</span>
              <span>{filteredExports.length.toLocaleString('vi-VN')} phiếu phù hợp</span>
            </div>
          </section>

          <section className="storekeeper-imports_table-card">
            <div className="storekeeper-imports_table-head">
              <div>
                <h2>Danh sách phiếu xuất</h2>
                <p>Theo dõi chi tiết từng phiếu xuất và giá trị tương ứng.</p>
              </div>
            </div>

            <div className="storekeeper-imports_table-wrapper">
              <table className="storekeeper-imports_table">
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
                      <td colSpan="10" className="storekeeper-imports_empty">Không có dữ liệu phù hợp</td>
                    </tr>
                  ) : (
                    paginatedExports.map((exp) => (
                      <tr key={exp.export_id}>
                        <td>{new Date(exp.export_date).toLocaleDateString('vi-VN')}</td>
                        <td className="storekeeper-imports_mono">{exp.product_code}</td>
                        <td>{exp.product_name}</td>
                        <td className="text-right">{formatQuantity(exp.quantity)}</td>
                        <td>{exp.pond_code ? `${exp.pond_code} - ${exp.pond_name}` : '-'}</td>
                        <td>{exp.export_reason || '-'}</td>
                        <td className="text-right">{exp.unit_price ? `${formatCurrency(exp.unit_price)} ₫` : '-'}</td>
                        <td className="text-right storekeeper-imports_strong">{exp.total_amount ? `${formatCurrency(exp.total_amount)} ₫` : '-'}</td>
                        <td>{exp.created_by_name || '-'}</td>
                        <td className="storekeeper-imports_muted">{exp.note || '-'}</td>
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
        <div className="storekeeper-exports_modal" onClick={handleCloseModal}>
          <div className="storekeeper-exports_modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="storekeeper-exports_modal-header">
              <h3>Tạo phiếu xuất kho</h3>
              <button className="storekeeper-exports_close-btn" onClick={handleCloseModal}>
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>

            <div className="storekeeper-exports_form-row">
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

            <div className="storekeeper-exports_form-row">
              <div className="form-group">
                <label>Số lượng *</label>
                <input type="number" name="quantity" value={formData.quantity} onChange={handleFormChange} className="form-input" step="0.01" required />
              </div>
              <div className="form-group">
                <label>Đơn giá</label>
                <input type="number" name="unitPrice" value={formData.unitPrice} onChange={handleFormChange} className="form-input" step="0.01" />
              </div>
            </div>

            <div className="storekeeper-exports_form-row">
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

            <div className="storekeeper-exports_modal-actions">
              <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                Hủy
              </button>
              <button type="submit" className="btn btn-primary">Lưu phiếu xuất</button>
            </div>
          </form>
          </div>
        </div>
      )}

      
    </div>
  );
};

export default StorekeeperExports;
