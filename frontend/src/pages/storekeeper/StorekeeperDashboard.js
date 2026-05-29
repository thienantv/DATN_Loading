import React, { useEffect, useState } from 'react';
import '../../styles/storekeeper/storekeeper-dashboard.css';
import api from '../../services/api';
import { showToast } from '../../utils/toast';

const formatNumber = (value) => Number(value || 0).toLocaleString('vi-VN');

const StorekeeperDashboard = () => {
  const [dashboard, setDashboard] = useState({
    balance: [],
    summary: {},
  });
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [balanceRes, summaryRes] = await Promise.all([
        api.get('/inventory/balance'),
        api.get('/inventory/summary'),
      ]);

      setDashboard({
        balance: balanceRes.data?.data || [],
        summary: summaryRes.data?.data || {},
      });
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu dashboard:', err);
      showToast({ title: 'Không thể tải dữ liệu dashboard. Vui lòng thử lại.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const summary = dashboard.summary || {};
  const balance = Array.isArray(dashboard.balance) ? dashboard.balance : [];

  const inventoryRows = [...balance].sort((a, b) => Number(b.stock_quantity || 0) - Number(a.stock_quantity || 0));
  const topProducts = inventoryRows.slice(0, 6);
  const lowStockThreshold = 20;
  const lowStockCount = inventoryRows.filter((item) => {
    const stock = Number(item.stock_quantity || 0);
    return stock > 0 && stock <= lowStockThreshold;
  }).length;

  const totalProducts = Number(summary.total_products || balance.length || 0);
  const totalCategories = Number(summary.total_categories || 0);
  const totalQuantity = Number(summary.total_quantity || balance.reduce((acc, item) => acc + Number(item.stock_quantity || 0), 0));
  const activeSuppliers = new Set(balance.map((item) => String(item.supplier || '').trim()).filter(Boolean)).size;
  const outOfStockCount = balance.filter((item) => Number(item.stock_quantity || 0) <= 0).length;
  const lowStockSignal = lowStockCount + outOfStockCount;

  const getStockStatus = (stockValue) => {
    const stock = Number(stockValue || 0);
    if (stock <= 0) {
      return { label: 'Hết hàng', variant: 'out' };
    }
    if (stock <= lowStockThreshold) {
      return { label: 'Sắp hết', variant: 'low' };
    }
    return { label: 'Còn hàng', variant: 'in' };
  };

  const categoryMap = balance.reduce((acc, item) => {
    const key = item.category_name || 'Chưa phân loại';
    acc[key] = (acc[key] || 0) + Number(item.stock_quantity || 0);
    return acc;
  }, {});

  const categoryColors = ['#2563eb', '#14b8a6', '#f59e0b', '#8b5cf6', '#ef4444', '#22c55e'];
  const categoryData = Object.entries(categoryMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
  const categoryTotal = categoryData.reduce((acc, item) => acc + item.value, 0);
  const donutGradient = categoryTotal
    ? `conic-gradient(${categoryData
        .reduce(
          (segments, item, index) => {
            const start = segments.offset;
            const end = start + (item.value / categoryTotal) * 100;
            segments.parts.push(`${categoryColors[index % categoryColors.length]} ${start}% ${end}%`);
            segments.offset = end;
            return segments;
          },
          { offset: 0, parts: [] },
        )
        .parts.join(', ')})`
    : 'conic-gradient(#e2e8f0 0% 100%)';

  const maxStock = Math.max(...topProducts.map((item) => Number(item.stock_quantity || 0)), 1);

  if (loading) {
    return (
      <div className="storekeeper-dashboard">
        <div className="storekeeper-dashboard__loading">
          <div className="storekeeper-dashboard__spinner" />
        </div>
      </div>
    );
  }

  return (
    <div className="storekeeper-dashboard">
      <header className="storekeeper-dashboard__hero">
        <div className="storekeeper-dashboard__hero-copy">
          {/* <p className="storekeeper-dashboard__eyebrow">Storekeeper Dashboard</p> */}
          <h1 className="storekeeper-dashboard__title">Dashboard</h1>
          <p className="storekeeper-dashboard__subtitle">
            Tổng quan hoạt động kho, tồn kho, giao dịch gần đây và các tín hiệu cần xử lý ngay.
          </p>
        </div>
      </header>

      <section className="stats-grid" aria-label="Tổng quan kho">
        <article className="stats-card stats-card--primary stats-card-row">
          <div className="stats-card-icon">📦</div>
          <div className="stats-card-content">
            <div className="stats-card-label">Tổng sản phẩm</div>
            <div className="stats-card-value">{formatNumber(totalProducts)}</div>
          </div>
        </article>

        <article className="stats-card stats-card--teal stats-card-row">
          <div className="stats-card-icon">🏷️</div>
          <div className="stats-card-content">
            <div className="stats-card-label">Tổng danh mục</div>
            <div className="stats-card-value">{formatNumber(totalCategories)}</div>
          </div>
        </article>

        <article className="stats-card stats-card--success stats-card-row">
          <div className="stats-card-icon">🧮</div>
          <div className="stats-card-content">
            <div className="stats-card-label">Tổng tồn kho</div>
            <div className="stats-card-value">{formatNumber(totalQuantity)}</div>
          </div>
        </article>

        <article className="stats-card stats-card--rose stats-card-row">
          <div className="stats-card-icon">⚠️</div>
          <div className="stats-card-content">
            <div className="stats-card-label">Sắp hết hàng</div>
            <div className="stats-card-value">{formatNumber(lowStockSignal)}</div>
          </div>
        </article>

        <article className="stats-card stats-card--neutral stats-card-row">
          <div className="stats-card-icon">🏭</div>
          <div className="stats-card-content">
            <div className="stats-card-label">Nhà cung cấp</div>
            <div className="stats-card-value">{formatNumber(activeSuppliers)}</div>
          </div>
        </article>

      </section>

      <section className="storekeeper-dashboard__layout">
        <div className="storekeeper-dashboard__main-column">
          <section className="storekeeper-dashboard__panel">
            <div className="storekeeper-dashboard__panel-header">
              <div>
                <h2 className="storekeeper-dashboard__panel-title">Tồn kho nhóm sản phẩm</h2>
                <p className="storekeeper-dashboard__panel-subtitle">Bảng ngắn gọn về các mặt hàng đang có lượng tồn cao nhất.</p>
              </div>
            </div>

            <div className="storekeeper-dashboard__table-wrap">
              <table className="table-base storekeeper-dashboard__table">
                <thead>
                  <tr>
                    <th>Mã SP</th>
                    <th>Tên sản phẩm</th>
                    <th>Danh mục</th>
                    <th>Tồn kho</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {topProducts.map((item) => {
                    const stock = Number(item.stock_quantity || 0);
                    const stockPercent = Math.min((stock / maxStock) * 100, 100);
                    const stockStatus = getStockStatus(stock);

                    return (
                      <tr key={item.product_id}>
                        <td>
                          <span className="storekeeper-dashboard__code">{item.product_code}</span>
                        </td>
                        <td>{item.product_name}</td>
                        <td>{item.category_name || 'Chưa phân loại'}</td>
                        <td>
                          <div className="storekeeper-dashboard__stock-cell">
                            <div className="storekeeper-dashboard__stock-track">
                              <span className="storekeeper-dashboard__stock-fill" style={{ width: `${stockPercent}%` }} />
                            </div>
                            <span className="storekeeper-dashboard__stock-number">
                              {formatNumber(stock)} {item.unit || ''}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span className={`storekeeper-dashboard__status-badge storekeeper-dashboard__status-badge--${stockStatus.variant}`}>
                            {stockStatus.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}

                  {topProducts.length === 0 && (
                    <tr>
                      <td colSpan="5" className="storekeeper-dashboard__empty-table">Chưa có dữ liệu tồn kho</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

        </div>

        <aside className="storekeeper-dashboard__side-column">
          <section className="storekeeper-dashboard__panel storekeeper-dashboard__panel--chart">
            <div className="storekeeper-dashboard__panel-header">
              <div>
                <h2 className="storekeeper-dashboard__panel-title">Phân bố tồn kho</h2>
                <p className="storekeeper-dashboard__panel-subtitle">Phân phối tồn kho theo các danh mục đang lưu.</p>
              </div>
            </div>

            <div className="storekeeper-dashboard__chart-card">
              <div className="storekeeper-dashboard__bar-chart">
                {topProducts.map((item, index) => {
                  const stock = Number(item.stock_quantity || 0);
                  const height = stock ? Math.max((stock / maxStock) * 100, 8) : 8;
                  const barColor = categoryColors[index % categoryColors.length];

                  return (
                    <div key={item.product_id} className="storekeeper-dashboard__bar-item">
                      <div className="storekeeper-dashboard__bar-track">
                        <span className="storekeeper-dashboard__bar-fill" style={{ height: `${height}%`, background: barColor }} />
                      </div>
                      <div className="storekeeper-dashboard__bar-label">{item.product_code}</div>
                      <div className="storekeeper-dashboard__bar-value">{formatNumber(stock)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="storekeeper-dashboard__panel storekeeper-dashboard__panel--chart">
            <div className="storekeeper-dashboard__panel-header">
              <div>
                <h2 className="storekeeper-dashboard__panel-title">Xuất lượng tồn kho</h2>
                <p className="storekeeper-dashboard__panel-subtitle">Phân bổ danh mục đang chiếm nhiều diện tích kho.</p>
              </div>
            </div>

            <div className="storekeeper-dashboard__donut-panel">
              <div className="storekeeper-dashboard__donut" style={{ background: donutGradient }}>
                <div className="storekeeper-dashboard__donut-core">
                  <strong>{categoryData.length}</strong>
                  <span>nhóm</span>
                </div>
              </div>

              <div className="storekeeper-dashboard__legend">
                {categoryData.map((item, index) => (
                  <div key={item.name} className="storekeeper-dashboard__legend-item">
                    <span className="storekeeper-dashboard__legend-swatch" style={{ background: categoryColors[index % categoryColors.length] }} />
                    <div className="storekeeper-dashboard__legend-copy">
                      <strong>{item.name}</strong>
                      <span>{formatNumber(item.value)}</span>
                    </div>
                  </div>
                ))}

                {categoryData.length === 0 && <div className="storekeeper-dashboard__empty-state">Chưa có dữ liệu danh mục</div>}
              </div>
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
};

export default StorekeeperDashboard;
