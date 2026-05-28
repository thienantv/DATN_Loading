import React from 'react'

/**
 * Hệ thống đánh giá thống nhất cho tất cả card
 * cao (Excellent) - xanh
 * bình thường (Normal) - xám/trung tính
 * thấp (Low) - vàng/cảnh báo
 * cảnh báo (Alert/Critical) - đỏ
 */

export const getRatingConfig = (rating) => {
  const configs = {
    cao: {
      label: '👍 Cao',
      className: 'rating-cao',
      color: '#10b981', // green
      bgColor: '#d1fae5',
      borderColor: '#6ee7b7',
    },
    binh_thuong: {
      label: '➖ Bình thường',
      className: 'rating-binh-thuong',
      color: '#6b7280', // gray
      bgColor: '#f3f4f6',
      borderColor: '#d1d5db',
    },
    thap: {
      label: '⚠️ Thấp',
      className: 'rating-thap',
      color: '#f59e0b', // amber
      bgColor: '#fef3c7',
      borderColor: '#fcd34d',
    },
    canh_bao: {
      label: '🔴 Cảnh báo',
      className: 'rating-canh-bao',
      color: '#ef4444', // red
      bgColor: '#fee2e2',
      borderColor: '#fca5a5',
    },
  }
  return configs[rating] || configs.binh_thuong
}

/**
 * Đánh giá dữ liệu dựa trên metric
 * @param {string} metric - loại metric (tasks, ponds, notifications, completion, alerts)
 * @param {number} current - giá trị hiện tại
 * @param {number} total - giá trị tối đa (nếu cần)
 * @returns {string} rating key (cao, binh_thuong, thap, canh_bao)
 */
export const evaluateMetric = (metric, current, total = 0) => {
  switch (metric) {
    // Tasks: cao nếu < 3, thấp nếu >= 5, cảnh báo nếu >= 10
    case 'tasks':
      if (current <= 2) return 'cao'
      if (current >= 10) return 'canh_bao'
      if (current >= 5) return 'thap'
      return 'binh_thuong'

    // Ponds: cao nếu > 3, thấp nếu <= 1
    case 'ponds':
      if (current >= 4) return 'cao'
      if (current === 1) return 'thap'
      return 'binh_thuong'

    // Notifications: cao nếu 0, thấp nếu 1-2, cảnh báo nếu >= 3
    case 'notifications':
      if (current === 0) return 'cao'
      if (current >= 3) return 'canh_bao'
      return 'thap'

    // Completion rate: cao nếu > 80%, bình thường 50-80%, thấp < 50%
    case 'completion':
      if (current >= 80) return 'cao'
      if (current >= 50) return 'binh_thuong'
      return 'thap'

    // Alerts/Overdue: cao nếu 0, cảnh báo nếu >= 1
    case 'alerts':
      if (current === 0) return 'cao'
      if (current >= 3) return 'canh_bao'
      if (current >= 1) return 'thap'
      return 'binh_thuong'

    default:
      return 'binh_thuong'
  }
}

/**
 * Thành phần card thống nhất cho dashboard
 * Props:
 *   - title: tiêu đề card
 *   - value: số lượng chính
 *   - suffix: hậu tố (mặc định '')
 *   - rating: cao/bình_thuong/thấp/canh_bao
 *   - description: mô tả phụ (optional)
 *   - trend: mũi tên xu hướng (optional) '+5%', '-2', '↑', '↓'
 */
const DashboardCard = ({ title, value, suffix = '', rating = 'binh_thuong', description, trend }) => {
  const ratingConfig = getRatingConfig(rating)

  return (
    <article className="dashboard-card">
      <div className="dashboard-card_header">
        <h3 className="dashboard-card_title">{title}</h3>
        <div
          className={`dashboard-card_rating ${ratingConfig.className}`}
          style={{ '--rating-bg': ratingConfig.bgColor, '--rating-border': ratingConfig.borderColor, '--rating-color': ratingConfig.color }}
        >
          <span>{ratingConfig.label}</span>
        </div>
      </div>

      <div className="dashboard-card_content">
        <div className="dashboard-card_main">
          <p className="dashboard-card_value">
            {value}
            <span className="dashboard-card_suffix">{suffix}</span>
          </p>
          {trend && <p className="dashboard-card_trend">{trend}</p>}
        </div>
        {description && <p className="dashboard-card_description">{description}</p>}
      </div>
    </article>
  )
}

export default DashboardCard
