import React, { useState, useEffect } from 'react'
import { adminService } from '../../services/api'
import '../../styles/dashboard.css'

export const OwnerUsers = () => {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
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
      setError(null)
    } catch (err) {
      setError('Lỗi tải danh sách nhân viên')
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
      // Only OWNER can create MANAGER, STOREKEEPER, TECHNICIAN, WORKER roles
      const validRoles = [4, 6, 3] // WORKER, STOREKEEPER, TECHNICIAN
      if (!validRoles.includes(Number(formData.roleId))) {
        setError('OWNER chỉ có thể tạo Nhân viên (WORKER), Quản tồn (STOREKEEPER), hoặc Kỹ thuật viên (TECHNICIAN)')
        return
      }

      const roleMap = {
        3: 'TECHNICIAN',
        4: 'WORKER',
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

  const getRoleLabel = (roleId) => {
    const roleMap = {
      1: 'ADMIN',
      2: 'MANAGER',
      3: 'TECHNICIAN',
      4: 'WORKER',
      5: 'ACCOUNTANT',
      6: 'STOREKEEPER',
      7: 'OWNER',
    }
    return roleMap[roleId] || 'Unknown'
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
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Quản lý nhân viên</h1>
          <p>Tổng số nhân viên: {users.length}</p>
        </div>
        <button onClick={handleOpenModal} className="btn btn-primary">
          ➕ Thêm nhân viên
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

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
                      {getRoleLabel(user.role_id)}
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
        <div
          className="modal-overlay"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            className="modal"
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '32px',
              maxWidth: '500px',
              width: '90%',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <h2 style={{ marginBottom: '24px' }}>Thêm nhân viên mới</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label htmlFor="fullName" style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                  Họ và tên *
                </label>
                <input
                  id="fullName"
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="Nhập họ và tên"
                  required
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              </div>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label htmlFor="username" style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                  Tên đăng nhập *
                </label>
                <input
                  id="username"
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="Nhập tên đăng nhập"
                  required
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              </div>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label htmlFor="email" style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                  Email *
                </label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Nhập email"
                  required
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              </div>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label htmlFor="phone" style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                  Điện thoại
                </label>
                <input
                  id="phone"
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Nhập số điện thoại"
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              </div>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label htmlFor="password" style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                  Mật khẩu *
                </label>
                <input
                  id="password"
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Nhập mật khẩu"
                  required
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              </div>
              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label htmlFor="roleId" style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                  Vai trò *
                </label>
                <select
                  id="roleId"
                  name="roleId"
                  value={formData.roleId}
                  onChange={handleChange}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                >
                  <option value={4}>Nhân viên (WORKER)</option>
                  <option value={3}>Kỹ thuật viên (TECHNICIAN)</option>
                  <option value={6}>Quản tồn (STOREKEEPER)</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
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
