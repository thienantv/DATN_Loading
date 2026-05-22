import React, { useEffect, useState } from 'react';
import '../../styles/storekeeper/storekeeper-layout.css';
import '../../styles/storekeeper/storekeeper-dashboard.css';
import api from '../../services/api';
import { showToast } from '../../utils/toast';

const formatNumber = (value) => Number(value || 0).toLocaleString('vi-VN');

const formatDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleDateString('vi-VN');
};

const StorekeeperDashboard = () => {
  const [dashboard, setDashboard] = useState({
    balance: [],
    summary: {},
    transactions: [],
    importCount: 0,
    exportCount: 0,
  });
  const [loading, setLoading] = useState(true);

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
        importCount: imports.length,
        exportCount: exports.length,
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
  const importCount = Number(dashboard.importCount || 0);
  const exportCount = Number(dashboard.exportCount || 0);

  const inventoryRows = [...balance].sort((a, b) => Number(b.stock_quantity || 0) - Number(a.stock_quantity || 0));
  const topProducts = inventoryRows.slice(0, 6);
  const recentTransactions = dashboard.transactions.slice(0, 3);
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

      <section className="storekeeper-dashboard__stats-grid" aria-label="Tổng quan kho">
        <article className="storekeeper-dashboard__stat-card storekeeper-dashboard__stat-card--blue">
          <div className="storekeeper-dashboard__stat-icon">📦</div>
          <div>
            <div className="storekeeper-dashboard__stat-label">Tổng sản phẩm</div>
            <div className="storekeeper-dashboard__stat-value">{formatNumber(totalProducts)}</div>
          </div>
        </article>

        <article className="storekeeper-dashboard__stat-card storekeeper-dashboard__stat-card--teal">
          <div className="storekeeper-dashboard__stat-icon">🏷️</div>
          <div>
            <div className="storekeeper-dashboard__stat-label">Tổng danh mục</div>
            <div className="storekeeper-dashboard__stat-value">{formatNumber(totalCategories)}</div>
          </div>
        </article>

        <article className="storekeeper-dashboard__stat-card storekeeper-dashboard__stat-card--green">
          <div className="storekeeper-dashboard__stat-icon">🧮</div>
          <div>
            <div className="storekeeper-dashboard__stat-label">Tổng tồn kho</div>
            <div className="storekeeper-dashboard__stat-value">{formatNumber(totalQuantity)}</div>
          </div>
        </article>

        <article className="storekeeper-dashboard__stat-card storekeeper-dashboard__stat-card--amber">
          <div className="storekeeper-dashboard__stat-icon">📥</div>
          <div>
            <div className="storekeeper-dashboard__stat-label">Phiếu nhập</div>
            <div className="storekeeper-dashboard__stat-value">{formatNumber(importCount)}</div>
          </div>
        </article>

        <article className="storekeeper-dashboard__stat-card storekeeper-dashboard__stat-card--violet">
          <div className="storekeeper-dashboard__stat-icon">📤</div>
          <div>
            <div className="storekeeper-dashboard__stat-label">Phiếu xuất</div>
            <div className="storekeeper-dashboard__stat-value">{formatNumber(exportCount)}</div>
          </div>
        </article>

        <article className="storekeeper-dashboard__stat-card storekeeper-dashboard__stat-card--rose">
          <div className="storekeeper-dashboard__stat-icon">⚠️</div>
          <div>
            <div className="storekeeper-dashboard__stat-label">Sắp hết hàng</div>
            <div className="storekeeper-dashboard__stat-value">{formatNumber(lowStockCount + outOfStockCount)}</div>
          </div>
        </article>

        <article className="storekeeper-dashboard__stat-card storekeeper-dashboard__stat-card--slate">
          <div className="storekeeper-dashboard__stat-icon">🏭</div>
          <div>
            <div className="storekeeper-dashboard__stat-label">Nhà cung cấp</div>
            <div className="storekeeper-dashboard__stat-value">{formatNumber(activeSuppliers)}</div>
          </div>
        </article>

        <article className="storekeeper-dashboard__stat-card storekeeper-dashboard__stat-card--cyan">
          <div className="storekeeper-dashboard__stat-icon">🔁</div>
          <div>
            <div className="storekeeper-dashboard__stat-label">Tổng giao dịch</div>
            <div className="storekeeper-dashboard__stat-value">{formatNumber(importCount + exportCount)}</div>
          </div>
        </article>
      </section>

      <section className="storekeeper-dashboard__layout">
        <div className="storekeeper-dashboard__main-column">
          <section className="storekeeper-dashboard__panel">
            <div className="storekeeper-dashboard__panel-header">
              <div>
                <h2 className="storekeeper-dashboard__panel-title">Hoạt động kho gần đây</h2>
                <p className="storekeeper-dashboard__panel-subtitle">Các nhập/xuất mới nhất được sắp theo thời gian.</p>
              </div>
            </div>

            <div className="storekeeper-dashboard__timeline">
              {recentTransactions.map((tx) => (
                <article key={`${tx.type}-${tx.id}`} className="storekeeper-dashboard__timeline-item">
                  <div className={`storekeeper-dashboard__timeline-dot storekeeper-dashboard__timeline-dot--${tx.type === 'NHẬP' ? 'import' : 'export'}`} />
                  <div className="storekeeper-dashboard__timeline-card">
                    <div className="storekeeper-dashboard__timeline-row">
                      <strong>{tx.type === 'NHẬP' ? 'Nhập kho' : 'Xuất kho'} {tx.product_code}</strong>
                      <span className={`storekeeper-dashboard__pill storekeeper-dashboard__pill--${tx.type === 'NHẬP' ? 'import' : 'export'}`}>
                        {tx.type === 'NHẬP' ? 'Nhập' : 'Xuất'}
                      </span>
                    </div>
                    <p>{tx.product_name}</p>
                    <span>
                      {formatNumber(tx.quantity)} {tx.unit || ''} · {formatDate(tx.date)}
                    </span>
                  </div>
                </article>
              ))}

              {recentTransactions.length === 0 && <div className="storekeeper-dashboard__empty-state">Chưa có giao dịch gần đây</div>}
            </div>
          </section>

          <section className="storekeeper-dashboard__panel">
            <div className="storekeeper-dashboard__panel-header">
              <div>
                <h2 className="storekeeper-dashboard__panel-title">Tồn kho nhóm sản phẩm</h2>
                <p className="storekeeper-dashboard__panel-subtitle">Bảng ngắn gọn về các mặt hàng đang có lượng tồn cao nhất.</p>
              </div>
            </div>

            <div className="storekeeper-dashboard__table-wrap">
              <table className="storekeeper-dashboard__table">
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
                <h2 className="storekeeper-dashboard__panel-title">Thống kê xuất kho tháng</h2>
                <p className="storekeeper-dashboard__panel-subtitle">Phân phối tồn kho theo các mã hàng đang lưu.</p>
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

          <section className="storekeeper-dashboard__mini-grid">
            <article className="storekeeper-dashboard__mini-card">
              <span className="storekeeper-dashboard__mini-label">Phiếu nhập</span>
              <strong className="storekeeper-dashboard__mini-value">{formatNumber(importCount)}</strong>
              <p>Tất cả phiếu nhập đã ghi nhận trong hệ thống.</p>
            </article>

            <article className="storekeeper-dashboard__mini-card">
              <span className="storekeeper-dashboard__mini-label">Phiếu xuất</span>
              <strong className="storekeeper-dashboard__mini-value">{formatNumber(exportCount)}</strong>
              <p>Tất cả phiếu xuất đã ghi nhận trong hệ thống.</p>
            </article>
          </section>
        </aside>
      </section>
    </div>
  );
};

export default StorekeeperDashboard;