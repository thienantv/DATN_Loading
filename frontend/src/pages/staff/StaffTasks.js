import React, { useState, useEffect, useContext } from 'react';
import { taskService } from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import '../../styles/dashboard.css';

export const StaffTasks = () => {
  const { user } = useContext(AuthContext);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [filterStatus, setFilterStatus] = useState('ALL');

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await taskService.getAllTasks();
      // Filter tasks assigned to current user
      const userTasks = response.data.data?.filter(
        (task) => task.assigned_to === user?.user_id
      ) || [];
      setTasks(userTasks);
    } catch (err) {
      setError('Lỗi tải danh sách công việc');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (taskId, newStatus) => {
    try {
      await taskService.updateTaskStatus(taskId, newStatus);
      setSuccess('Cập nhật trạng thái thành công');
      fetchTasks();
    } catch (err) {
      setError('Lỗi cập nhật trạng thái');
    }
  };

  const filteredTasks = filterStatus === 'ALL' 
    ? tasks 
    : tasks.filter((t) => t.status === filterStatus);

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
        <h1>✓ Công việc của tôi</h1>
        <p>Xem và cập nhật tiến độ công việc được giao</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div style={{ marginBottom: '20px' }}>
        <label style={{ marginRight: '10px', fontWeight: 600 }}>Lọc theo trạng thái:</label>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #e5e7eb' }}
        >
          <option value="ALL">Tất cả</option>
          <option value="PENDING">⏳ Chờ làm</option>
          <option value="IN_PROGRESS">🔄 Đang làm</option>
          <option value="COMPLETED">✅ Hoàn thành</option>
        </select>
      </div>

      <div className="table-container">
        <div className="table-header">
          <h2>Danh sách công việc ({filteredTasks.length})</h2>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Tiêu đề</th>
                <th>Mô tả</th>
                <th>Hạn chót</th>
                <th>Trạng thái</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.length > 0 ? (
                filteredTasks.map((task) => (
                  <tr key={task.task_id}>
                    <td><strong>{task.task_title}</strong></td>
                    <td>{task.description}</td>
                    <td>{new Date(task.due_date).toLocaleDateString('vi-VN')}</td>
                    <td>
                      <span className={`status-badge ${task.status === 'COMPLETED' ? 'status-active' : task.status === 'IN_PROGRESS' ? 'status-warning' : 'status-pending'}`}>
                        {task.status === 'PENDING' && '⏳ Chờ làm'}
                        {task.status === 'IN_PROGRESS' && '🔄 Đang làm'}
                        {task.status === 'COMPLETED' && '✅ Hoàn thành'}
                      </span>
                    </td>
                    <td>
                      {task.status === 'PENDING' && (
                        <button 
                          className="btn btn-sm btn-warning"
                          onClick={() => handleUpdateStatus(task.task_id, 'IN_PROGRESS')}
                        >
                          🔄 Bắt đầu
                        </button>
                      )}
                      {task.status === 'IN_PROGRESS' && (
                        <button 
                          className="btn btn-sm btn-success"
                          onClick={() => handleUpdateStatus(task.task_id, 'COMPLETED')}
                        >
                          ✅ Hoàn thành
                        </button>
                      )}
                      {task.status === 'COMPLETED' && (
                        <span style={{ color: '#10b981' }}>Đã xong</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>
                    Chưa có công việc nào
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StaffTasks;
