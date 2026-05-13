import React, { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { userService } from '../../services/api'
import '../../styles/dashboard.css'
import '../../styles/accountant/accountant-profile.css'

const AccountantProfile = () => {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setProfileLoading(true)
        const res = await userService.getCurrentUser()
        const currentUser = res?.data?.data || user || null
        setProfile(currentUser)
        if (currentUser) {
          setFormData({
            fullName: currentUser.full_name || '',
            email: currentUser.email || '',
            phone: currentUser.phone || '',
          })
        }
      } catch (err) {
        setProfile(user || null)
        if (user) {
          setFormData({
            fullName: user.full_name || '',
            email: user.email || '',
            phone: user.phone || '',
          })
        }
      } finally {
        setProfileLoading(false)
      }
    }

    loadProfile()
  }, [user])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setLoading(true)
      setError(null)

      const res = await userService.updateProfile({
        full_name: formData.fullName,
        email: formData.email,
        phone: formData.phone,
      })

      if (res.data.success) {
        setSuccess('Cập nhật hồ sơ thành công')
        setTimeout(() => setSuccess(null), 3000)
      }
    } catch (err) {
      setError('Lỗi cập nhật hồ sơ')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const account = profile || user || {}

  return (
    <div className="dashboard">
      <div className="accountant-profile__container">
        {error && (
          <div className="alert alert-error">
            {error}
            <button onClick={() => setError(null)} className="accountant-profile__alert-close">
              ×
            </button>
          </div>
        )}
        {success && (
          <div className="alert alert-success">
            {success}
            <button onClick={() => setSuccess(null)} className="accountant-profile__alert-close">
              ×
            </button>
          </div>
        )}

        <div className="accountant-profile__header">
          <h1>👤 Hồ sơ cá nhân</h1>
          <p>Quản lý thông tin tài khoản của bạn</p>
        </div>

        <div className="accountant-profile__content">
          <div className="accountant-profile__avatar-section">
            <div className="accountant-profile__avatar">
              {(account?.full_name || '?').charAt(0).toUpperCase()}
            </div>
            <div className="accountant-profile__role-info">
              <p className="accountant-profile__role-badge">Kế toán</p>
              <p className="accountant-profile__role-description">
                Theo dõi chi phí, ghi chép tài chính và quản lý danh mục chi phí
              </p>
            </div>
          </div>

          {profileLoading && (
            <div className="accountant-profile__loading">
              <div className="spinner"></div>
            </div>
          )}

          <div className="accountant-profile__summary-grid">
            <div className="accountant-profile__summary-card">
              <span className="accountant-profile__summary-label">Trạng thái</span>
              <strong
                className={
                  account?.status
                    ? 'accountant-profile__status-active'
                    : 'accountant-profile__status-inactive'
                }
              >
                {account?.status ? 'Đang hoạt động' : 'Đã khóa'}
              </strong>
            </div>
            <div className="accountant-profile__summary-card">
              <span className="accountant-profile__summary-label">Ngày tạo</span>
              <strong>
                {account?.created_at ? new Date(account.created_at).toLocaleDateString('vi-VN') : '-'}
              </strong>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="accountant-profile__form">
            <div className="accountant-profile__form-group">
              <label className="accountant-profile__form-label">Họ và tên *</label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                className="accountant-profile__form-input"
                required
              />
            </div>

            <div className="accountant-profile__form-group">
              <label className="accountant-profile__form-label">Email *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="accountant-profile__form-input"
                required
              />
            </div>

            <div className="accountant-profile__form-group">
              <label className="accountant-profile__form-label">Số điện thoại</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="accountant-profile__form-input"
                placeholder="Nhập số điện thoại"
              />
            </div>

            <div className="accountant-profile__note">
              Mọi thay đổi trên màn hình này sẽ cập nhật thông tin tài khoản của bạn trong hệ thống.
            </div>

            <div className="accountant-profile__form-actions">
              <button type="submit" className="accountant-profile__btn-submit" disabled={loading}>
                {loading ? '⏳ Đang lưu...' : '💾 Lưu thay đổi'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default AccountantProfile
