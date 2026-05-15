import React, { useEffect, useState } from 'react';
import '../../styles/storekeeper/storekeeper-layout.css';
import '../../styles/storekeeper/storekeeper-inventory.css';
import api from '../../services/api';

const initialForm = {
  product_code: '',
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
        product_code: product.product_code || '',
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
        product_code: formData.product_code.trim(),
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
      } else {
        await api.post('/inventory/products', payload);
        setSuccess('Thêm sản phẩm thành công');
      }

      resetForm();
      fetchProducts();
    } catch (err) {
      console.error('Lỗi khi lưu sản phẩm:', err);
      setError(err.response?.data?.message || 'Không thể lưu sản phẩm');
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
      fetchProducts();
    } catch (err) {
      console.error('Lỗi khi xóa sản phẩm:', err);
      setError(err.response?.data?.message || 'Không thể xóa sản phẩm');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="storekeeper-inventory dashboard">
      {error && <div className="storekeeper-inventory__error">{error}</div>}
      {success && <div className="storekeeper-inventory__success">{success}</div>}

      <form className="storekeeper-inventory__filters" onSubmit={handleSearch}>
        <input
          type="text"
          placeholder="Tìm theo mã hoặc tên sản phẩm"
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
          <option value="ACTIVE">ACTIVE</option>
          <option value="INACTIVE">INACTIVE</option>
        </select>

        <button type="submit" className="storekeeper-inventory__filter-btn">
          Lọc
        </button>

        <button
          type="button"
          className="storekeeper-inventory__add-btn"
          onClick={() => handleOpenModal()}
        >
          ➕ Thêm sản phẩm
        </button>
      </form>

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
                <div className="storekeeper-inventory__form-group">
                  <label>Mã sản phẩm</label>
                  <input
                    type="text"
                    placeholder="Mã sản phẩm"
                    value={formData.product_code}
                    onChange={(e) => setFormData((prev) => ({ ...prev, product_code: e.target.value }))}
                    required
                  />
                </div>
                <div className="storekeeper-inventory__form-group">
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
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              </div>

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

      <div className="storekeeper-inventory__table-wrap">
        <table className="storekeeper-inventory__table">
          <thead>
            <tr>
              <th>Mã</th>
              <th>Tên sản phẩm</th>
              <th>Danh mục</th>
              <th>Đơn vị</th>
              <th>Nhà cung cấp</th>
              <th>Trạng thái</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" className="storekeeper-inventory__empty">Đang tải dữ liệu...</td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan="7" className="storekeeper-inventory__empty">Không có sản phẩm nào</td>
              </tr>
            ) : (
              products.map((product) => (
                <tr key={product.product_id}>
                  <td>{product.product_code}</td>
                  <td>{product.product_name}</td>
                  <td>{product.category_name || '-'}</td>
                  <td>{product.unit}</td>
                  <td>{product.supplier || '-'}</td>
                  <td>
                    <span
                      className={`storekeeper-inventory__status ${
                        product.status === 'ACTIVE'
                          ? 'storekeeper-inventory__status--active'
                          : 'storekeeper-inventory__status--inactive'
                      }`}
                    >
                      {product.status}
                    </span>
                  </td>
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
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StorekeeperInventory;
