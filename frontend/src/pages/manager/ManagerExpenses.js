import React, { useState, useEffect } from 'react';
import { expenseService, seasonService } from '../../services/api';
import '../../styles/dashboard.css';

export const ManagerExpenses = () => {
  const [expenses, setExpenses] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [selectedSeason, setSelectedSeason] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    categoryId: 1,
    amount: '',
    expenseDate: '',
    note: '',
  });

  useEffect(() => {
    fetchSeasons();
  }, []);

  useEffect(() => {
    if (selectedSeason) {
      fetchExpenses(selectedSeason);
    }
  }, [selectedSeason]);

  const fetchSeasons = async () => {
    try {
      setLoading(true);
      const response = await seasonService.getAllSeasons();
      setSeasons(response.data.data || []);
      if (response.data.data?.length > 0) {
        setSelectedSeason(response.data.data[0].season_id);
      }
    } catch (err) {
      setError('Lỗi tải danh sách mùa vụ');
    } finally {
      setLoading(false);
    }
  };

  const fetchExpenses = async (seasonId) => {
    try {
      const response = await expenseService.getExpensesBySeasonId(seasonId);
      setExpenses(response.data.data || []);
    } catch (err) {
      setError('Lỗi tải danh sách chi phí');
    }
  };

  const categories = [
    { id: 1, name: 'Thức ăn' },
    { id: 2, name: 'Thuốc / Vi sinh' },
    { id: 3, name: 'Điện nước' },
    { id: 4, name: 'Nhân công' },
    { id: 5, name: 'Chi phí khác' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      await expenseService.createExpense({
        season_id: selectedSeason,
        category_id: parseInt(formData.categoryId),
        amount: parseFloat(formData.amount),
        expense_date: formData.expenseDate,
        note: formData.note,
      });
      setSuccess('Tạo chi phí thành công');
      setShowModal(false);
      fetchExpenses(selectedSeason);
      setFormData({ categoryId: 1, amount: '', expenseDate: '', note: '' });
    } catch (err) {
      setError('Lỗi tạo chi phí');
    }
  };

  const handleApprove = async (expenseId) => {
    try {
      await expenseService.approveExpense(expenseId);
      setSuccess('Duyệt chi phí thành công');
      fetchExpenses(selectedSeason);
    } catch (err) {
      setError('Lỗi duyệt chi phí');
    }
  };

  const handleReject = async (expenseId) => {
    try {
      await expenseService.rejectExpense(expenseId);
      setSuccess('Từ chối chi phí thành công');
      fetchExpenses(selectedSeason);
    } catch (err) {
      setError('Lỗi từ chối chi phí');
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

  const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
  const approvedExpenses = expenses.filter((e) => e.status === 'APPROVED');
  const pendingExpenses = expenses.filter((e) => e.status === 'PENDING');

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>💰 Quản lý chi phí</h1>
        <p>Quản lý chi phí vận hành & duyệt yêu cầu chi phí</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div style={{ marginBottom: '20px' }}>
        <label style={{ marginRight: '10px', fontWeight: 600 }}>Chọn mùa vụ:</label>
        <select
          value={selectedSeason || ''}
          onChange={(e) => setSelectedSeason(parseInt(e.target.value))}
          style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #e5e7eb' }}
        >
          {seasons.map((season) => (
            <option key={season.season_id} value={season.season_id}>
              {season.season_name}
            </option>
          ))}
        </select>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: '40px' }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#dbeafe' }}>
            💰
          </div>
          <div className="stat-content">
            <p className="stat-label">Tổng chi phí</p>
            <p className="stat-value">{totalExpenses.toLocaleString('vi-VN')} đ</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#dcfce7' }}>
            ✅
          </div>
          <div className="stat-content">
            <p className="stat-label">Đã duyệt</p>
            <p className="stat-value">{approvedExpenses.length}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#fef3c7' }}>
            ⏳
          </div>
          <div className="stat-content">
            <p className="stat-label">Chờ duyệt</p>
            <p className="stat-value">{pendingExpenses.length}</p>
          </div>
        </div>
      </div>

      <div className="table-container">
        <div className="table-header">
          <h2>Danh sách chi phí</h2>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            ➕ Thêm chi phí
          </button>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Ngày</th>
                <th>Danh mục</th>
                <th>Số tiền</th>
                <th>Ghi chú</th>
                <th>Trạng thái</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {expenses.length > 0 ? (
                expenses.map((expense) => (
                  <tr key={expense.expense_id}>
                    <td>{new Date(expense.expense_date).toLocaleDateString('vi-VN')}</td>
                    <td>
                      {categories.find((c) => c.id === expense.category_id)?.name ||
                        'Khác'}
                    </td>
                    <td><strong>{expense.amount?.toLocaleString('vi-VN')} đ</strong></td>
                    <td>{expense.note}</td>
                    <td>
                      <span
                        className={`status-badge ${
                          expense.status === 'APPROVED'
                            ? 'status-active'
                            : expense.status === 'REJECTED'
                            ? 'status-inactive'
                            : 'status-pending'
                        }`}
                      >
                        {expense.status === 'APPROVED' && '✅ Đã duyệt'}
                        {expense.status === 'PENDING' && '⏳ Chờ duyệt'}
                        {expense.status === 'REJECTED' && '❌ Từ chối'}
                      </span>
                    </td>
                    <td>
                      {expense.status === 'PENDING' && (
                        <div style={{ display: 'flex', gap: '5px' }}>
                          <button
                            className="btn btn-sm btn-success"
                            onClick={() => handleApprove(expense.expense_id)}
                          >
                            ✅
                          </button>
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => handleReject(expense.expense_id)}
                          >
                            ❌
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>
                    Chưa có chi phí nào
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
            <h2>➕ Thêm chi phí mới</h2>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Danh mục</label>
                <select
                  value={formData.categoryId}
                  onChange={(e) =>
                    setFormData({ ...formData, categoryId: e.target.value })
                  }
                  required
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Số tiền (đ)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Ngày chi</label>
                  <input
                    type="date"
                    value={formData.expenseDate}
                    onChange={(e) =>
                      setFormData({ ...formData, expenseDate: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Ghi chú</label>
                <textarea
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
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

export default ManagerExpenses;
