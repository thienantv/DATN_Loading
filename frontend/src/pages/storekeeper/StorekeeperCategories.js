import React, { useEffect, useMemo, useState } from 'react';
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

  const categoryGroups = useMemo(() => {
    const groups = [
      { key: 'feed', label: 'Thức ăn thủy sản', match: /thức ăn|feed|cám|thuc an/i, color: '#3b82f6' },
      { key: 'water', label: 'Thuốc xử lý nước', match: /thuốc|xử lý nước|xu ly nuoc/i, color: '#14b8a6' },
      { key: 'chemical', label: 'Hóa chất', match: /hóa chất|hoa chat|chất/i, color: '#f97316' },
      { key: 'bio', label: 'Chế phẩm vi sinh', match: /vi sinh|men|probiotic/i, color: '#ef4444' },
    ];

    const grouped = groups.map((group) => ({
      ...group,
      count: categories.filter((category) => group.match.test(String(category.category_name || ''))).length,
    }));

    const matchedIds = new Set(
      categories
        .filter((category) => grouped.some((group) => group.match.test(String(category.category_name || ''))))
        .map((category) => category.category_id),
    );

    const others = categories.filter((category) => !matchedIds.has(category.category_id)).length;

    return [...grouped, { key: 'other', label: 'Khác', count: others, color: '#facc15' }].filter(
      (group) => group.count > 0,
    );
  }, [categories]);

  const categoryStats = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);

    const withDescription = categories.filter((category) => String(category.description || '').trim().length > 0).length;
    const withoutDescription = categories.length - withDescription;
    const recentCount = categories.filter((category) => {
      if (!category.created_at) return false;
      return new Date(category.created_at) >= thirtyDaysAgo;
    }).length;

    const newestCategory = categories
      .filter((category) => category.created_at)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0] || null;

    const distributionTotal = categoryGroups.reduce((sum, group) => sum + group.count, 0) || 1;

    const donutGradient = categoryGroups.length
      ? `conic-gradient(${categoryGroups
          .map((group, index) => {
            const start = categoryGroups.slice(0, index).reduce((sum, item) => sum + item.count, 0);
            const end = start + group.count;
            const startPercent = (start / distributionTotal) * 100;
            const endPercent = (end / distributionTotal) * 100;
            return `${group.color} ${startPercent}% ${endPercent}%`;
          })
          .join(', ')})`
      : 'conic-gradient(#e5e7eb 0% 100%)';

    const popularGroups = [...categoryGroups].sort((a, b) => b.count - a.count).slice(0, 5);

    return {
      total: categories.length,
      withDescription,
      withoutDescription,
      recentCount,
      newestCategory,
      donutGradient,
      popularGroups,
    };
  }, [categories, categoryGroups]);

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
    <div className="storekeeper-categories__page storekeeper-page">
      <section className="storekeeper-categories__hero">
        <div className="storekeeper-categories__hero-copy">
          <p className="storekeeper-categories__eyebrow">Quản lý kho</p>
          <h1>Quản lý danh mục sản phẩm</h1>
          <p>Quản lý và phân loại danh mục hàng hóa trong kho.</p>
        </div>

        <button className="storekeeper-categories__button-primary storekeeper-categories__add-btn" onClick={() => handleOpenForm()}>
          + Thêm danh mục
        </button>
      </section>

      <section className="storekeeper-categories__stats-grid">
        <article className="storekeeper-categories__stat-card storekeeper-categories__stat-card--blue">
          <div className="storekeeper-categories__stat-icon">🏷️</div>
          <div>
            <p>Tổng danh mục</p>
            <h3>{categoryStats.total}</h3>
          </div>
        </article>
        <article className="storekeeper-categories__stat-card storekeeper-categories__stat-card--green">
          <div className="storekeeper-categories__stat-icon">✅</div>
          <div>
            <p>Danh mục có mô tả</p>
            <h3>{categoryStats.withDescription}</h3>
          </div>
        </article>
        <article className="storekeeper-categories__stat-card storekeeper-categories__stat-card--amber">
          <div className="storekeeper-categories__stat-icon">🆕</div>
          <div>
            <p>Danh mục mới 30 ngày</p>
            <h3>{categoryStats.recentCount}</h3>
          </div>
        </article>
        <article className="storekeeper-categories__stat-card storekeeper-categories__stat-card--slate">
          <div className="storekeeper-categories__stat-icon">⏱️</div>
          <div>
            <p>Danh mục chưa mô tả</p>
            <h3>{categoryStats.withoutDescription}</h3>
          </div>
        </article>
      </section>

      <div className="storekeeper-categories__content-grid">
        <div className="storekeeper-categories__main-column">
          <section className="storekeeper-categories__toolbar-card">
            <div className="storekeeper-categories__toolbar-main">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm kiếm danh mục..."
                className="storekeeper-categories__search"
              />
              <div className="storekeeper-categories__toolbar-meta">
                <span>Tìm kiếm {filteredCategories.length} / {categories.length}</span>
              </div>
            </div>
          </section>

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
            <section className="storekeeper-categories__table-card">
              <div className="storekeeper-categories__table-head">
                <div>
                  <h2>Product Category Table</h2>
                  <p>Danh sách danh mục sản phẩm đang được quản lý trong kho.</p>
                </div>
              </div>

              <div className="storekeeper-categories__table-wrapper">
                <table className="storekeeper-categories__table">
                  <thead>
                    <tr>
                      <th>Mã danh mục</th>
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
            </section>
          )}
        </div>

        <aside className="storekeeper-categories__sidebar">
          <section className="storekeeper-categories__insight-card">
            <div className="storekeeper-categories__insight-head">
              <div>
                <h2>Thống kê danh mục</h2>
                <p>Phân bổ danh mục</p>
              </div>
            </div>

            <div className="storekeeper-categories__donut-wrap">
              <div
                className="storekeeper-categories__donut"
                style={{ background: categoryStats.donutGradient }}
              >
                <div className="storekeeper-categories__donut-center">
                  <strong>{categoryStats.total}</strong>
                  <span>Danh mục</span>
                </div>
              </div>

              <div className="storekeeper-categories__legend">
                {categoryGroups.map((group) => (
                  <div key={group.key} className="storekeeper-categories__legend-item">
                    <span className="storekeeper-categories__legend-dot" style={{ background: group.color }} />
                    <span>{group.label}</span>
                    <strong>{group.count}</strong>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="storekeeper-categories__insight-card">
            <div className="storekeeper-categories__insight-head">
              <div>
                <h2>Sử dụng danh mục phổ biến</h2>
                <p>Xếp hạng theo nhóm danh mục</p>
              </div>
            </div>

            <div className="storekeeper-categories__bar-chart">
              {categoryStats.popularGroups.length > 0 ? (
                categoryStats.popularGroups.map((group, index) => {
                  const maxValue = Math.max(...categoryStats.popularGroups.map((item) => item.count), 1);
                  const width = `${Math.max((group.count / maxValue) * 100, group.count > 0 ? 18 : 6)}%`;
                  return (
                    <div key={group.key} className="storekeeper-categories__bar-row">
                      <div className="storekeeper-categories__bar-meta">
                        <span>{index + 1}. {group.label}</span>
                        <strong>{group.count}</strong>
                      </div>
                      <div className="storekeeper-categories__bar-track">
                        <span className="storekeeper-categories__bar-fill" style={{ width, background: group.color }} />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="storekeeper-categories__empty-analytics">Chưa có dữ liệu phân bổ</div>
              )}
            </div>
          </section>

          <section className="storekeeper-categories__mini-grid">
            <article className="storekeeper-categories__mini-card">
              <p>Danh mục mới gần nhất</p>
              <h3>{categoryStats.newestCategory?.category_name || '—'}</h3>
              <span>{categoryStats.newestCategory?.created_at ? new Date(categoryStats.newestCategory.created_at).toLocaleDateString('vi-VN') : 'Chưa có dữ liệu'}</span>
            </article>
            <article className="storekeeper-categories__mini-card">
              <p>Đã có mô tả</p>
              <h3>{categoryStats.withDescription}</h3>
              <span>Danh mục có mô tả chi tiết</span>
            </article>
          </section>
        </aside>
      </div>

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
