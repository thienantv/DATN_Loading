import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/api';
import '../../styles/dashboard.css';

export const AdminBackup = () => {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [creatingBackup, setCreatingBackup] = useState(false);

  useEffect(() => {
    fetchBackups();
  }, []);

  const fetchBackups = async () => {
    try {
      setLoading(true);
      const res = await adminService.getBackups();
      setBackups(res.data.data || []);
    } catch (err) {
      setError('Lỗi tải danh sách backup');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    try {
      setCreatingBackup(true);
      const res = await adminService.createBackup();
      if (res.data.success) {
        setSuccess('Backup tạo thành công');
        fetchBackups();
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setError('Lỗi tạo backup');
      console.error(err);
    } finally {
      setCreatingBackup(false);
    }
  };

  const handleRestoreBackup = async (backupId) => {
    const confirmed = window.confirm(
      'Bạn chắc chắn muốn khôi phục từ backup này? Dữ liệu hiện tại sẽ bị ghi đè.'
    );
    if (!confirmed) return;

    try {
      const res = await adminService.restoreBackup(backupId);
      if (res.data.success) {
        setSuccess('Database khôi phục thành công');
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setError('Lỗi khôi phục backup');
      console.error(err);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading) return <div className="loading">⏳ Đang tải...</div>;

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h2>💾 Sao lưu và khôi phục</h2>
        <button
          className="btn-primary"
          onClick={handleCreateBackup}
          disabled={creatingBackup}
        >
          {creatingBackup ? '⏳ Đang tạo...' : '➕ Tạo backup mới'}
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="info-box">
        <p>
          ⚠️ <strong>Chú ý:</strong> Khi khôi phục từ backup, tất cả dữ liệu hiện tại sẽ bị
          thay thế bằng dữ liệu từ backup.
        </p>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Tên Backup</th>
              <th>Thời gian tạo</th>
              <th>Kích thước</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {backups.length > 0 ? (
              backups.map((backup) => (
                <tr key={backup.id}>
                  <td>{backup.name}</td>
                  <td>{new Date(backup.createdAt).toLocaleString('vi-VN')}</td>
                  <td>{formatFileSize(backup.size)}</td>
                  <td>
                    <button
                      className="btn-small btn-warning"
                      onClick={() => handleRestoreBackup(backup.id)}
                    >
                      🔄 Khôi phục
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="empty-cell">
                  Chưa có backup nào
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <style>{`
        .info-box {
          background-color: #fff3cd;
          border: 1px solid #ffc107;
          border-radius: 4px;
          padding: 12px;
          margin: 20px 0;
          color: #856404;
        }

        .btn-small {
          padding: 6px 12px;
          font-size: 12px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.3s;
        }

        .btn-warning {
          background-color: #ff9800;
          color: white;
        }

        .btn-warning:hover {
          background-color: #e68900;
        }
      `}</style>
    </div>
  );
};

export default AdminBackup;
