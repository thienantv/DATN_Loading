import React, { useState, useEffect } from 'react';
import { productService } from '../../services/api';
import '../../styles/dashboard.css';

export const AdminProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [filterCategory, setFilterCategory] = useState('');
  const [formData, setFormData] = useState({
    productName: '',
    category: 'Thức ăn',
    unit: '',
    price: '',
    description: '',
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await productService.getAllProducts();
      setProducts(response.data.data || []);
    } catch (err) {
      setError('Lỗi tải danh sách sản phẩm');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const categories = ['Thức ăn', 'Thuốc / Vi sinh', 'Khác'];

  const filteredProducts = filterCategory
    ? products.filter((p) => p.category === filterCategory)
    : products;

  const handleOpenModal = (product = null) => {
    if (product) {
      setSelectedProduct(product);
      setFormData({
        productName: product.product_name || '',
        category: product.category || 'Thức ăn',
        unit: product.unit || '',
        price: product.price || '',
        description: product.description || '',
      });
    } else {
      setSelectedProduct(null);
      setFormData({
        productName: '',
        category: 'Thức ăn',
        unit: '',
        price: '',
        description: '',
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      const data = {
        product_name: formData.productName,
        category: formData.category,
        unit: formData.unit,
        price: parseFloat(formData.price) || 0,
        description: formData.description,
      };

      if (selectedProduct) {
        await productService.updateProduct(selectedProduct.product_id, data);
        setSuccess('Cập nhật sản phẩm thành công');
      } else {
        await productService.createProduct(data);
        setSuccess('Tạo sản phẩm mới thành công');
      }
      setShowModal(false);
      fetchProducts();
    } catch (err) {
      setError(err.response?.data?.message || 'Lỗi xử lý');
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa sản phẩm này?')) {
      try {
        await productService.deleteProduct(productId);
        setSuccess('Xóa sản phẩm thành công');
        fetchProducts();
      } catch (err) {
        setError('Lỗi xóa sản phẩm');
      }
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

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>📋 Quản lý danh mục</h1>
        <p>Quản lý danh mục sản phẩm (Thức ăn, Thuốc, Vi sinh)</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="table-container">
        <div className="table-header">
          <h2>Danh sách sản phẩm</h2>
          <button className="btn btn-primary" onClick={() => handleOpenModal()}>
            ➕ Thêm sản phẩm
          </button>
        </div>

        <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
          <label style={{ marginRight: '10px' }}>Lọc theo loại:</label>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #e5e7eb' }}
          >
            <option value="">-- Tất cả --</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Tên sản phẩm</th>
                <th>Loại</th>
                <th>Đơn vị</th>
                <th>Giá</th>
                <th>Mô tả</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length > 0 ? (
                filteredProducts.map((product) => (
                  <tr key={product.product_id}>
                    <td><strong>{product.product_name}</strong></td>
                    <td>{product.category}</td>
                    <td>{product.unit}</td>
                    <td>{product.price?.toLocaleString('vi-VN')} đ</td>
                    <td>{product.description}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '5px' }}>
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => handleOpenModal(product)}
                        >
                          ✏️
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDeleteProduct(product.product_id)}
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>
                    Không có sản phẩm nào
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{selectedProduct ? '✏️ Chỉnh sửa sản phẩm' : '➕ Thêm sản phẩm mới'}</h2>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Tên sản phẩm</label>
                <input
                  type="text"
                  value={formData.productName}
                  onChange={(e) =>
                    setFormData({ ...formData, productName: e.target.value })
                  }
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Loại</label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                    required
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Đơn vị</label>
                  <input
                    type="text"
                    placeholder="VD: kg, lít, thùng"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Giá (đ)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Mô tả</label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
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
    </div>
  );
};

export default AdminProducts;
