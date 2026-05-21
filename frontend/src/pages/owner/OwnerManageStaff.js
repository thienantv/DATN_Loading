import React, { useEffect, useState } from 'react'
import { userService, adminService } from '../../services/api'
import { showToast } from '../../utils/toast'
import { useAuth } from '../../context/AuthContext'
import '../../styles/dashboard.css'
import '../../styles/admin/admin-users.css'
import '../../styles/admin-layout.css'

const ROLE_OPTIONS = [
  { value: 'MANAGER', label: 'Quản lý' },
  { value: 'TECHNICIAN', label: 'Kỹ thuật' },
  { value: 'WORKER', label: 'Công nhân' },
  { value: 'ACCOUNTANT', label: 'Kế toán' },
  { value: 'STOREKEEPER', label: 'Quản lý kho' },
]

const OwnerManageStaff = () => {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [pageSize, setPageSize] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [roleValue, setRoleValue] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createFormData, setCreateFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    phone: '',
    password: '',
    role: 'WORKER',
  })

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      // Get all users and filter by current owner's farm so Owner sees all accounts in their farm
      const response = await adminService.getAllUsers()
      const all = response.data.data || []
      const farmId = currentUser?.farm_id
      const filtered = farmId ? all.filter(u => String(u.farm_id || '') === String(farmId)) : []
      setUsers(filtered)
    } catch (err) {
      showToast({ title: 'Lỗi tải danh sách nhân viên', type: 'error' })
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const filteredUsers = users.filter((user) => {
    const normalizedSearch = searchTerm.trim().toLowerCase()
    const roleName = String(user.role || '').toUpperCase()

    const searchMatched =
      !normalizedSearch ||
      String(user.full_name || '').toLowerCase().includes(normalizedSearch) ||
      String(user.username || '').toLowerCase().includes(normalizedSearch) ||
      String(user.email || '').toLowerCase().includes(normalizedSearch) ||
      String(user.phone || '').toLowerCase().includes(normalizedSearch)

    const roleMatched = roleFilter === 'ALL' || roleName === roleFilter

    return searchMatched && roleMatched
  })

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize))
  const safePage = Math.min(currentPage, totalPages)
  const startIndex = (safePage - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, filteredUsers.length)
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex)

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const resetToFirstPage = () => {
    setCurrentPage(1)
  }

  const getAvatar = (fullName) => {
    const name = String(fullName || '').trim()
    if (!name) return 'U'
    const parts = name.split(/\s+/).filter(Boolean)
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
    return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase()
  }

  const getAvatarUrl = (user) => user?.avatar_url || user?.avatarUrl || ''

  const getRoleClassName = (role) => {
    switch (String(role || '').toUpperCase()) {
      case 'MANAGER':
        return 'admin-users_role admin-users_role--manager'
      case 'TECHNICIAN':
        return 'admin-users_role admin-users_role--technician'
      case 'WORKER':
        return 'admin-users_role admin-users_role--worker'
      case 'ACCOUNTANT':
        return 'admin-users_role admin-users_role--accountant'
      case 'STOREKEEPER':
        return 'admin-users_role admin-users_role--storekeeper'
      default:
        return 'admin-users_role'
    }
  }

  const handleOpenModal = (user) => {
    setSelectedUser(user)
    setRoleValue(String(user.role || 'WORKER').toUpperCase())
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setSelectedUser(null)
    setRoleValue('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedUser) return

    

    try {
      await userService.updateUserRoleByName(selectedUser.user_id, roleValue)
      showToast({ title: 'Cập nhật vai trò thành công', type: 'success' })
      handleCloseModal()
      await fetchUsers()
    } catch (err) {
      showToast({ title: err.response?.data?.message || 'Lỗi cập nhật vai trò', type: 'error' })
      console.error(err)
    }
  }

  const handleResetPassword = async (userId) => {
    if (!window.confirm('Bạn có chắc chắn muốn reset mật khẩu tài khoản này?')) {
      return
    }

    

    try {
      await userService.resetPassword(userId)
      showToast({ title: 'Reset mật khẩu thành công', type: 'success' })
      await fetchUsers()
    } catch (err) {
      showToast({ title: err.response?.data?.message || 'Lỗi reset mật khẩu', type: 'error' })
      console.error(err)
    }
  }

  const handleRemoveFromFarm = async (userId) => {
    if (!window.confirm('Bạn có chắc chắn muốn gỡ nhân viên này khỏi trại?')) {
      return
    }

    

    try {
      await userService.removeFromFarm(userId)
      showToast({ title: 'Đã gỡ nhân viên khỏi trại', type: 'success' })
      await fetchUsers()
    } catch (err) {
      showToast({ title: err.response?.data?.message || 'Lỗi gỡ nhân viên khỏi trại', type: 'error' })
      console.error(err)
    }
  }

  const getRoleLabel = (role) => {
    switch (String(role || '').toUpperCase()) {
      case 'MANAGER':
        return 'Quản lý'
      case 'TECHNICIAN':
        return 'Kỹ thuật'
      case 'WORKER':
        return 'Công nhân'
      case 'ACCOUNTANT':
        return 'Kế toán'
      case 'STOREKEEPER':
        return 'Quản lý kho'
      default:
        return 'Không xác định'
    }
  }

  const handleCreateChange = (e) => {
    const { name, value } = e.target
    setCreateFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleCreateSubmit = async (e) => {
    e.preventDefault()
    

    if (!createFormData.fullName || !createFormData.username || !createFormData.email || !createFormData.password) {
      showToast({ title: 'Vui lòng điền đầy đủ thông tin bắt buộc', type: 'error' })
      return
    }

    try {
      const validRoles = ['MANAGER', 'TECHNICIAN', 'WORKER', 'ACCOUNTANT', 'STOREKEEPER']
      if (!validRoles.includes(createFormData.role)) {
        showToast({ title: 'Vai trò không hợp lệ', type: 'error' })
        return
      }

      await adminService.createUser({
        fullName: createFormData.fullName,
        username: createFormData.username,
        email: createFormData.email,
        phone: createFormData.phone,
        password: createFormData.password,
        role: createFormData.role,
      })

      showToast({ title: 'Tạo nhân viên thành công', type: 'success' })
      setShowCreateModal(false)
      setCreateFormData({
        fullName: '',
        username: '',
        email: '',
        phone: '',
        password: '',
        role: 'WORKER',
      })
      await fetchUsers()
    } catch (err) {
      showToast({ title: err?.response?.data?.message || 'Lỗi tạo nhân viên', type: 'error' })
    }
  }

  const handleCloseCreateModal = () => {
    setShowCreateModal(false)
    setCreateFormData({
      fullName: '',
      username: '',
      email: '',
      phone: '',
      password: '',
      role: 'WORKER',
    })
  }

  if (loading) {
    return (
      <div className="dashboard">
        <div className="flex-center admin-users_loading-container">
          <div className="spinner" />
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard admin-page">
      {/* Messages are displayed via global toasts */}

      <div className="table-container admin-users_panel">
        <div className="table-header admin-users_table-header">
          <div>
            <h2>Quản lý nhân viên</h2>
            <p className="admin-users_subtitle">
              Hiển thị {filteredUsers.length === 0 ? 0 : startIndex + 1}-{endIndex} trên {filteredUsers.length} nhân viên
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            ＋ Thêm nhân viên mới
          </button>
        </div>

        <div className="admin-users_toolbar">
          <div className="admin-users_search-wrap">
            <span className="admin-users_search-icon">⌕</span>
            <input
              type="text"
              placeholder="Tìm nhân viên..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                resetToFirstPage()
              }}
            />
          </div>

          <select
            className="admin-users_filter-select"
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value)
              resetToFirstPage()
            }}
          >
            <option value="ALL">Tất cả vai trò</option>
            {ROLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="table-wrapper">
          <table className="admin-users_table">
            <thead>
              <tr>
                <th>Ảnh</th>
                <th>Họ tên</th>
                <th>Tên đăng nhập</th>
                <th>Email</th>
                <th>Số điện thoại</th>
                <th>Vai trò</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.length > 0 ? (
                paginatedUsers.map((user) => (
                  <tr key={user.user_id}>
                    <td>
                      <div className="admin-users_avatar">
                        {getAvatarUrl(user) ? (
                          <img src={getAvatarUrl(user)} alt={user.full_name || user.username || 'Avatar'} className="admin-users_avatar-image" />
                        ) : (
                          getAvatar(user.full_name)
                        )}
                      </div>
                    </td>
                    <td>{user.full_name}</td>
                    <td>{user.username}</td>
                    <td>{user.email}</td>
                    <td>{user.phone || '-'}</td>
                    <td>
                      <span className={getRoleClassName(user.role)}>{getRoleLabel(user.role)}</span>
                    </td>
                    <td>
                      <div className="admin-users_table-actions">
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => handleOpenModal(user)}
                          title="Chỉnh sửa vai trò"
                        >
                          ✎
                        </button>
                        <button
                          className="btn btn-sm btn-warning"
                          onClick={() => handleResetPassword(user.user_id)}
                          title="Reset mật khẩu"
                        >
                          ↺
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleRemoveFromFarm(user.user_id)}
                          title="Gỡ khỏi trại"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="admin-users_empty-row">
                    Không có nhân viên nào
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="admin-users_pagination">
          <div className="admin-users_pagination-left">
            <label htmlFor="pageSize">Số mục trên trang:</label>
            <select
              id="pageSize"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value))
                setCurrentPage(1)
              }}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <span>
              {filteredUsers.length === 0 ? 0 : startIndex + 1}-{endIndex} trên {filteredUsers.length}
            </span>
          </div>

          <div className="admin-users_pagination-right">
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={safePage <= 1}
            >
              ‹
            </button>
            <span className="admin-users_page-pill">{safePage}</span>
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={safePage >= totalPages}
            >
              ›
            </button>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="modal" onClick={handleCloseModal}>
          <div className="modal-content admin-users_modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="admin-users_modal-close"
              onClick={(e) => {
                e.stopPropagation()
                handleCloseModal()
              }}
              aria-label="Close"
            >
              ×
            </button>

            <h2 className="admin-users_modal-title">✏️ Chỉnh sửa vai trò</h2>
            <p className="admin-users_modal-subtitle">Thay đổi vai trò của nhân viên</p>

            <form className="admin-users_modal-form" onSubmit={handleSubmit}>
              <div className="admin-users_modal-grid">
                <div className="admin-users_form-column">
                  <div className="form-group">
                    <label>Tên nhân viên</label>
                    <input type="text" value={selectedUser?.full_name || ''} disabled />
                  </div>

                  <div className="form-group">
                    <label>Vai trò <span className="required">*</span></label>
                    <select name="role" value={roleValue} onChange={(e) => setRoleValue(e.target.value)} required>
                      {ROLE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

                <div className="admin-users_form-buttons admin-users_modal-buttons" style={{display:'flex',flexDirection:'column',gap:8,maxWidth:360}}>
                  <button type="submit" className="btn btn-primary" style={{order:0}}>
                    Lưu
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={handleCloseModal} style={{order:1}}>
                    Hủy
                  </button>
                </div>
            </form>
            </div>
        </div>
      )}

      {showCreateModal && (
        <div className="modal" onClick={handleCloseCreateModal}>
          <div className="modal-content admin-users_modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="admin-users_modal-close"
              onClick={(e) => {
                e.stopPropagation()
                handleCloseCreateModal()
              }}
              aria-label="Close"
            >
              ×
            </button>

            <h2 className="admin-users_modal-title">➕ Thêm nhân viên mới</h2>
            <p className="admin-users_modal-subtitle">Điền thông tin để tạo tài khoản mới</p>

            <form className="admin-users_modal-form" onSubmit={handleCreateSubmit}>
              <div className="admin-users_modal-grid">
                <div className="admin-users_form-column">
                  <div className="form-group">
                    <label>Họ và tên <span className="required">*</span></label>
                    <input
                      type="text"
                      name="fullName"
                      value={createFormData.fullName}
                      onChange={handleCreateChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Tên đăng nhập <span className="required">*</span></label>
                    <input
                      type="text"
                      name="username"
                      value={createFormData.username}
                      onChange={handleCreateChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Vai trò <span className="required">*</span></label>
                    <select name="role" value={createFormData.role} onChange={handleCreateChange} required>
                      {ROLE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="admin-users_form-column">
                  <div className="form-group">
                    <label>Email <span className="required">*</span></label>
                    <input
                      type="email"
                      name="email"
                      value={createFormData.email}
                      onChange={handleCreateChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Số điện thoại</label>
                    <input
                      type="tel"
                      name="phone"
                      value={createFormData.phone}
                      onChange={handleCreateChange}
                    />
                  </div>

                  <div className="form-group">
                    <label>Mật khẩu <span className="required">*</span></label>
                    <input
                      type="password"
                      name="password"
                      value={createFormData.password}
                      onChange={handleCreateChange}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="admin-users_form-buttons admin-users_modal-buttons">
                <button type="button" className="btn btn-secondary" onClick={handleCloseCreateModal}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary">
                  Tạo nhân viên
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default OwnerManageStaff
