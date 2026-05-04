import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/api';
import '../../styles/dashboard.css';

export const AdminSystem = () => {
  const [stats, setStats] = useState(null);
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, backupsRes] = await Promise.all([
        adminService.getSystemStats(),
        adminService.getBackups(),
      ]);
      setStats(statsRes.data.data);
      setBackups(backupsRes.data.data || []);
    } catch (err) {
      setError('Lỗi tải dữ liệu hệ thống');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    try {
      setLoading(true);
      await adminService.createBackup();
      setSuccess('Tạo bản sao lưu thành công');
      fetchData();
    } catch (err) {
      setError('Lỗi tạo bản sao lưu');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (backupId) => {
    if (window.confirm('Bạn có chắc chắn muốn khôi phục dữ liệu từ bản sao lưu này?')) {
      try {
        setLoading(true);
        await adminService.restoreBackup(backupId);
        setSuccess('Khôi phục dữ liệu thành công');
        fetchData();
      } catch (err) {
        setError('Lỗi khôi phục dữ liệu');
      } finally {
        setLoading(false);
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
        <h1>⚙️ Quản lý hệ thống</h1>
        <p>Cài đặt và quản lý hệ thống</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Statistics */}
      <div className="stats-grid" style={{ marginBottom: '40px' }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#dbeafe' }}>
            👥
          </div>
          <div className="stat-content">
            <p className="stat-label">Người dùng</p>
            <p className="stat-value">{stats?.total_users || 0}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#dcfce7' }}>
            🏞️
          </div>
          <div className="stat-content">
            <p className="stat-label">Ao nuôi</p>
            <p className="stat-value">{stats?.total_ponds || 0}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#fef3c7' }}>
            💾
          </div>
          <div className="stat-content">
            <p className="stat-label">Bản sao lưu</p>
            <p className="stat-value">{backups.length}</p>
          </div>
        </div>
      </div>

      {/* Backup Section */}
      <div className="table-container" style={{ marginBottom: '30px' }}>
        <div className="table-header">
          <h2>💾 Sao lưu dữ liệu</h2>
          <button className="btn btn-primary" onClick={handleCreateBackup} disabled={loading}>
            ➕ Tạo bản sao lưu mới
          </button>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Ngày tạo</th>
                <th>Kích thước</th>
                <th>Trạng thái</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {backups.length > 0 ? (
                backups.map((backup, idx) => (
                  <tr key={idx}>
                    <td>{new Date(backup.created_at).toLocaleString('vi-VN')}</td>
                    <td>{backup.size ? (backup.size / 1024 / 1024).toFixed(2) + ' MB' : 'N/A'}</td>
                    <td>
                      <span className="status-badge status-active">✓ Sẵn sàng</span>
                    </td>
                    <td>
                      <button
                        className="btn btn-sm btn-success"
                        onClick={() => handleRestore(backup.id)}
                      >
                        🔄 Khôi phục
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>
                    Chưa có bản sao lưu nào
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* System Info */}
      <div className="table-container">
        <div className="table-header">
          <h2>📋 Thông tin hệ thống</h2>
        </div>

        <div style={{ padding: '20px' }}>
          <div style={{ marginBottom: '15px' }}>
            <strong>📌 Tính năng chính:</strong>
            <ul style={{ marginTop: '10px', paddingLeft: '20px' }}>
              <li>✅ Quản lý toàn bộ hệ thống và người dùng</li>
              <li>✅ Quản lý danh mục và dữ liệu master</li>
              <li>✅ Sao lưu và khôi phục dữ liệu</li>
              <li>✅ Xem lịch sử hoạt động (audit log)</li>
              <li>✅ Quản lý dữ liệu huấn luyện AI</li>
            </ul>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <strong>⚡ Giới hạn quyền hạn:</strong>
            <ul style={{ marginTop: '10px', paddingLeft: '20px' }}>
              <li>❌ Không nhập nhật ký canh tác</li>
              <li>❌ Không chỉnh sửa dữ liệu sản xuất</li>
              <li>❌ Không duyệt hoạt động vận hành</li>
            </ul>
          </div>

          <div>
            <strong>📊 Phiên bản:</strong>
            <p style={{ marginTop: '10px' }}>Smart Shrimp Farming System v1.0.0</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSystem;
