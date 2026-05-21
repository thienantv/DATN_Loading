import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import '../../styles/storekeeper/storekeeper-layout.css';
import '../../styles/storekeeper/storekeeper-dashboard.css';
import api from '../../services/api';
import { showToast } from '../../utils/toast';

const StorekeeperDashboard = () => {
  const [dashboard, setDashboard] = useState({
    balance: [],
    summary: {},
    transactions: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [balanceRes, summaryRes, importsRes, exportsRes] = await Promise.all([
        api.get('/inventory/balance'),
        api.get('/inventory/summary'),
        api.get('/inventory/imports'),
        api.get('/inventory/exports'),
      ]);

      const imports = (importsRes.data?.data || []).map((row) => ({
        id: row.import_id,
        product_code: row.product_code,
        product_name: row.product_name,
        quantity: row.quantity,
        unit: row.unit,
        type: 'NHẬP',
        date: row.import_date,
      }));

      const exports = (exportsRes.data?.data || []).map((row) => ({
        id: row.export_id,
        product_code: row.product_code,
        product_name: row.product_name,
        quantity: row.quantity,
        unit: row.unit,
        type: 'XUẤT',
        date: row.export_date,
      }));

      const transactions = [...imports, ...exports]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 10);

      setDashboard({
        balance: balanceRes.data?.data || [],
        summary: summaryRes.data?.data || {},
        transactions,
      });
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu dashboard:', err);
      showToast({ title: 'Không thể tải dữ liệu dashboard. Vui lòng thử lại.', type: 'error' })
    } finally {
      setLoading(false);
    }
  };

  const summary = dashboard.summary || {};

  if (loading) {
    return (
      <div className="storekeeper-dashboard dashboard">
        <div className="flex-center page-loading">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  // Notifications (errors) are shown via global toast

  return (
    <div className="storekeeper-dashboard dashboard">
      <section className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📦</div>
          <div className="stat-content">
            <div className="stat-label">Tổng sản phẩm</div>
            <div className="stat-value">{Number(summary.total_products || 0).toLocaleString('vi-VN')}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🏷️</div>
          <div className="stat-content">
            <div className="stat-label">Tổng danh mục</div>
            <div className="stat-value">{Number(summary.total_categories || 0).toLocaleString('vi-VN')}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <div className="stat-label">Tổng số lượng tồn</div>
            <div className="stat-value">{Number(summary.total_quantity || 0).toLocaleString('vi-VN')}</div>
          </div>
        </div>
      </section>

      <section className="quick-actions">
        <h2>🚀 Hành động nhanh</h2>
        <div className="actions-grid">
          <Link to="/storekeeper/imports" className="action-btn">
            <span className="action-icon">📥</span>
            <span className="action-label">Nhập kho</span>
          </Link>
          <Link to="/storekeeper/exports" className="action-btn">
            <span className="action-icon">📤</span>
            <span className="action-label">Xuất kho</span>
          </Link>
          <Link to="/storekeeper/inventory" className="action-btn">
            <span className="action-icon">🆕</span>
            <span className="action-label">Thêm sản phẩm</span>
          </Link>
          <Link to="/storekeeper/categories" className="action-btn">
            <span className="action-icon">🏷️</span>
            <span className="action-label">Quản lý danh mục</span>
          </Link>
        </div>
      </section>

      <section className="recent-section">
        <h2>📋 Giao dịch gần đây</h2>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Ngày</th>
                <th>Loại giao dịch</th>
                <th>Mã sản phẩm</th>
                <th>Tên sản phẩm</th>
                <th>Số lượng</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.transactions.map((tx) => (
                <tr key={`${tx.type}-${tx.id}`}>
                  <td>{new Date(tx.date).toLocaleDateString('vi-VN')}</td>
                  <td>
                    <span className={`transaction-badge ${tx.type === 'NHẬP' ? 'import' : 'export'}`}>
                      {tx.type === 'NHẬP' ? '📥 Nhập' : '📤 Xuất'}
                    </span>
                  </td>
                  <td>{tx.product_code}</td>
                  <td>{tx.product_name}</td>
                  <td>{Number(tx.quantity || 0).toLocaleString('vi-VN')} {tx.unit || ''}</td>
                </tr>
              ))}
              {dashboard.transactions.length === 0 && (
                <tr>
                  <td colSpan="5" className="empty-cell">Chưa có giao dịch</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default StorekeeperDashboard;
