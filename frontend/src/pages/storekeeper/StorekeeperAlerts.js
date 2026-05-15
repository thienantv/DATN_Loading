import React, { useEffect, useState } from 'react';
import '../../styles/storekeeper/storekeeper-layout.css';
import '../../styles/storekeeper/storekeeper-alerts.css';
import api from '../../services/api';

const StorekeeperAlerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [filteredAlerts, setFilteredAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('stock_quantity');
  const [sortOrder, setSortOrder] = useState('asc');

  useEffect(() => {
    fetchLowStockAlerts();
  }, []);

  useEffect(() => {
    sortAlerts();
  }, [alerts, sortBy, sortOrder]);

  const fetchLowStockAlerts = async () => {
    try {
      setLoading(true);
      // Adjusted endpoint and data processing for the new schema
      const res = await api.get('/inventory/low-stock');
      // Assume the API provides products with stock_quantity < 100 based on instructions
      setAlerts(res.data?.data || []);
      setError(null);
    } catch (err) {
      console.error('Lỗi khi tải cảnh báo:', err);
      setError('Không thể tải danh sách cảnh báo');
    } finally {
      setLoading(false);
    }
  };

  const sortAlerts = () => {
    const sorted = [...alerts];

    sorted.sort((a, b) => {
      let aValue;
      let bValue;

      switch (sortBy) {
        case 'stock_quantity':
          aValue = parseFloat(a.stock_quantity || 0);
          bValue = parseFloat(b.stock_quantity || 0);
          break;
        case 'product_name':
          aValue = (a.product_name || '').toLowerCase();
          bValue = (b.product_name || '').toLowerCase();
          break;
        case 'product_code':
          aValue = (a.product_code || '').toLowerCase();
          bValue = (b.product_code || '').toLowerCase();
          break;
        case 'category_name':
          aValue = (a.category_name || '').toLowerCase();
          bValue = (b.category_name || '').toLowerCase();
          break;
        default:
          aValue = a.stock_quantity;
          bValue = b.stock_quantity;
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : 1;
      }
      return aValue > bValue ? -1 : 1;
    });

    setFilteredAlerts(sorted);
  };

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  if (loading) {
    return <div className="alerts-loading">Đang tải dữ liệu...</div>;
  }

  return (
    <div className="storekeeper-alerts-container">
      {error ? (
        <div className="alerts-error-message">{error}</div>
      ) : (
        <div className="alerts-table-wrapper">
          <table className="alerts-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('product_code')} className={sortBy === 'product_code' ? 'active-sort' : ''}>
                  Mã sản phẩm {sortBy === 'product_code' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('product_name')} className={sortBy === 'product_name' ? 'active-sort' : ''}>
                  Tên sản phẩm {sortBy === 'product_name' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('category_name')} className={sortBy === 'category_name' ? 'active-sort' : ''}>
                  Danh mục {sortBy === 'category_name' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('stock_quantity')} className={sortBy === 'stock_quantity' ? 'active-sort' : ''}>
                  Tồn kho {sortBy === 'stock_quantity' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th>Đơn vị</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {filteredAlerts.length > 0 ? (
                filteredAlerts.map((item) => (
                  <tr key={item.product_id}>
                    <td>{item.product_code}</td>
                    <td className="product-name-cell">{item.product_name}</td>
                    <td>{item.category_name}</td>
                    <td className="stock-quantity-cell highlight">
                      {item.stock_quantity}
                    </td>
                    <td>{item.unit_name || item.unit}</td>
                    <td>
                      <span className={`status-badge ${item.stock_quantity < 10 ? 'critical' : 'warning'}`}>
                        {item.stock_quantity < 10 ? 'Rất thấp' : 'Thấp'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="no-data">Không có cảnh báo tồn kho nào</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default StorekeeperAlerts;
