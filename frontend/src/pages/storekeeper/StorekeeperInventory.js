import React, { useEffect, useMemo, useState } from 'react';
import '../../styles/storekeeper/storekeeper-layout.css';
import '../../styles/storekeeper/storekeeper-inventory.css';
import api from '../../services/api';
import { showToast } from '../../utils/toast';

const initialForm = {
  product_name: '',
  category_id: '',
  unit: '',
  supplier: '',
  description: '',
  status: 'ACTIVE',
};

const StorekeeperInventory = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(initialForm);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedCategory) params.append('categoryId', selectedCategory);
      if (selectedStatus) params.append('status', selectedStatus);
      if (searchTerm.trim()) params.append('search', searchTerm.trim());

      const query = params.toString();
      const res = await api.get(`/inventory/products${query ? `?${query}` : ''}`);
      setProducts(res.data?.data || []);
      setError(null);
    } catch (err) {
      console.error('Lỗi khi tải sản phẩm:', err);
      setError('Không thể tải danh sách sản phẩm');
      showToast({ title: 'Lỗi', message: 'Không thể tải danh sách sản phẩm', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get('/inventory/categories');
      setCategories(res.data?.data || []);
    } catch (err) {
      console.error('Lỗi khi tải danh mục:', err);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [selectedCategory, selectedStatus]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchProducts();
  };

  const handleOpenModal = (product = null) => {
    if (product) {
      setEditingId(product.product_id);
      setFormData({
        product_name: product.product_name || '',
        category_id: String(product.category_id || ''),
        unit: product.unit || '',
        supplier: product.supplier || '',
        description: product.description || '',
        status: product.status || 'ACTIVE',
      });
    } else {
      setEditingId(null);
      setFormData(initialForm);
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingId(null);
    setFormData(initialForm);
  };

  const resetForm = () => {
    handleCloseModal();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const payload = {
        product_name: formData.product_name.trim(),
        category_id: Number(formData.category_id),
        unit: formData.unit.trim(),
        supplier: formData.supplier?.trim() || null,
        description: formData.description?.trim() || null,
        status: formData.status,
      };

      if (editingId) {
        await api.put(`/inventory/products/${editingId}`, payload);
        setSuccess('Cập nhật sản phẩm thành công');
        showToast({ title: 'Thông báo', message: 'Cập nhật sản phẩm thành công', type: 'success' });
      } else {
        await api.post('/inventory/products', payload);
        setSuccess('Thêm sản phẩm thành công');
        showToast({ title: 'Thông báo', message: 'Thêm sản phẩm thành công', type: 'success' });
      }

      resetForm();
      fetchProducts();
    } catch (err) {
      console.error('Lỗi khi lưu sản phẩm:', err);
      const msg = err.response?.data?.message || 'Không thể lưu sản phẩm';
      setError(msg);
      showToast({ title: 'Lỗi', message: msg, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (productId) => {
    const ok = window.confirm('Bạn có chắc chắn muốn xóa sản phẩm này?');
    if (!ok) return;

    try {
      setLoading(true);
      await api.delete(`/inventory/products/${productId}`);
      setSuccess('Xóa sản phẩm thành công');
      showToast({ title: 'Thông báo', message: 'Xóa sản phẩm thành công', type: 'success' });
      fetchProducts();
    } catch (err) {
      console.error('Lỗi khi xóa sản phẩm:', err);
      const msg = err.response?.data?.message || 'Không thể xóa sản phẩm';
      setError(msg);
      showToast({ title: 'Lỗi', message: msg, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const getInventoryState = (product) => {
    const qty = Number(product.quantity || 0);
    const status = String(product.status || '').toUpperCase();

    if (status === 'INACTIVE') {
      return { label: 'Ngừng sử dụng', className: 'storekeeper-inventory__status--out' };
    }
    if (qty <= 0) {
      return { label: 'Hết hàng', className: 'storekeeper-inventory__status--out' };
    }
    if (qty <= 20) {
      return { label: 'Sắp hết', className: 'storekeeper-inventory__status--low' };
    }
    return { label: 'Còn hàng', className: 'storekeeper-inventory__status--in_stock' };
  };

  const inventoryStats = useMemo(() => {
    const inStock = products.filter((product) => getInventoryState(product).label === 'Còn hàng').length;
    const lowStock = products.filter((product) => getInventoryState(product).label === 'Sắp hết').length;
    const inactive = products.filter((product) => String(product.status || '').toUpperCase() === 'INACTIVE').length;

    return {
      total: products.length,
      inStock,
      lowStock,
      inactive,
    };
  }, [products]);

  const categoryStats = useMemo(() => {
    const map = new Map();
    products.forEach((product) => {
      const name = product.category_name || 'Khác';
      const quantity = Number(product.quantity || 0);
      const current = map.get(name) || { name, count: 0, quantity: 0 };
      map.set(name, {
        name,
        count: current.count + 1,
        quantity: current.quantity + quantity,
      });
    });

    const palette = ['#3b82f6', '#14b8a6', '#f97316', '#ef4444', '#facc15', '#8b5cf6'];
    const items = [...map.values()]
      .sort((a, b) => b.count - a.count)
      .map((item, index) => ({ ...item, color: palette[index % palette.length] }));

    const total = items.reduce((sum, item) => sum + item.count, 0) || 1;
    const donutGradient = items.length
      ? `conic-gradient(${items
          .map((item, index) => {
            const start = items.slice(0, index).reduce((sum, group) => sum + group.count, 0);
            const end = start + item.count;
            const startPercent = (start / total) * 100;
            const endPercent = (end / total) * 100;
            return `${item.color} ${startPercent}% ${endPercent}%`;
          })
          .join(', ')})`
      : 'conic-gradient(#e2e8f0 0% 100%)';

    return {
      items,
      donutGradient,
      mostUsed: items[0] || null,
    };
  }, [products]);

  return (
    <div className="storekeeper-inventory dashboard storekeeper-page">
      {/* Notifications shown via toast */}

      <section className="storekeeper-inventory__hero">
        <div className="storekeeper-inventory__hero-copy">
          <h1>Quản lý sản phẩm</h1>
          <p>Quản lý thông tin và tình trạng sản phẩm trong kho.</p>
        </div>

        <button
          type="button"
          className="storekeeper-inventory__add-btn"
          onClick={() => handleOpenModal()}
        >
          + Thêm sản phẩm mới
        </button>
      </section>

      <section className="storekeeper-inventory__stats-grid">
        <article className="storekeeper-inventory__stat-card storekeeper-inventory__stat-card--blue">
          <div className="storekeeper-inventory__stat-icon">📦</div>
          <div>
            <p>Tổng sản phẩm</p>
            <h3>{inventoryStats.total}</h3>
          </div>
        </article>
        <article className="storekeeper-inventory__stat-card storekeeper-inventory__stat-card--green">
          <div className="storekeeper-inventory__stat-icon">✅</div>
          <div>
            <p>Sản phẩm còn hàng</p>
            <h3>{inventoryStats.inStock}</h3>
          </div>
        </article>
        <article className="storekeeper-inventory__stat-card storekeeper-inventory__stat-card--amber">
          <div className="storekeeper-inventory__stat-icon">⚠️</div>
          <div>
            <p>Sản phẩm sắp hết</p>
            <h3>{inventoryStats.lowStock}</h3>
          </div>
        </article>
        <article className="storekeeper-inventory__stat-card storekeeper-inventory__stat-card--slate">
          <div className="storekeeper-inventory__stat-icon">🗑️</div>
          <div>
            <p>Sản phẩm ngừng sử dụng</p>
            <h3>{inventoryStats.inactive}</h3>
          </div>
        </article>
      </section>

      <div className="storekeeper-inventory__content-grid">
        <div className="storekeeper-inventory__main-column">
          <form className="storekeeper-inventory__filters" onSubmit={handleSearch}>
            <input
              type="text"
              placeholder="Tìm kiếm sản phẩm..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="storekeeper-inventory__search"
            />

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="storekeeper-inventory__select"
            >
              <option value="">Tất cả danh mục</option>
              {categories.map((category) => (
                <option key={category.category_id} value={category.category_id}>
                  {category.category_name}
                </option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="storekeeper-inventory__select"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="ACTIVE">Đang sử dụng</option>
              <option value="INACTIVE">Ngừng sử dụng</option>
            </select>

            <button type="submit" className="storekeeper-inventory__filter-btn">
              Lọc
            </button>
          </form>

          <section className="storekeeper-inventory__table-wrap">
            <div className="storekeeper-inventory__table-head">
              <h2>Bảng quản lý sản phẩm</h2>
            </div>

            <table className="storekeeper-inventory__table">
              <thead>
                <tr>
                  <th>Tên sản phẩm</th>
                  <th>Danh mục</th>
                  <th>Đơn vị</th>
                  <th>Số lượng tồn</th>
                  <th>Nhà cung cấp</th>
                  <th>Trạng thái</th>
                  <th>Ngày cập nhật</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" className="storekeeper-inventory__empty">Đang tải dữ liệu...</td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="storekeeper-inventory__empty">Không có sản phẩm nào</td>
                  </tr>
                ) : (
                  products.map((product) => {
                    const stockState = getInventoryState(product);
                    return (
                      <tr key={product.product_id}>
                        <td>{product.product_name}</td>
                        <td>{product.category_name || '-'}</td>
                        <td>{product.unit}</td>
                        <td>{Number(product.quantity || 0).toLocaleString('vi-VN')}</td>
                        <td>{product.supplier || '-'}</td>
                        <td>
                          <span className={`storekeeper-inventory__status ${stockState.className}`}>
                            {stockState.label}
                          </span>
                        </td>
                        <td>{product.updated_at ? new Date(product.updated_at).toLocaleDateString('vi-VN') : '-'}</td>
                        <td>
                          <div className="storekeeper-inventory__actions">
                            <button type="button" className="btn btn-secondary" onClick={() => handleOpenModal(product)}>
                              Sửa
                            </button>
                            <button type="button" className="btn btn-danger" onClick={() => handleDelete(product.product_id)}>
                              Xóa
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </section>
        </div>

        <aside className="storekeeper-inventory__side-column">
          <section className="storekeeper-inventory__analytics-card">
            <h3>Thống kê sản phẩm</h3>
            <p>Phân kê sản phẩm</p>
            <div className="storekeeper-inventory__donut-wrap">
              <div className="storekeeper-inventory__donut" style={{ background: categoryStats.donutGradient }} />
              <div className="storekeeper-inventory__legend">
                {categoryStats.items.slice(0, 5).map((item) => (
                  <div key={item.name} className="storekeeper-inventory__legend-item">
                    <span style={{ background: item.color }} />
                    <small>{item.name}</small>
                    <strong>{item.count}</strong>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="storekeeper-inventory__analytics-card">
            <h3>Thống kê sản phẩm</h3>
            <p>Top nhóm theo số lượng tồn</p>
            <div className="storekeeper-inventory__bars">
              {categoryStats.items.slice(0, 5).map((item) => {
                const max = Math.max(...categoryStats.items.map((x) => x.quantity), 1);
                const width = `${Math.max((item.quantity / max) * 100, item.quantity > 0 ? 12 : 4)}%`;
                return (
                  <div key={`bar-${item.name}`}>
                    <div className="storekeeper-inventory__bar-meta">
                      <span>{item.name}</span>
                      <strong>{Number(item.quantity).toLocaleString('vi-VN')}</strong>
                    </div>
                    <div className="storekeeper-inventory__bar-track">
                      <span className="storekeeper-inventory__bar-fill" style={{ width, background: item.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="storekeeper-inventory__analytics-card">
            <h3>Phân tích kho</h3>
            <p>Danh mục hoạt động và sử dụng nhiều nhất</p>
            <div className="storekeeper-inventory__bars">
              <div className="storekeeper-inventory__bar-meta">
                <span>Danh mục hoạt động</span>
                <strong>{categoryStats.items.length}</strong>
              </div>
              <div className="storekeeper-inventory__bar-meta">
                <span>Danh mục dùng nhiều nhất</span>
                <strong>{categoryStats.mostUsed?.name || '—'}</strong>
              </div>
            </div>
          </section>
        </aside>
      </div>

      {showModal && (
        <div className="storekeeper-inventory__modal" onClick={handleCloseModal}>
          <div className="storekeeper-inventory__modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="storekeeper-inventory__modal-header">
              <h3>{editingId ? 'Cập nhật sản phẩm' : 'Thêm sản phẩm mới'}</h3>
              <button className="storekeeper-inventory__close-btn" onClick={handleCloseModal}>
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="storekeeper-inventory__form-row">
                <div className="storekeeper-inventory__form-group storekeeper-inventory__form-group--full">
                  <label>Tên sản phẩm</label>
                  <input
                    type="text"
                    placeholder="Tên sản phẩm"
                    value={formData.product_name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, product_name: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="storekeeper-inventory__form-row">
                <div className="storekeeper-inventory__form-group">
                  <label>Danh mục</label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData((prev) => ({ ...prev, category_id: e.target.value }))}
                    required
                  >
                    <option value="">Chọn danh mục</option>
                    {categories.map((category) => (
                      <option key={category.category_id} value={category.category_id}>
                        {category.category_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="storekeeper-inventory__form-group">
                  <label>Đơn vị</label>
                  <input
                    type="text"
                    placeholder="Đơn vị (kg, lít, ...)"
                    value={formData.unit}
                    onChange={(e) => setFormData((prev) => ({ ...prev, unit: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="storekeeper-inventory__form-row">
                <div className="storekeeper-inventory__form-group">
                  <label>Nhà cung cấp</label>
                  <input
                    type="text"
                    placeholder="Nhà cung cấp"
                    value={formData.supplier}
                    onChange={(e) => setFormData((prev) => ({ ...prev, supplier: e.target.value }))}
                  />
                </div>
                <div className="storekeeper-inventory__form-group">
                  <label>Trạng thái</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value }))}
                  >
                    <option value="ACTIVE">Đang sử dụng</option>
                    <option value="INACTIVE">Ngừng sử dụng</option>
                  </select>
                </div>
              </div>

              {editingId && (
                <div className="storekeeper-inventory__form-group">
                  <label>Số lượng tồn hiện tại</label>
                  <input
                    type="text"
                    value={Number(products.find((product) => product.product_id === editingId)?.quantity || 0).toLocaleString('vi-VN')}
                    disabled
                  />
                </div>
              )}

              <div className="storekeeper-inventory__form-group">
                <label>Mô tả</label>
                <textarea
                  placeholder="Mô tả sản phẩm"
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              </div>

              <div className="storekeeper-inventory__modal-actions">
                <button type="button" className="storekeeper-inventory__button-secondary" onClick={handleCloseModal} disabled={loading}>
                  Hủy
                </button>
                <button type="submit" className="storekeeper-inventory__button-primary" disabled={loading}>
                  {editingId ? 'Lưu thay đổi' : 'Tạo mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StorekeeperInventory;
