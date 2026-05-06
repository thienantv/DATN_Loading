import React, { useState, useEffect, useMemo } from 'react';
import { taskService, seasonService, userService } from '../../services/api';
import '../../styles/dashboard.css';

export const ManagerTasks = () => {
  const [tasks, setTasks] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [formData, setFormData] = useState({
    seasonId: '',
    taskTitle: '',
    description: '',
    assignedTo: '',
    dueDate: '',
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedSeason) {
      fetchTasks();
    }
  }, [selectedSeason]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [seasonsRes, staffRes] = await Promise.all([
        seasonService.getAllSeasons(),
        userService.getStaff(),
      ]);
      const seasonData = seasonsRes.data.data || [];
      const staffData = staffRes.data.data || [];
      setSeasons(seasonData);
      setStaffList(staffData);
      if (seasonData?.length > 0) {
        setSelectedSeason(seasonData[0].season_id);
        setFormData((prev) => ({ ...prev, seasonId: seasonData[0].season_id }));
      }
      setLoading(false);
    } catch (err) {
      setError('Lỗi tải danh sách mùa vụ / nhân viên');
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

    if (!formData.seasonId || !formData.taskTitle || !formData.assignedTo || !formData.dueDate) {
      setError('Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }

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
      setError(err.response?.data?.message || 'Lỗi tạo công việc');
    }
  };

  const handleOpenDetail = async (taskId) => {
    try {
      setLoadingDetail(true);
      const response = await taskService.getTaskById(taskId);
      setSelectedTask(response.data.data || null);
      setShowDetailModal(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Lỗi tải chi tiết công việc');
    } finally {
      setLoadingDetail(false);
    }
  };

  const taskStats = useMemo(() => {
    const scopedTasks = tasks.filter((task) => String(task.season_id) === String(selectedSeason));
    return {
      total: scopedTasks.length,
      pending: scopedTasks.filter((task) => task.status === 'PENDING').length,
      inProgress: scopedTasks.filter((task) => task.status === 'IN_PROGRESS').length,
      completed: scopedTasks.filter((task) => task.status === 'COMPLETED').length,
    };
  }, [tasks, selectedSeason]);

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
          onChange={(e) => {
            const seasonId = parseInt(e.target.value);
            setSelectedSeason(seasonId);
            setFormData((prev) => ({ ...prev, seasonId }));
          }}
          style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #e5e7eb' }}
        >
          {seasons.map((season) => (
            <option key={season.season_id} value={season.season_id}>
              {season.season_name}
            </option>
          ))}
        </select>
      </div>

      <div className="stats-grid">
        <div className="stat-card"><div className="stat-icon" style={{ backgroundColor: '#dbeafe' }}>🧩</div><div className="stat-content"><p className="stat-label">Tổng task</p><p className="stat-value">{taskStats.total}</p></div></div>
        <div className="stat-card"><div className="stat-icon" style={{ backgroundColor: '#fef3c7' }}>⏳</div><div className="stat-content"><p className="stat-label">Chờ làm</p><p className="stat-value">{taskStats.pending}</p></div></div>
        <div className="stat-card"><div className="stat-icon" style={{ backgroundColor: '#dbeafe' }}>🔄</div><div className="stat-content"><p className="stat-label">Đang làm</p><p className="stat-value">{taskStats.inProgress}</p></div></div>
        <div className="stat-card"><div className="stat-icon" style={{ backgroundColor: '#dcfce7' }}>✅</div><div className="stat-content"><p className="stat-label">Hoàn thành</p><p className="stat-value">{taskStats.completed}</p></div></div>
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
                <th>Người giao</th>
                <th>Staff</th>
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
                      <td>{task.assigned_by_name || '--'}</td>
                      <td>{task.assigned_to_name || '--'}</td>
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
                        <button className="btn btn-sm btn-secondary" onClick={() => handleOpenDetail(task.task_id)}>👁️</button>
                      </td>
                    </tr>
                  ))
              ) : (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '20px' }}>
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
                  <label>Giao cho staff</label>
                  <select
                    value={formData.assignedTo}
                    onChange={(e) =>
                      setFormData({ ...formData, assignedTo: e.target.value })
                    }
                    required
                  >
                    <option value="">-- Chọn nhân viên --</option>
                    {staffList.map((staff) => (
                      <option key={staff.user_id} value={staff.user_id}>
                        {staff.full_name} ({staff.username})
                      </option>
                    ))}
                  </select>
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

      {showDetailModal && selectedTask && (
        <div className="modal" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>📋 Chi tiết công việc</h2>

            <div className="info-box" style={{ marginBottom: '16px' }}>
              <p><strong>Tiêu đề:</strong> {selectedTask.task_title}</p>
              <p><strong>Ao/Mùa vụ:</strong> {selectedTask.season_name || selectedTask.season_id || '--'}</p>
              <p><strong>Giao bởi:</strong> {selectedTask.assigned_by_name || '--'}</p>
              <p><strong>Giao cho:</strong> {selectedTask.assigned_to_name || '--'}</p>
              <p><strong>Hạn chót:</strong> {selectedTask.due_date ? new Date(selectedTask.due_date).toLocaleDateString('vi-VN') : '--'}</p>
              <p><strong>Trạng thái:</strong> {selectedTask.status}</p>
              <p><strong>Mô tả:</strong> {selectedTask.description || '--'}</p>
            </div>

            <div className="table-container">
              <div className="table-header">
                <h2>Ảnh hoàn thành</h2>
                {loadingDetail && <span>Đang tải...</span>}
              </div>
              <div className="table-wrapper">
                {selectedTask.images?.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
                    {selectedTask.images.map((image) => (
                      <a key={image.image_id} href={image.image_url} target="_blank" rel="noreferrer" className="info-box" style={{ textDecoration: 'none' }}>
                        <div style={{ fontSize: '12px', marginBottom: '8px' }}>{new Date(image.uploaded_at).toLocaleString('vi-VN')}</div>
                        <div style={{ wordBreak: 'break-all' }}>{image.image_url}</div>
                      </a>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: '12px 0' }}>Chưa có ảnh hoàn thành</div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowDetailModal(false)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerTasks;
