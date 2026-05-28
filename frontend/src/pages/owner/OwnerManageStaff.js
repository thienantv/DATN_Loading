import React, { useCallback, useEffect, useState } from 'react'
import { userService } from '../../services/api'
import { showToast } from '../../utils/toast'
import { useAuth } from '../../context/AuthContext'
import '../../styles/owner/owner-manage-staff.css'

const ROLE_OPTIONS = [
  { value: 'TECHNICIAN', label: 'Kỹ sư' },
  { value: 'WORKER', label: 'Nhân viên' },
]

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'Tất cả trạng thái' },
  { value: 'ACTIVE', label: 'Hoạt động' },
  { value: 'LOCKED', label: 'Bị khóa' },
]

const DEFAULT_PAGE_SIZE = 10

const normalizeRole = (role) => String(role || '').trim().toUpperCase()
const normalizeText = (value) => String(value || '').trim().toLowerCase()
const isActiveUser = (user) => Boolean(user?.status)

const formatDateTime = (value) => {
  if (!value) return '-'
  return new Date(value).toLocaleString('vi-VN')
}

const buildDefaultUsername = (role) => {
  const prefix = normalizeRole(role) === 'TECHNICIAN' ? 'tech' : 'worker'
  const suffix = Date.now().toString().slice(-5)
  return `${prefix}_${suffix}`
}

const getRoleLabel = (role) => {
  switch (normalizeRole(role)) {
    case 'TECHNICIAN':
      return 'Kỹ sư'
    case 'WORKER':
      return 'Nhân viên'
    default:
      return 'Không xác định'
  }
}

const getRoleClassName = (role) => {
  switch (normalizeRole(role)) {
    case 'TECHNICIAN':
      return 'table-role-badge table-role-badge--technician'
    case 'WORKER':
      return 'table-role-badge table-role-badge--worker'
    default:
      return 'table-role-badge'
  }
}

const getStatusLabel = (status) => (status ? 'Hoạt động' : 'Bị khóa')
const getStatusClassName = (status) => (status ? 'table-status-badge table-status-active' : 'table-status-badge table-status-inactive')

