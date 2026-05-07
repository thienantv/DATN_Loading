import React, { useEffect, useMemo, useState } from 'react'
import { cultivationLogService, pondService } from '../../services/api'
import '../../styles/dashboard.css'

const formatVietnameseDateTime = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(date)
}

const formatVietnameseDate = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(date)
}

const normalizeApprovalStatus = (log) => (log?.approval_status || log?.status || 'PENDING').toString().toUpperCase()

const ManagerCultivationLogs = () => {
  const [ponds, setPonds] = useState([])
  const [selectedPondId, setSelectedPondId] = useState('')
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingLogs, setLoadingLogs] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchPonds()
  }, [])

  useEffect(() => {
    if (!selectedPondId) {
      setLogs([])
      return
    }

    fetchLogs(selectedPondId)
  }, [selectedPondId])

  const fetchPonds = async () => {
    try {
      setLoading(true)
      const response = await pondService.getAllPonds()
      const pondList = response?.data?.data || []
      setPonds(pondList)
      if (pondList.length > 0) {
        setSelectedPondId(String(pondList[0].pond_id))
      }
      setError('')
    } catch (err) {
      setError(err?.response?.data?.message || 'Không tải được danh sách ao nuôi')
    } finally {
      setLoading(false)
    }
  }

  const fetchLogs = async (pondId) => {
    try {
      setLoadingLogs(true)
      const response = await cultivationLogService.getByPondId(pondId)
      setLogs(response?.data?.data || [])
      setError('')
    } catch (err) {
      setError(err?.response?.data?.message || 'Không tải được nhật ký xử lý')
      setLogs([])
    } finally {
      setLoadingLogs(false)
    }
  }

  const selectedPond = ponds.find((pond) => String(pond.pond_id) === String(selectedPondId))

  const summary = useMemo(() => {
    const total = logs.length
    const pending = logs.filter((log) => normalizeApprovalStatus(log) === 'PENDING').length
    const approved = logs.filter((log) => normalizeApprovalStatus(log) === 'APPROVED').length
    const rejected = logs.filter((log) => normalizeApprovalStatus(log) === 'REJECTED').length

    return { total, pending, approved, rejected }
  }, [logs])

  const getStatusLabel = (log) => {
    const status = normalizeApprovalStatus(log)
    if (status === 'APPROVED') return 'Đã duyệt'
    if (status === 'REJECTED') return 'Từ chối'
    return 'Chờ duyệt'
  }

  const getStatusClass = (log) => {
    const status = normalizeApprovalStatus(log)
    if (status === 'APPROVED') return 'status-active'
    if (status === 'REJECTED') return 'status-inactive'
    return 'status-pending'
  }

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="card">
          <div style={{ padding: '24px 0' }}>Đang tải danh sách ao nuôi...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h2>Nhật ký xử lý</h2>
          <p style={{ margin: 0, color: '#666' }}>Manager xem nhân viên đã làm gì trong ao nuôi qua các nhật ký canh tác.</p>
        </div>
        <div style={{ minWidth: 280 }}>
          <select
            className="input"
            value={selectedPondId}
            onChange={(e) => setSelectedPondId(e.target.value)}
          >
            <option value="">-- Chọn ao nuôi --</option>
            {ponds.map((pond) => (
              <option key={pond.pond_id} value={pond.pond_id}>
                {pond.pond_code} - {pond.pond_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16, marginBottom: 20 }}>
        <div className="card">
          <h3>Tổng nhật ký</h3>
          <p style={{ fontSize: 28, margin: '8px 0 0', fontWeight: 700 }}>{summary.total}</p>
        </div>
        <div className="card">
          <h3>Chờ duyệt</h3>
          <p style={{ fontSize: 28, margin: '8px 0 0', fontWeight: 700 }}>{summary.pending}</p>
        </div>
        <div className="card">
          <h3>Đã duyệt</h3>
          <p style={{ fontSize: 28, margin: '8px 0 0', fontWeight: 700 }}>{summary.approved}</p>
        </div>
        <div className="card">
          <h3>Từ chối</h3>
          <p style={{ fontSize: 28, margin: '8px 0 0', fontWeight: 700 }}>{summary.rejected}</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3>Thông tin ao đang xem</h3>
        <p style={{ margin: '8px 0 0', fontWeight: 700 }}>{selectedPond ? `${selectedPond.pond_code} - ${selectedPond.pond_name}` : 'Chưa chọn ao'}</p>
        <p style={{ margin: '4px 0 0', color: '#666' }}>{selectedPond ? `Mã ao: ${selectedPond.pond_code}` : '-'}</p>
      </div>

      <div className="card">
        <h3>Danh sách nhật ký xử lý</h3>
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Ngày xử lý</th>
                <th>Mùa vụ</th>
                <th>Nhân viên</th>
                <th>Đã làm gì</th>
                <th>Chi tiết</th>
                <th>Trạng thái</th>
                <th>Ghi lúc</th>
              </tr>
            </thead>
            <tbody>
              {loadingLogs ? (
                <tr>
                  <td colSpan="7">Đang tải...</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="7">Chưa có nhật ký xử lý nào</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.log_id}>
                    <td>{formatVietnameseDate(log.log_date)}</td>
                    <td>{log.season_name || `Mùa vụ #${log.season_id}`}</td>
                    <td>{log.created_by_name || log.created_by_username || `#${log.created_by || '-'}`}</td>
                    <td>{log.action_type || '-'}</td>
                    <td style={{ maxWidth: 420 }}>{log.description || '-'}</td>
                    <td>
                      <span className={`status-badge ${getStatusClass(log)}`}>
                        {getStatusLabel(log)}
                      </span>
                    </td>
                    <td>{formatVietnameseDateTime(log.created_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default ManagerCultivationLogs
