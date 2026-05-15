import React, { useEffect, useState } from 'react';
import '../../styles/storekeeper/storekeeper-layout.css';
import '../../styles/storekeeper/storekeeper-categories.css';
import api from '../../services/api';

const StorekeeperCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    category_name: '',
    description: '',
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await api.get('/inventory/categories');
      setCategories(res.data?.data || []);
      setError(null);
    } catch (err) {
      console.error('Lỗi khi tải danh mục:', err);
      setError('Không thể tải danh sách danh mục');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleOpenForm = (category = null) => {
    if (category) {
      setEditingId(category.category_id);
      setFormData({
        category_name: category.category_name || '',
        description: category.description || '',
      });
    } else {
      setEditingId(null);
      setFormData({
        category_name: '',
        description: '',
      });
    }
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({
      category_name: '',
      description: '',
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        categoryName: formData.category_name.trim(),
        description: formData.description.trim(),
      };

      if (!payload.categoryName) {
        setError('Tên danh mục không được để trống');
        return;
      }

      if (editingId) {
        await api.put(`/inventory/categories/${editingId}`, payload);
        setSuccess('Cập nhật danh mục thành công');
      } else {
        await api.post('/inventory/categories', payload);
        setSuccess('Tạo danh mục thành công');
      }

      handleCloseForm();
      fetchCategories();
    } catch (err) {
      console.error('Lỗi khi lưu danh mục:', err);
      setError(err.response?.data?.message || 'Không thể lưu danh mục');
    }
  };

  const handleDelete = async (categoryId) => {
    if (!window.confirm('Bạn chắc chắn muốn xóa danh mục này?')) {
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      await api.delete(`/inventory/categories/${categoryId}`);
      setSuccess('Xóa danh mục thành công');
      fetchCategories();
    } catch (err) {
      console.error('Lỗi khi xóa danh mục:', err);
      setError(err.response?.data?.message || 'Không thể xóa danh mục');
    }
  };

  const filteredCategories = categories.filter((category) => {
    const keyword = searchTerm.toLowerCase();
    return (
      category.category_name?.toLowerCase().includes(keyword) ||
      category.description?.toLowerCase().includes(keyword)
    );
  });

  return (
    <div className="storekeeper-categories__page">
      <div className="storekeeper-categories__toolbar">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Tìm theo tên hoặc mô tả danh mục..."
          className="storekeeper-categories__search"
        />
        <button className="storekeeper-categories__button-primary" onClick={() => handleOpenForm()}>
          ➕ Thêm danh mục
        </button>
      </div>

      {error && (
        <div className="storekeeper-categories__alert storekeeper-categories__alert--error">
          {error}
        </div>
      )}

      {success && (
        <div className="storekeeper-categories__alert storekeeper-categories__alert--success">
          {success}
        </div>
      )}

      {loading ? (
        <div className="storekeeper-categories__loading">Đang tải dữ liệu...</div>
      ) : (
        <div className="storekeeper-categories__table-wrapper">
          <table className="storekeeper-categories__table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Tên danh mục</th>
                <th>Mô tả</th>
                <th>Ngày tạo</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {filteredCategories.length > 0 ? (
                filteredCategories.map((category) => (
                  <tr key={category.category_id}>
                    <td>{category.category_id}</td>
                    <td className="storekeeper-categories__name">{category.category_name}</td>
                    <td>{category.description || '—'}</td>
                    <td>{category.created_at ? new Date(category.created_at).toLocaleDateString('vi-VN') : '—'}</td>
                    <td className="storekeeper-categories__actions">
                      <button
                        className="storekeeper-categories__button-secondary"
                        onClick={() => handleOpenForm(category)}
                      >
                        ✏️ Sửa
                      </button>
                      <button
                        className="storekeeper-categories__button-danger"
                        onClick={() => handleDelete(category.category_id)}
                      >
                        🗑️ Xóa
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="storekeeper-categories__empty">
                    Không tìm thấy danh mục nào
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="storekeeper-categories__modal" onClick={handleCloseForm}>
          <div className="storekeeper-categories__modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="storekeeper-categories__modal-header">
              <h2>{editingId ? 'Cập nhật danh mục' : 'Thêm danh mục mới'}</h2>
              <button className="storekeeper-categories__close-btn" onClick={handleCloseForm}>✕</button>
            </div>

            <form onSubmit={handleSubmit} className="storekeeper-categories__form">
              <div className="storekeeper-categories__form-group">
                <label>Tên danh mục *</label>
                <input
                  type="text"
                  name="category_name"
                  value={formData.category_name}
                  onChange={handleInputChange}
                  placeholder="VD: Thức ăn, Thuốc, Vi sinh"
                  required
                />
              </div>

              <div className="storekeeper-categories__form-group">
                <label>Mô tả</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Mô tả ngắn về nhóm danh mục"
                  rows="4"
                />
              </div>

              <div className="storekeeper-categories__modal-actions">
                <button type="submit" className="storekeeper-categories__button-primary">
                  {editingId ? '💾 Cập nhật' : '➕ Tạo mới'}
                </button>
                <button type="button" className="storekeeper-categories__button-secondary" onClick={handleCloseForm}>
                  ✕ Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StorekeeperCategories;