const OwnerManageStaff = () => {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showRoleModal, setShowRoleModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [roleValue, setRoleValue] = useState('TECHNICIAN')
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false)
  const [createFormData, setCreateFormData] = useState({
    username: '',
    password: '',
    passwordConfirm: '',
    role: 'TECHNICIAN',
  })
  const [createFieldErrors, setCreateFieldErrors] = useState({})
  const [createSubmitting, setCreateSubmitting] = useState(false)

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true)
      const response = await userService.getAllUsers()
      const all = response.data.data || []
      const farmId = currentUser?.farm_id
      const filtered = farmId ? all.filter((u) => String(u.farm_id || '') === String(farmId)) : []
      setUsers(filtered)
    } catch (err) {
      showToast({ title: 'Lỗi tải danh sách nhân viên', type: 'error' })
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [currentUser?.farm_id])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const managedUsers = users.filter((user) => {
    const currentUserId = String(currentUser?.user_id || '')
    const currentRole = normalizeRole(user.role)
    if (!currentUserId) return false
    if (String(user.user_id) === currentUserId) return false
    if (currentRole === 'OWNER') return false
    return ['TECHNICIAN', 'WORKER'].includes(currentRole)
  })

  const filteredUsers = managedUsers.filter((user) => {
    const normalizedSearch = normalizeText(searchTerm)
    const searchMatched =
      !normalizedSearch ||
      normalizeText(user.full_name).includes(normalizedSearch) ||
      normalizeText(user.username).includes(normalizedSearch)

    const roleMatched = roleFilter === 'ALL' || normalizeRole(user.role) === roleFilter
    const statusMatched =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && isActiveUser(user)) ||
      (statusFilter === 'LOCKED' && !isActiveUser(user))

    return searchMatched && roleMatched && statusMatched
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

  const resetToFirstPage = () => setCurrentPage(1)

  const clearCreateForm = () => {
    setCreateFormData({
      username: '',
      password: '',
      passwordConfirm: '',
      role: 'TECHNICIAN',
    })
    setCreateFieldErrors({})
    setShowPassword(false)
    setShowPasswordConfirm(false)
  }

  const handleOpenCreateModal = () => {
    clearCreateForm()
    setShowCreateModal(true)
  }

  const handleCloseCreateModal = () => {
    setShowCreateModal(false)
    clearCreateForm()
  }

  const handleOpenDetail = async (user) => {
    setSelectedUser(user)
    setShowDetailModal(true)

    try {
      const response = await userService.getUserById(user.user_id)
      const detailedUser = response?.data?.data
      if (detailedUser) {
        setSelectedUser(detailedUser)
      }
    } catch (err) {
      console.error(err)
      showToast({ title: 'Không tải được chi tiết người dùng', type: 'error' })
    }
  }

  const handleCloseDetail = () => {
    setSelectedUser(null)
    setShowDetailModal(false)
  }

  const handleOpenRoleModal = (user) => {
    setSelectedUser(user)
    const currentRole = normalizeRole(user.role)
    setRoleValue(currentRole === 'TECHNICIAN' ? 'TECHNICIAN' : 'WORKER')
    setShowRoleModal(true)
  }

  const handleCloseRoleModal = () => {
    setSelectedUser(null)
    setRoleValue('TECHNICIAN')
    setShowRoleModal(false)
  }

  const handleTogglePassword = () => setShowPassword((prev) => !prev)
  const handleTogglePasswordConfirm = () => setShowPasswordConfirm((prev) => !prev)

  const handleCreateChange = (e) => {
    const { name, value } = e.target
    setCreateFormData((prev) => {
      const next = { ...prev, [name]: value }
      if (name === 'role' && !prev.username) {
        next.username = buildDefaultUsername(value)
      }
      return next
    })
    setCreateFieldErrors((prev) => {
      if (!prev?.[name]) return prev
      const next = { ...prev }
      delete next[name]
      return next
    })
  }

  const validateCreateForm = () => {
    const errors = {}
    const username = String(createFormData.username || '').trim()
    const password = String(createFormData.password || '')
    const passwordConfirm = String(createFormData.passwordConfirm || '')

    // Required fields follow the requested order: username, password, confirm password, role.
    if (!username) errors.username = 'Vui lòng nhập tên tài khoản'
    else if (!/^[A-Za-z0-9_]{4,30}$/.test(username)) errors.username = 'Tên tài khoản phải có 4-30 ký tự và chỉ gồm chữ, số, _'

    if (!password) errors.password = 'Vui lòng nhập mật khẩu khởi tạo'
    else if (!/(?=.{8,})(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      errors.password = 'Mật khẩu phải có ít nhất 8 ký tự, gồm chữ hoa, chữ thường và số'
    }

    if (!passwordConfirm) errors.passwordConfirm = 'Vui lòng xác nhận mật khẩu'
    else if (passwordConfirm !== password) errors.passwordConfirm = 'Mật khẩu xác nhận không khớp'

    if (!ROLE_OPTIONS.some((option) => option.value === createFormData.role)) {
      errors.role = 'Vai trò không hợp lệ'
    }

    setCreateFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleCreateSubmit = async (e) => {
    e.preventDefault()
    if (!validateCreateForm()) {
      showToast({ title: 'Vui lòng kiểm tra lại dữ liệu nhập', type: 'error' })
      return
    }

    try {
      setCreateSubmitting(true)
      const payload = {
        username: createFormData.username,
        password: createFormData.password,
        role: createFormData.role,
      }

      // If owner left fullName empty, backend will assign a default by role.
      const response = await userService.createUser(payload)

      showToast({ title: response.data?.message || 'Tạo nhân viên thành công', type: 'success' })
      handleCloseCreateModal()
      await fetchUsers()
    } catch (err) {
      const backendErrors = err.response?.data?.errors
      if (backendErrors) {
        setCreateFieldErrors(backendErrors)
      }
      showToast({ title: err.response?.data?.message || 'Lỗi tạo nhân viên', type: 'error' })
    } finally {
      setCreateSubmitting(false)
    }
  }

  const handleUpdateRole = async (e) => {
    e.preventDefault()
    if (!selectedUser) return

    const nextRole = normalizeRole(roleValue)
    if (!ROLE_OPTIONS.some((option) => option.value === nextRole)) {
      showToast({ title: 'Vai trò không hợp lệ', type: 'error' })
      return
    }

    if (!window.confirm(`Bạn có chắc muốn đổi vai trò của ${selectedUser.full_name || selectedUser.username} sang ${getRoleLabel(nextRole)}?`)) {
      return
    }

    try {
      await userService.updateUserRoleByName(selectedUser.user_id, nextRole)
      showToast({ title: 'Cập nhật vai trò thành công', type: 'success' })
      handleCloseRoleModal()
      await fetchUsers()
    } catch (err) {
      showToast({ title: err.response?.data?.message || 'Lỗi cập nhật vai trò', type: 'error' })
      console.error(err)
    }
  }

  const handleResetPassword = async (user) => {
    if (!window.confirm(`Bạn có chắc muốn reset mật khẩu cho tài khoản ${user.username}?`)) {
      return
    }

    try {
      const response = await userService.resetPassword(user.user_id)
      const tempPassword = response?.data?.tempPassword || response?.data?.data?.tempPassword
      showToast({
        title: tempPassword ? `Đã reset mật khẩu. Mật khẩu mới: ${tempPassword}` : 'Reset mật khẩu thành công',
        type: 'success',
      })
      await fetchUsers()
    } catch (err) {
      showToast({ title: err.response?.data?.message || 'Lỗi reset mật khẩu', type: 'error' })
      console.error(err)
    }
  }

  const handleToggleLock = async (user) => {
    const lockMode = isActiveUser(user)
    const confirmMessage = lockMode
      ? `Bạn có chắc muốn khóa tài khoản ${user.username}?`
      : `Bạn có chắc muốn mở khóa tài khoản ${user.username}?`

    if (!window.confirm(confirmMessage)) {
      return
    }

    try {
      if (lockMode) {
        await userService.lockUser(user.user_id)
        showToast({ title: 'Đã khóa tài khoản', type: 'success' })
      } else {
        await userService.unlockUser(user.user_id)
        showToast({ title: 'Đã mở khóa tài khoản', type: 'success' })
      }
      await fetchUsers()
    } catch (err) {
      showToast({ title: err.response?.data?.message || 'Lỗi cập nhật trạng thái tài khoản', type: 'error' })
      console.error(err)
    }
  }

  if (loading) {
    return (
      <div className="dashboard">
        <div className="flex-center table-loading-container">
          <div className="spinner" />
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard admin-page">
      <div className="table-container table-panel">
        <div className="table-header table-header">
          <div>
            <h2>Quản lý nhân viên</h2>
            <p className="table-subtitle">
              {filteredUsers.length === 0 ? 'Không có nhân viên nào trong trại của bạn' : `Hiển thị ${startIndex + 1}-${endIndex} trên ${filteredUsers.length} nhân viên`}
            </p>
          </div>
          <button type="button" className="btn btn-primary" onClick={handleOpenCreateModal}>
            ＋ Thêm nhân viên
          </button>
        </div>

        <div className="table-toolbar">
          <div className="table-search">
            <span className="table-search-icon">⌕</span>
            <input
              type="text"
              placeholder="Tìm theo tên hoặc tài khoản..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                resetToFirstPage()
              }}
            />
          </div>

          <select
            className="table-filter"
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

          <select
            className="table-filter"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              resetToFirstPage()
            }}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="table-wrapper">
          <table className="table-base">
            <thead>
                <tr>
                  <th>Tên người dùng</th>
                  <th>Tài khoản</th>
                  <th>Vai trò</th>
                  <th>Trạng thái</th>
                  <th>Hành động</th>
                </tr>
            </thead>
            <tbody>
              {paginatedUsers.length > 0 ? (
                paginatedUsers.map((user) => (
                  <tr key={user.user_id}>
                    <td>{user.full_name || '-'}</td>
                    <td>{user.username || '-'}</td>
                    <td>
                      <span className={getRoleClassName(user.role)}>{getRoleLabel(user.role)}</span>
                    </td>
                    <td>
                      <span className={getStatusClassName(user.status)}>{getStatusLabel(user.status)}</span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button className="table-action-btn table-action-btn--view" type="button" title="Xem chi tiết" onClick={() => handleOpenDetail(user)}>
                          👁
                        </button>
                        <button className="table-action-btn table-action-btn--role" type="button" title="Thay đổi vai trò" onClick={() => handleOpenRoleModal(user)}>
                          ✎
                        </button>
                        <button className="table-action-btn table-action-btn--reset" type="button" title="Reset mật khẩu" onClick={() => handleResetPassword(user)}>
                          ↺
                        </button>
                        <button
                          className={`table-action-btn ${isActiveUser(user) ? 'table-action-btn--lock' : 'table-action-btn--unlock'}`}
                          type="button"
                          title={isActiveUser(user) ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
                          onClick={() => handleToggleLock(user)}
                        >
                          {isActiveUser(user) ? '🔒' : '🔓'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="table-empty-row">
                    Không tìm thấy nhân viên phù hợp
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="table-pagination">
          <div className="table-pagination-left">
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

          <div className="table-pagination-right">
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={safePage <= 1}
            >
              ‹
            </button>
            <span className="table-page-pill">{safePage}</span>
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

      {showDetailModal && selectedUser && (
        <div className="modal" onClick={handleCloseDetail}>
          <div className="modal-content admin-users_modal admin-users_modal--detail" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="admin-users_modal-close" onClick={handleCloseDetail} aria-label="Close">
              ×
            </button>
            <h2 className="admin-users_modal-title">Thông tin tài khoản</h2>
            <p className="admin-users_modal-subtitle">Chỉ xem chi tiết, không thay đổi dữ liệu</p>

            <div className="admin-users_detail-grid">
              <div className="admin-users_detail-card">
                <span className="admin-users_detail-label">Tên tài khoản</span>
                <strong>{selectedUser.username || '-'}</strong>
              </div>
              <div className="admin-users_detail-card">
                <span className="admin-users_detail-label">Họ và tên</span>
                <strong>{selectedUser.full_name || '-'}</strong>
              </div>
              <div className="admin-users_detail-card">
                <span className="admin-users_detail-label">Email</span>
                <strong>{selectedUser.email || '-'}</strong>
              </div>
              <div className="admin-users_detail-card">
                <span className="admin-users_detail-label">Số điện thoại</span>
                <strong>{selectedUser.phone || '-'}</strong>
              </div>
              <div className="admin-users_detail-card">
                <span className="admin-users_detail-label">Vai trò</span>
                <strong>{getRoleLabel(selectedUser.role)}</strong>
              </div>
              <div className="admin-users_detail-card">
                <span className="admin-users_detail-label">Trạng thái</span>
                <strong>{getStatusLabel(selectedUser.status)}</strong>
              </div>
              <div className="admin-users_detail-card">
                <span className="admin-users_detail-label">Ngày tạo</span>
                <strong>{formatDateTime(selectedUser.created_at)}</strong>
              </div>
              <div className="admin-users_detail-card">
                <span className="admin-users_detail-label">Cập nhật gần nhất</span>
                <strong>{formatDateTime(selectedUser.updated_at || selectedUser.created_at)}</strong>
              </div>
              <div className="admin-users_detail-card admin-users_detail-card--full">
                <span className="admin-users_detail-label">Trại nuôi</span>
                <strong>{selectedUser.farm_name || '-'}</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {showRoleModal && selectedUser && (
        <div className="modal" onClick={handleCloseRoleModal}>
          <div className="modal-content admin-users_modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="admin-users_modal-close" onClick={handleCloseRoleModal} aria-label="Close">
              ×
            </button>
            <h2 className="admin-users_modal-title">Thay đổi vai trò</h2>
            <p className="admin-users_modal-subtitle">Chỉ cho phép chuyển giữa Kỹ sư và Nhân viên</p>

            <form className="admin-users_modal-form" onSubmit={handleUpdateRole}>
              <div className="admin-users_modal-grid">
                <div className="admin-users_form-column">
                  <div className="form-group">
                    <label>Tên tài khoản</label>
                    <input type="text" value={selectedUser.username || ''} disabled />
                  </div>
                </div>
                <div className="admin-users_form-column">
                  <div className="form-group">
                    <label>Trạng thái hiện tại</label>
                    <input type="text" value={getStatusLabel(selectedUser.status)} disabled />
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>Vai trò mới <span className="required">*</span></label>
                <select value={roleValue} onChange={(e) => setRoleValue(e.target.value)} required>
                  {ROLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="admin-users_form-buttons admin-users_modal-buttons">
                <button type="button" className="btn btn-secondary" onClick={handleCloseRoleModal}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary">
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="modal" onClick={handleCloseCreateModal}>
          <div className="modal-content admin-users_modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="admin-users_modal-close" onClick={handleCloseCreateModal} aria-label="Close">
              ×
            </button>
            <h2 className="admin-users_modal-title">Thêm nhân viên</h2>
            <p className="admin-users_modal-subtitle">Tạo tài khoản Technician hoặc Worker cho trại của bạn. Trường họ tên, email và số điện thoại sẽ được cập nhật sau khi đăng nhập lần đầu.</p>

            <form className="admin-users_modal-form" onSubmit={handleCreateSubmit}>
              <div className="admin-users_modal-grid">
                <div className="admin-users_form-column">
                  <div className="form-group">
                    <label>Tên tài khoản <span className="required">*</span></label>
                    <input type="text" name="username" value={createFormData.username} onChange={handleCreateChange} />
                    {createFieldErrors.username && <div className="field-error">{createFieldErrors.username}</div>}
                  </div>

                  <div className="form-group">
                    <label>Mật khẩu khởi tạo <span className="required">*</span></label>
                    <div className="admin-users_password-wrap">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={createFormData.password}
                        onChange={handleCreateChange}
                      />
                      <button type="button" className="admin-users_password-toggle" onClick={handleTogglePassword} tabIndex="-1">
                        {showPassword ? '👁️‍🗨️' : '👁️'}
                      </button>
                    </div>
                    {createFieldErrors.password && <div className="field-error">{createFieldErrors.password}</div>}
                  </div>
                </div>

                <div className="admin-users_form-column">
                  <div className="form-group">
                    <label>Xác nhận mật khẩu <span className="required">*</span></label>
                    <div className="admin-users_password-wrap">
                      <input
                        type={showPasswordConfirm ? 'text' : 'password'}
                        name="passwordConfirm"
                        value={createFormData.passwordConfirm}
                        onChange={handleCreateChange}
                      />
                      <button type="button" className="admin-users_password-toggle" onClick={handleTogglePasswordConfirm} tabIndex="-1">
                        {showPasswordConfirm ? '👁️‍🗨️' : '👁️'}
                      </button>
                    </div>
                    {createFieldErrors.passwordConfirm && <div className="field-error">{createFieldErrors.passwordConfirm}</div>}
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
                    {createFieldErrors.role && <div className="field-error">{createFieldErrors.role}</div>}
                  </div>
                </div>
              </div>

              <div className="admin-users_form-buttons admin-users_modal-buttons">
                <button type="button" className="btn btn-secondary" onClick={handleCloseCreateModal}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary" disabled={createSubmitting}>
                  {createSubmitting ? 'Đang tạo...' : 'Tạo nhân viên'}
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

