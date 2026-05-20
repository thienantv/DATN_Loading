import React, { useState, useEffect } from 'react'
import { adminService } from '../../services/api'
import { showToast } from '../../utils/toast'
import '../../styles/dashboard.css'
import '../../styles/manager/manager-common.css'
import '../../styles/owner/owner-common.css'

export const OwnerUsers = () => {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    phone: '',
    password: '',
    roleId: 4, // Default WORKER
  })

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await adminService.getAllUsers()
      setUsers(response.data.data || [])
    } catch (err) {
      showToast({ title: 'Lỗi tải danh sách nhân viên', type: 'error' })
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenModal = () => {
    setFormData({
      fullName: '',
      username: '',
      email: '',
      phone: '',
      password: '',
      roleId: 4, // WORKER
    })
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!formData.fullName || !formData.username || !formData.email || !formData.password) {
      setError('Vui lòng điền đầy đủ thông tin bắt buộc')
      return
    }

    try {
      // OWNER can create every role except ADMIN and OWNER
      const validRoles = [2, 3, 4, 5, 6] // MANAGER, TECHNICIAN, WORKER, ACCOUNTANT, STOREKEEPER
      if (!validRoles.includes(Number(formData.roleId))) {
        setError('OWNER chỉ có thể tạo role MANAGER, TECHNICIAN, WORKER, ACCOUNTANT hoặc STOREKEEPER')
        return
      }

      const roleMap = {
        2: 'MANAGER',
        3: 'TECHNICIAN',
        4: 'WORKER',
        5: 'ACCOUNTANT',
        6: 'STOREKEEPER',
      }
      const roleName = roleMap[formData.roleId] || 'WORKER'

      await adminService.createUser({
        fullName: formData.fullName,
        username: formData.username,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        role: roleName,
      })

      setSuccess('Tạo nhân viên thành công')
      setShowModal(false)
      await fetchUsers()
    } catch (err) {
      setError(err?.response?.data?.message || 'Lỗi tạo nhân viên')
    }
  }

  const getRoleLabel = (roleValue) => {
    const normalizedRole = String(roleValue || '').toUpperCase();

    if (normalizedRole) {
      switch (normalizedRole) {
        case 'ADMIN':
          return 'Admin';
        case 'OWNER':
          return 'Owner';
        case 'MANAGER':
          return 'Quản lý (Manager)';
        case 'TECHNICIAN':
          return 'Kỹ thuật (Technician)';
        case 'WORKER':
          return 'Công nhân (Worker)';
        case 'ACCOUNTANT':
          return 'Kế toán (Accountant)';
        case 'STOREKEEPER':
          return 'Quản lý kho (Storekeeper)';
        default:
          break;
      }
    }

    const roleMap = {
      1: 'ADMIN',
      2: 'MANAGER',
      3: 'TECHNICIAN',
      4: 'WORKER',
      5: 'ACCOUNTANT',
      6: 'STOREKEEPER',
      7: 'OWNER',
    }
    return roleMap[roleValue] || 'Không xác định'
  }

  if (loading) {
    return (
      <div className="owner-users owner-page">
        <div className="flex-center" style={{ height: '100vh' }}>
          <div className="spinner"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="owner-users owner-page">
      <div className="owner-page__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
        <div>
          <h1>Quản lý nhân viên</h1>
          <p>Tổng số nhân viên: {users.length}</p>
        </div>
        <button onClick={handleOpenModal} className="btn btn-primary">
          ➕ Thêm nhân viên
        </button>
      </div>

      {/* Messages are displayed via global toasts */}

      <div className="card">
        <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ddd' }}>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Họ và tên</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Tên đăng nhập</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Email</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Vai trò</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ padding: '32px', textAlign: 'center', color: '#999' }}>
                  Không có nhân viên nào. Hãy thêm nhân viên để bắt đầu!
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.user_id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '12px' }}>{user.full_name}</td>
                  <td style={{ padding: '12px' }}>{user.username}</td>
                  <td style={{ padding: '12px' }}>{user.email}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ backgroundColor: '#e3f2fd', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 500 }}>
                      {getRoleLabel(user.role || user.role_name || user.role_id)}
                    </span>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ color: user.status ? '#4caf50' : '#f44336', fontWeight: 500 }}>
                      {user.status ? '✓ Hoạt động' : '✗ Khóa'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal">
          <div className="modal-content owner-page__modal">
            <h2 className="owner-page__section-title">Thêm nhân viên mới</h2>
            <form onSubmit={handleSubmit}>
              <div className="owner-page__form-grid">
                <div className="owner-page__form-group">
                  <label htmlFor="fullName">Họ và tên *</label>
                  <input
                    id="fullName"
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder="Nhập họ và tên"
                    required
                  />
                </div>
                <div className="owner-page__form-group">
                  <label htmlFor="username">Tên đăng nhập *</label>
                  <input
                    id="username"
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    placeholder="Nhập tên đăng nhập"
                    required
                  />
                </div>
                <div className="owner-page__form-group">
                  <label htmlFor="email">Email *</label>
                  <input
                    id="email"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Nhập email"
                    required
                  />
                </div>
                <div className="owner-page__form-group">
                  <label htmlFor="phone">Điện thoại</label>
                  <input
                    id="phone"
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="Nhập số điện thoại"
                  />
                </div>
                <div className="owner-page__form-group owner-page__form-group--full">
                  <label htmlFor="password">Mật khẩu *</label>
                  <input
                    id="password"
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Nhập mật khẩu"
                    required
                  />
                </div>
                <div className="owner-page__form-group owner-page__form-group--full">
                  <label htmlFor="roleId">Vai trò *</label>
                  <select
                    id="roleId"
                    name="roleId"
                    value={formData.roleId}
                    onChange={handleChange}
                  >
                    <option value={2}>Quản lý (MANAGER)</option>
                    <option value={3}>Kỹ thuật viên (TECHNICIAN)</option>
                    <option value={4}>Nhân viên (WORKER)</option>
                    <option value={5}>Kế toán (ACCOUNTANT)</option>
                    <option value={6}>Quản tồn (STOREKEEPER)</option>
                  </select>
                </div>
              </div>

              <div className="owner-page__actions">
                <button type="button" onClick={handleCloseModal} className="btn btn-secondary">
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary">
                  Tạo mới
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default OwnerUsers
