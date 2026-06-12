import React, { useState, useEffect } from 'react';
import { userService } from '../../services/api';
import { showToast } from '../../utils/toast';

export const OwnerUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // States cho Form tạo nhân viên
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '', username: '', email: '', phone: '', password: '', roleId: 4,
  });

  // States cho Modal Phân công công nhân
  const [showWorkerAssignmentModal, setShowWorkerAssignmentModal] = useState(false);
  const [workerAssignment, setWorkerAssignment] = useState({ workers: [], technicians: [], assignments: [] });
  const [busyAssignmentKey, setBusyAssignmentKey] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await userService.getAllUsers();
      setUsers(response.data.data || []);
    } catch (err) {
      showToast({ title: 'Lỗi tải danh sách nhân viên', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // =========================================================================
  // LOGIC: THÊM NHÂN VIÊN
  // =========================================================================
  const handleOpenModal = () => {
    setFormData({ fullName: '', username: '', email: '', phone: '', password: '', roleId: 4 });
    setShowModal(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.fullName || !formData.username || !formData.email || !formData.password) {
      return showToast({ title: 'Vui lòng điền đầy đủ thông tin bắt buộc', type: 'warning' });
    }

    try {
      const validRoles = [3, 4, 5, 6];
      if (!validRoles.includes(Number(formData.roleId))) {
        return showToast({ title: 'Chỉ có thể tạo role Kỹ thuật, Công nhân, Kế toán, Quản kho', type: 'error' });
      }

      const roleMap = { 3: 'TECHNICIAN', 4: 'WORKER', 5: 'ACCOUNTANT', 6: 'STOREKEEPER' };
      
      await userService.createUser({
        fullName: formData.fullName,
        username: formData.username,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        role: roleMap[formData.roleId] || 'WORKER',
      });

      showToast({ title: 'Tạo nhân viên thành công', type: 'success' });
      setShowModal(false);
      await fetchUsers();
    } catch (err) {
      showToast({ title: err?.response?.data?.message || 'Lỗi tạo nhân viên', type: 'error' });
    }
  };

  // =========================================================================
  // LOGIC: PHÂN CÔNG CÔNG NHÂN (Chuyển từ OwnerPonds sang)
  // =========================================================================
  const openWorkerAssignmentModal = async () => {
    try {
      setShowWorkerAssignmentModal(true);
      const res = await userService.getTechnicianWorkerMatrix();
      const data = res?.data?.data || {};
      setWorkerAssignment({
        workers: data.workers || [],
        technicians: data.technicians || [],
        assignments: data.assignments || [],
      });
    } catch (err) {
      showToast({ title: err?.response?.data?.message || 'Không tải được dữ liệu phân công', type: 'error' });
      setShowWorkerAssignmentModal(false);
    }
  };

  const handleWorkerAssignmentChange = async (technicianId, workerId, checked) => {
    try {
      setBusyAssignmentKey(`${technicianId}:${workerId}`);

      const currentWorkerIds = (workerAssignment.assignments || [])
        .filter((a) => String(a.technician_id) === String(technicianId))
        .map((a) => Number(a.worker_id));

      let nextWorkerIds;
      if (checked) {
        if (!currentWorkerIds.includes(Number(workerId))) nextWorkerIds = [...currentWorkerIds, Number(workerId)];
        else nextWorkerIds = currentWorkerIds;
      } else {
        nextWorkerIds = currentWorkerIds.filter((id) => Number(id) !== Number(workerId));
      }

      await userService.updateTechnicianWorkerAssignment(technicianId, { workerIds: nextWorkerIds });

      const res = await userService.getTechnicianWorkerMatrix();
      const data = res?.data?.data || {};
      setWorkerAssignment({
        workers: data.workers || [],
        technicians: data.technicians || [],
        assignments: data.assignments || [],
      });

      showToast({ title: 'Cập nhật phân công thành công', type: 'success' });
    } catch (err) {
      showToast({ title: err?.response?.data?.message || 'Không thể cập nhật phân công', type: 'error' });
    } finally {
      setBusyAssignmentKey('');
    }
  };

  // =========================================================================
  // RENDER UI
  // =========================================================================
  const getRoleLabel = (roleValue) => {
    const normalizedRole = String(roleValue || '').toUpperCase();
    const roleMap = {
      'OWNER': { text: 'Chủ trại', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
      'TECHNICIAN': { text: 'Kỹ sư', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
      'WORKER': { text: 'Công nhân', color: 'bg-blue-100 text-blue-700 border-blue-200' },
      'ACCOUNTANT': { text: 'Kế toán', color: 'bg-amber-100 text-amber-700 border-amber-200' },
      'STOREKEEPER': { text: 'Quản kho', color: 'bg-purple-100 text-purple-700 border-purple-200' },
    };
    return roleMap[normalizedRole] || { text: 'Chưa xác định', color: 'bg-slate-100 text-slate-600' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto animate-in fade-in duration-300">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 m-0 tracking-tight">Quản lý nhân sự</h1>
          <p className="text-slate-500 font-medium mt-1">Tổng số nhân sự hệ thống: {users.length} người</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button 
            onClick={openWorkerAssignmentModal} 
            className="flex-1 sm:flex-none px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-all shadow-sm flex items-center justify-center gap-2"
          >
            <span className="text-lg">📋</span> Phân công
          </button>
          <button 
            onClick={handleOpenModal} 
            className="flex-1 sm:flex-none px-4 py-2.5 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-all shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2"
          >
            <span>➕</span> Thêm mới
          </button>
        </div>
      </div>

      {/* DANH SÁCH NHÂN VIÊN */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-sm font-bold text-slate-600">Họ và tên</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-600">Thông tin liên hệ</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-600">Vai trò</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-600 text-center">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.length === 0 ? (
                <tr>
                  <td colSpan="4" className="p-10 text-center text-slate-500 font-medium">
                    Không có nhân viên nào. Hãy thêm nhân viên để bắt đầu!
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const roleStyle = getRoleLabel(u.role || u.role_name || u.role_id);
                  return (
                    <tr key={u.user_id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold shrink-0">
                            {u.full_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <strong className="text-slate-800 block text-base">{u.full_name}</strong>
                            <span className="text-sm text-slate-500">@{u.username}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-700 font-medium">{u.email || '-'}</div>
                        <div className="text-sm text-slate-500">{u.phone || '-'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2.5 py-1 text-xs font-bold rounded-lg border ${roleStyle.color}`}>
                          {roleStyle.text}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${u.status ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${u.status ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                          {u.status ? 'Hoạt động' : 'Đã khóa'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL THÊM NHÂN VIÊN */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white max-w-lg w-full p-6 rounded-2xl shadow-xl animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-extrabold text-slate-800">Thêm nhân viên mới</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 text-2xl font-bold">&times;</button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-bold text-slate-700">Họ và tên <span className="text-rose-500">*</span></label>
                  <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} required className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500 transition-all" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-bold text-slate-700">Tên đăng nhập <span className="text-rose-500">*</span></label>
                  <input type="text" name="username" value={formData.username} onChange={handleChange} required className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500 transition-all" />
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-bold text-slate-700">Email <span className="text-rose-500">*</span></label>
                  <input type="email" name="email" value={formData.email} onChange={handleChange} required className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500 transition-all" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-bold text-slate-700">Số điện thoại</label>
                  <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500 transition-all" />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-bold text-slate-700">Mật khẩu <span className="text-rose-500">*</span></label>
                <input type="password" name="password" value={formData.password} onChange={handleChange} required className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500 transition-all" />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-bold text-slate-700">Vai trò phân quyền <span className="text-rose-500">*</span></label>
                <select name="roleId" value={formData.roleId} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500 transition-all bg-white">
                  <option value={3}>Kỹ sư thủy sản (TECHNICIAN)</option>
                  <option value={4}>Công nhân thực địa (WORKER)</option>
                  <option value={5}>Kế toán (ACCOUNTANT)</option>
                  <option value={6}>Quản kho (STOREKEEPER)</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors">Hủy bỏ</button>
                <button type="submit" className="px-5 py-2.5 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-all shadow-md shadow-emerald-500/20 active:scale-95">Tạo tài khoản</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PHÂN CÔNG CÔNG NHÂN (Từ OwnerPonds chuyển sang) */}
      {showWorkerAssignmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" onClick={() => setShowWorkerAssignmentModal(false)}>
          <div className="bg-white max-w-5xl w-full p-6 rounded-2xl shadow-xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6 shrink-0">
              <div>
                 <h2 className="text-xl font-extrabold text-slate-800">Phân công Công nhân theo Kỹ sư</h2>
                 <p className="text-sm text-slate-500 font-medium mt-1">Đánh dấu check để chỉ định công nhân chịu sự quản lý của kỹ sư tương ứng</p>
              </div>
              <button onClick={() => setShowWorkerAssignmentModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 hover:bg-slate-200 font-bold transition-colors">&times;</button>
            </div>

            <div className="flex-1 overflow-auto border border-slate-200 rounded-xl bg-slate-50/50">
              <table className="w-full text-left border-collapse min-w-[700px] bg-white">
                <thead className="sticky top-0 z-10 bg-slate-50 shadow-sm outline outline-1 outline-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-sm font-bold text-slate-600">Công nhân thực địa</th>
                    {(workerAssignment.technicians || []).map((tech) => (
                      <th key={`tech-head-${tech.user_id}`} className="px-4 py-4 text-sm font-bold text-slate-600 text-center">
                        <div className="flex flex-col items-center">
                          <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] uppercase mb-1">Kỹ sư</span>
                          <span>{tech.full_name || tech.username}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(workerAssignment.workers || []).length === 0 ? (
                    <tr>
                      <td colSpan={Math.max(1, (workerAssignment.technicians || []).length + 1)} className="p-10 text-center text-slate-500 font-medium">
                        Hệ thống chưa có công nhân nào.
                      </td>
                    </tr>
                  ) : (
                    (workerAssignment.workers || []).map((worker) => (
                      <tr key={`worker-${worker.user_id}`} className="hover:bg-slate-50/80 transition-colors group">
                        <td className="px-6 py-3">
                          <strong className="block text-slate-800">{worker.full_name || worker.username}</strong>
                          <span className="text-xs text-slate-400 font-medium">@{worker.username}</span>
                        </td>
                        {(workerAssignment.technicians || []).map((tech) => {
                          const assigned = (workerAssignment.assignments || []).some(
                            (a) => String(a.technician_id) === String(tech.user_id) && String(a.worker_id) === String(worker.user_id)
                          );
                          return (
                            <td key={`worker-${worker.user_id}-tech-${tech.user_id}`} className="text-center px-4 py-3">
                              <label className="inline-flex items-center justify-center p-2 cursor-pointer rounded-lg hover:bg-slate-100 transition-colors">
                                <input
                                  type="checkbox"
                                  className="w-5 h-5 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500 cursor-pointer disabled:opacity-50"
                                  checked={assigned}
                                  disabled={Boolean(busyAssignmentKey)}
                                  onChange={(e) => handleWorkerAssignmentChange(tech.user_id, worker.user_id, e.target.checked)}
                                />
                              </label>
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end mt-6 pt-4 border-t border-slate-100 shrink-0">
              <button type="button" className="px-6 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors" onClick={() => setShowWorkerAssignmentModal(false)}>
                Đóng lại
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OwnerUsers;