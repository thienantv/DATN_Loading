import React, { useState, useEffect } from 'react';
import { taskService, seasonService } from '../../services/api';
import '../../styles/dashboard.css';

export const ManagerTasks = () => {
  const [tasks, setTasks] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState(null);
  const [formData, setFormData] = useState({
    seasonId: '',
    taskTitle: '',
    description: '',
    assignedTo: '',
    dueDate: '',
  });

  useEffect(() => {
    fetchSeasons();
  }, []);

  useEffect(() => {
    if (selectedSeason) {
      fetchTasks();
    }
  }, [selectedSeason]);

  const fetchSeasons = async () => {
    try {
      const response = await seasonService.getAllSeasons();
      setSeasons(response.data.data || []);
      if (response.data.data?.length > 0) {
        setSelectedSeason(response.data.data[0].season_id);
        setFormData((prev) => ({ ...prev, seasonId: response.data.data[0].season_id }));
      }
      setLoading(false);
    } catch (err) {
      setError('Lỗi tải danh sách mùa vụ');
      setLoading(false);
    }
  };

  const fetchTasks = async () => {
    try {
      const response = await taskService.getAllTasks();
      setTasks(response.data.data || []);
    } catch (err) {
      setError('Lỗi tải danh sách công việc');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      await taskService.createTask({
        season_id: parseInt(formData.seasonId),
        task_title: formData.taskTitle,
        description: formData.description,
        assigned_to: parseInt(formData.assignedTo),
        due_date: formData.dueDate,
      });
      setSuccess('Tạo công việc thành công');
      setShowModal(false);
      fetchTasks();
    } catch (err) {
      setError('Lỗi tạo công việc');
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
        <h1>✓ Quản lý công việc</h1>
        <p>Tạo, giao việc và theo dõi tiến độ</p>
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

      <div className="table-container">
        <div className="table-header">
          <h2>Danh sách công việc</h2>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            ➕ Tạo công việc
          </button>
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
              {tasks.length > 0 ? (
                tasks
                  .filter((t) => t.season_id === selectedSeason)
                  .map((task) => (
                    <tr key={task.task_id}>
                      <td><strong>{task.task_title}</strong></td>
                      <td>{task.description}</td>
                      <td>{new Date(task.due_date).toLocaleDateString('vi-VN')}</td>
                      <td>
                        <span className={`status-badge ${task.status === 'COMPLETED' ? 'status-active' : 'status-pending'}`}>
                          {task.status === 'PENDING' && '⏳ Chờ làm'}
                          {task.status === 'IN_PROGRESS' && '🔄 Đang làm'}
                          {task.status === 'COMPLETED' && '✅ Hoàn thành'}
                        </span>
                      </td>
                      <td>
                        <button className="btn btn-sm btn-secondary">👁️</button>
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

      {showModal && (
        <div className="modal" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>➕ Tạo công việc mới</h2>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Tiêu đề</label>
                <input
                  type="text"
                  value={formData.taskTitle}
                  onChange={(e) =>
                    setFormData({ ...formData, taskTitle: e.target.value })
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label>Mô tả chi tiết</label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Giao cho (User ID)</label>
                  <input
                    type="number"
                    value={formData.assignedTo}
                    onChange={(e) =>
                      setFormData({ ...formData, assignedTo: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Hạn chót</label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) =>
                      setFormData({ ...formData, dueDate: e.target.value })
                    }
                    required
                  />
                </div>
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

export default ManagerTasks;
