import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { pondService, environmentLogService, sensorService } from '../../services/api'
import { showToast } from '../../utils/toast'
import { useAuth } from '../../context/AuthContext'
import { getSensorTypeKey } from '../../utils/sensorMetrics'
import '../../styles/dashboard.css'
import '../../styles/technician/technician-layout.css'
import '../../styles/technician/technician-thresholds.css'

const metricDefinitions = [
	{
		code: 'temperature',
		key: 'temperature',
		label: 'Nhiệt độ nước',
		unit: '°C',
		icon: '🌡️',
		minKey: 'minTemp',
		maxKey: 'maxTemp',
		defaultMin: 26,
		defaultMax: 32,
		precision: 1,
	},
	{
		code: 'ph',
		key: 'ph',
		label: 'Độ pH',
		unit: 'pH',
		icon: 'pH',
		minKey: 'minPh',
		maxKey: 'maxPh',
		defaultMin: 7.5,
		defaultMax: 8.5,
		precision: 1,
	},
	{
		code: 'salinity',
		key: 'salinity',
		label: 'Độ mặn',
		unit: 'ppt',
		icon: '🧂',
		minKey: 'minSalinity',
		maxKey: 'maxSalinity',
		defaultMin: 10,
		defaultMax: 25,
		precision: 1,
	},
	{
		code: 'oxygen',
		key: 'oxygen',
		label: 'Oxy hòa tan (DO)',
		unit: 'mg/L',
		icon: 'DO',
		minKey: 'minOxygen',
		maxKey: 'maxOxygen',
		defaultMin: 5.5,
		defaultMax: 8,
		precision: 1,
	},
	{
		code: 'turbidity',
		key: 'turbidity',
		label: 'Độ đục',
		unit: 'NTU',
		icon: '💧',
		minKey: 'minTurbidity',
		maxKey: 'maxTurbidity',
		defaultMin: 5,
		defaultMax: 25,
		precision: 1,
	},
]

const getDefaultThresholds = () => ({
	minPh: 7.5,
	maxPh: 8.5,
	minTemp: 26,
	maxTemp: 32,
	minSalinity: 10,
	maxSalinity: 25,
	minOxygen: 5.5,
	maxOxygen: 8,
	minTurbidity: 5,
	maxTurbidity: 25,
})

const hasValue = (value) => value !== '' && value !== null && value !== undefined

const normalizeThresholdValue = (value) => (hasValue(value) ? value : null)

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

const toNumber = (value) => {
	const parsed = Number(value)
	return Number.isFinite(parsed) ? parsed : null
}

const formatValue = (value, precision = 1) => {
	if (!Number.isFinite(Number(value))) return '--'
	return Number(value).toFixed(precision)
}

const formatDateTime = (raw) => {
	if (!raw) return '--'
	const date = new Date(raw)
	if (Number.isNaN(date.getTime())) return '--'
	return date.toLocaleString('vi-VN', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	})
}

const getMetricStatus = (current, minValue, maxValue) => {
	if (current == null) return 'no-data'
	if (minValue != null && current < minValue) return 'low'
	if (maxValue != null && current > maxValue) return 'high'
	return 'ok'
}

const getBarFill = (current, minValue, maxValue, defaultMin, defaultMax) => {
	if (current == null) return 0
	const start = minValue ?? defaultMin
	const end = maxValue ?? defaultMax
	const span = end - start || 1
	return clamp(((current - start) / span) * 100, 0, 100)
}

const buildMetricCards = (liveReadings, thresholds) =>
	metricDefinitions.map((metric) => {
		const current = toNumber(liveReadings?.[metric.code]?.current_value)
		const updatedAt = liveReadings?.[metric.code]?.last_updated || null
		const minValue = toNumber(thresholds[metric.minKey])
		const maxValue = toNumber(thresholds[metric.maxKey])
		const status = getMetricStatus(current, minValue, maxValue)

		return {
			...metric,
			current,
			updatedAt,
			minValue,
			maxValue,
			status,
			fill: getBarFill(current, minValue, maxValue, metric.defaultMin, metric.defaultMax),
		}
	})

const buildAlertItems = (metrics) => {
	const alerts = metrics.filter((metric) => metric.status === 'low' || metric.status === 'high')

	if (!alerts.length) {
		return [
			{
				key: 'all-clear',
				severity: 'ok',
				title: 'Mọi chỉ số đang ổn định',
				description: 'Các giá trị realtime hiện tại chưa vượt ngưỡng cảnh báo đã thiết lập.',
			},
		]
	}

	return alerts.map((metric) => {
		const direction = metric.status === 'high' ? 'vượt ngưỡng tối đa' : 'thấp hơn ngưỡng tối thiểu'
		const thresholdValue = metric.status === 'high' ? metric.maxValue : metric.minValue
		const alertValue = metric.current != null ? `${formatValue(metric.current, metric.precision)} ${metric.unit}` : '--'
		const thresholdText = thresholdValue != null ? `${formatValue(thresholdValue, metric.precision)} ${metric.unit}` : '--'

		return {
			key: metric.key,
			severity: metric.status,
			title: `${metric.label} ${direction}`,
			description: `Giá trị realtime hiện tại ${alertValue} so với ngưỡng ${thresholdText}.`,
		}
	})
}

const TechnicianThresholds = () => {
	const { realtimeSensorData } = useAuth()
	const [ponds, setPonds] = useState([])
	const [selectedPondId, setSelectedPondId] = useState('')
	const [selectedPond, setSelectedPond] = useState(null)
	const [thresholds, setThresholds] = useState(() => getDefaultThresholds())
	const [pondSensors, setPondSensors] = useState([])
	const [loading, setLoading] = useState(true)
	const [refreshing, setRefreshing] = useState(false)
	const [saving, setSaving] = useState(false)

	const loadPondData = useCallback(
		async (pond, options = {}) => {
			if (!pond?.pond_id) return

			const { silent = false } = options

			setSelectedPondId(String(pond.pond_id))
			setSelectedPond(pond)

			if (!silent) {
				setRefreshing(true)
			}

			try {
				const [thresholdRes, sensorsRes] = await Promise.all([
					environmentLogService.getThresholdsByPond(pond.pond_id),
					sensorService.getSensorsByPondId(pond.pond_id),
				])

				const thresholdData = thresholdRes?.data?.data
				if (thresholdData) {
					setThresholds({
						minPh: thresholdData.min_ph ?? '',
						maxPh: thresholdData.max_ph ?? '',
						minTemp: thresholdData.min_temp ?? '',
						maxTemp: thresholdData.max_temp ?? '',
						minSalinity: thresholdData.min_salinity ?? '',
						maxSalinity: thresholdData.max_salinity ?? '',
						minOxygen: thresholdData.min_oxygen ?? '',
						maxOxygen: thresholdData.max_oxygen ?? '',
						minTurbidity: thresholdData.min_turbidity ?? '',
						maxTurbidity: thresholdData.max_turbidity ?? '',
					})
				} else {
					setThresholds(getDefaultThresholds())
				}

								setPondSensors(sensorsRes?.data?.data || [])
			} catch (err) {
				setThresholds(getDefaultThresholds())
				setPondSensors([])
								showToast({ title: err?.response?.data?.message || 'Không tải được dữ liệu realtime của ao', type: 'error' })
			} finally {
				if (!silent) {
					setRefreshing(false)
				}
			}
		},
		[]
	)

	const fetchPonds = useCallback(async () => {
		try {
			setLoading(true)
			const res = await pondService.getAllPonds()
			const pondsList = res?.data?.data || []
			setPonds(pondsList)

			if (pondsList.length > 0) {
				await loadPondData(pondsList[0])
			}
		} catch (err) {
			showToast({ title: err?.response?.data?.message || 'Không tải được danh sách ao', type: 'error' })
		} finally {
			setLoading(false)
		}
	}, [loadPondData])

	useEffect(() => {
		fetchPonds()
	}, [fetchPonds])

	const handlePondChange = async (pondId) => {
		const pond = ponds.find((item) => String(item.pond_id) === String(pondId))
		if (pond) {
			await loadPondData(pond)
		}
	}

	const handleChange = (field, value) => {
		setThresholds((prev) => ({
			...prev,
			[field]: value === '' ? '' : Number(value),
		}))
	}

	const handleSubmit = async (event) => {
		event.preventDefault()
		if (!selectedPondId) {
			showToast({ title: 'Vui lòng chọn ao', type: 'error' })
			return
		}

		try {
			setSaving(true)

			if (hasValue(thresholds.minPh) && hasValue(thresholds.maxPh) && thresholds.minPh > thresholds.maxPh) {
				showToast({ title: 'pH: Min phải nhỏ hơn Max', type: 'error' })
				return
			}
			if (hasValue(thresholds.minTemp) && hasValue(thresholds.maxTemp) && thresholds.minTemp > thresholds.maxTemp) {
				showToast({ title: 'Nhiệt độ: Min phải nhỏ hơn Max', type: 'error' })
				return
			}
			if (hasValue(thresholds.minSalinity) && hasValue(thresholds.maxSalinity) && thresholds.minSalinity > thresholds.maxSalinity) {
				showToast({ title: 'Độ mặn: Min phải nhỏ hơn Max', type: 'error' })
				return
			}
			if (hasValue(thresholds.minOxygen) && hasValue(thresholds.maxOxygen) && thresholds.minOxygen > thresholds.maxOxygen) {
				showToast({ title: 'Oxy: Min phải nhỏ hơn Max', type: 'error' })
				return
			}
			if (hasValue(thresholds.minTurbidity) && hasValue(thresholds.maxTurbidity) && thresholds.minTurbidity > thresholds.maxTurbidity) {
				showToast({ title: 'Độ đục: Min phải nhỏ hơn Max', type: 'error' })
				return
			}

			const payload = {
				minPh: normalizeThresholdValue(thresholds.minPh),
				maxPh: normalizeThresholdValue(thresholds.maxPh),
				minTemp: normalizeThresholdValue(thresholds.minTemp),
				maxTemp: normalizeThresholdValue(thresholds.maxTemp),
				minSalinity: normalizeThresholdValue(thresholds.minSalinity),
				maxSalinity: normalizeThresholdValue(thresholds.maxSalinity),
				minOxygen: normalizeThresholdValue(thresholds.minOxygen),
				maxOxygen: normalizeThresholdValue(thresholds.maxOxygen),
				minTurbidity: normalizeThresholdValue(thresholds.minTurbidity),
				maxTurbidity: normalizeThresholdValue(thresholds.maxTurbidity),
			}

			await environmentLogService.setThresholdsByPond(selectedPondId, payload)
			await loadPondData(selectedPond || ponds.find((item) => String(item.pond_id) === String(selectedPondId)), { silent: true })
			showToast({ title: 'Đã lưu cấu hình ngưỡng thành công', type: 'success' })
		} catch (err) {
			showToast({ title: err?.response?.data?.message || 'Không lưu được ngưỡng cảnh báo', type: 'error' })
		} finally {
			setSaving(false)
		}
	}

	const liveReadings = useMemo(() => {
		const pondRealtime = realtimeSensorData?.[selectedPondId] || {}
		const readingsMap = {}

		pondSensors.forEach((sensor) => {
			const metricCode = getSensorTypeKey(sensor.sensor_type)
			if (!metricCode || !metricDefinitions.some((metric) => metric.code === metricCode)) return

			const direct = pondRealtime[sensor.sensor_type]
			const byKey = pondRealtime[metricCode]
			const source = direct || byKey || null

			if (source) {
				readingsMap[metricCode] = {
					current_value: source.value ?? source.current_value ?? null,
					last_updated: source.updatedAt || source.lastUpdated || source.recorded_at || source.updated_at || null,
					readings: source.readings || [],
					sensorId: source.sensorId || sensor.sensor_id,
				}
			}
		})

		return readingsMap
	}, [pondSensors, realtimeSensorData, selectedPondId])

	const metricCards = buildMetricCards(liveReadings, thresholds)
	const alertItems = buildAlertItems(metricCards)
	const lastUpdated = metricCards.reduce((latest, metric) => {
		if (!metric.updatedAt) return latest
		if (!latest) return metric.updatedAt
		return new Date(metric.updatedAt).getTime() > new Date(latest).getTime() ? metric.updatedAt : latest
	}, null)
	const liveSensorRows = metricCards
		.filter((metric) => metric.current != null)
		.sort((a, b) => metricDefinitions.findIndex((item) => item.code === a.code) - metricDefinitions.findIndex((item) => item.code === b.code))
	const currentStatus = metricCards.some((metric) => metric.status === 'low' || metric.status === 'high')
		? 'Cần chú ý'
		: metricCards.some((metric) => metric.current != null)
			? 'Bình thường'
			: 'Chưa có dữ liệu'

	if (loading) {
		return (
			<div className="dashboard technician-page-shell technician-thresholds-page">
				<div className="technician-thresholds_loading card">
					<p>Đang tải dữ liệu realtime...</p>
				</div>
			</div>
		)
	}

	return (
		<div className="dashboard technician-page-shell technician-thresholds-page">
			{/* Notifications handled by global toast */}

			<section className="technician-thresholds_hero">
				<div>
					{/* <p className="technician-thresholds_eyebrow">Thiết lập ngưỡng môi trường</p> */}
					<h1>Thiết lập ngưỡng môi trường</h1>
					<p>Cấu hình ngưỡng cảnh báo cho từng ao nuôi theo dữ liệu đo thực tế và cập nhật gần nhất.</p>
				</div>
			</section>

			<section className="technician-thresholds_toolbar">
				<div className="technician-thresholds_toolbar-main">
					<div className="technician-thresholds_selector">
						<label htmlFor="pond-select">Chọn ao nuôi</label>
						<select id="pond-select" value={selectedPondId} onChange={(e) => handlePondChange(e.target.value)}>
							{ponds.map((pond) => (
								<option key={pond.pond_id} value={pond.pond_id}>
									{pond.pond_code} - {pond.pond_name}
								</option>
							))}
						</select>
					</div>

					<div className="technician-thresholds_meta">
						<span className={`technician-thresholds_badge technician-thresholds_badge--${currentStatus === 'Bình thường' ? 'ok' : currentStatus === 'Cần chú ý' ? 'warning' : 'neutral'}`}>
							{currentStatus}
						</span>
						<span className="technician-thresholds_badge technician-thresholds_badge--live">Live</span>
						<span className="technician-thresholds_meta-text">Cập nhật gần nhất: {formatDateTime(lastUpdated)}</span>
						{refreshing && <span className="technician-thresholds_meta-text">Đang làm mới...</span>}
					</div>
				</div>

				<button
					type="submit"
					form="technician-threshold-form"
					className="technician-thresholds_save-btn technician-thresholds_save-btn--inline"
					disabled={saving || !selectedPondId}
				>
					{saving ? 'Đang lưu...' : 'Lưu cấu hình'}
				</button>
			</section>

			<div className="technician-thresholds_grid">
				<form id="technician-threshold-form" className="technician-thresholds_main" onSubmit={handleSubmit}>
					<div className="technician-thresholds_metrics-grid">
						{metricCards.map((metric) => {
							const statusLabel =
								metric.status === 'low'
									? 'Dưới ngưỡng'
									: metric.status === 'high'
										? 'Vượt ngưỡng'
										: metric.status === 'ok'
											? 'Trong ngưỡng'
											: 'Chưa có dữ liệu'
							const accentClass =
								metric.status === 'low'
									? 'threshold-card--low'
									: metric.status === 'high'
										? 'threshold-card--high'
										: metric.status === 'ok'
											? 'threshold-card--ok'
											: 'threshold-card--neutral'

							return (
								<article key={metric.key} className={`threshold-card ${accentClass}`}>
									<div className="threshold-card_head">
										<div className="threshold-card_title-group">
											<span className="threshold-card_icon">{metric.icon}</span>
											<div>
												<h3>{metric.label}</h3>
												<p>Giá trị realtime</p>
											</div>
										</div>
										<div className="threshold-card_value-wrap">
											<strong>
												{formatValue(metric.current, metric.precision)} <span>{metric.unit}</span>
											</strong>
											<span className={`threshold-card_status threshold-card_status--${metric.status}`}>
												{statusLabel}
											</span>
										</div>
									</div>

									<div className="threshold-card_bar">
										<div className="threshold-card_bar-track" />
										<div className="threshold-card_bar-fill" style={{ width: `${metric.fill}%` }} />
										<div className="threshold-card_bar-thumb" style={{ left: `${metric.fill}%` }} />
									</div>

									<div className="threshold-card_range-labels">
										<span>{metric.minValue != null ? formatValue(metric.minValue, metric.precision) : metric.defaultMin} {metric.unit}</span>
										<span>{metric.maxValue != null ? formatValue(metric.maxValue, metric.precision) : metric.defaultMax} {metric.unit}</span>
									</div>

									<div className="threshold-card_inputs">
										<div className="threshold-card_field">
											<label htmlFor={`min-${metric.key}`}>Ngưỡng tối thiểu</label>
											<div className="threshold-card_input-row">
												<input
													id={`min-${metric.key}`}
													type="number"
													step="0.1"
													value={thresholds[metric.minKey]}
													onChange={(e) => handleChange(metric.minKey, e.target.value)}
													placeholder={`Tối thiểu`}
												/>
												<span>{metric.unit}</span>
											</div>
										</div>
										<div className="threshold-card_field">
											<label htmlFor={`max-${metric.key}`}>Ngưỡng tối đa</label>
											<div className="threshold-card_input-row">
												<input
													id={`max-${metric.key}`}
													type="number"
													step="0.1"
													value={thresholds[metric.maxKey]}
													onChange={(e) => handleChange(metric.maxKey, e.target.value)}
													placeholder={`Tối đa`}
												/>
												<span>{metric.unit}</span>
											</div>
										</div>
									</div>
								</article>
							)
						})}
					</div>

					<section className="technician-thresholds_history-card">
						<div className="technician-thresholds_section-head">
							<div>
								<h2>Dữ liệu realtime gần đây</h2>
								<p>Chỉ lấy từ cảm biến realtime của ao đang chọn.</p>
							</div>
							<span>{liveSensorRows.length} cảm biến</span>
						</div>

						<div className="technician-thresholds_table-wrap">
							<table className="technician-thresholds_table">
								<thead>
									<tr>
										<th>Cảm biến</th>
										<th>Loại</th>
										<th>Giá trị realtime</th>
										<th>Ngưỡng</th>
										<th>Cập nhật</th>
									</tr>
								</thead>
								<tbody>
									{liveSensorRows.length > 0 ? (
										liveSensorRows.map((metric) => (
											<tr key={metric.code}>
												<td>{metric.current != null ? `${formatValue(metric.current, metric.precision)} ${metric.unit}` : '--'}</td>
												<td>{metric.label}</td>
												<td>{metric.current != null ? `${formatValue(metric.current, metric.precision)} ${metric.unit}` : '--'}</td>
												<td>
													{metric.minValue != null || metric.maxValue != null
														? `${metric.minValue != null ? formatValue(metric.minValue, metric.precision) : '--'} - ${metric.maxValue != null ? formatValue(metric.maxValue, metric.precision) : '--'} ${metric.unit}`
														: '--'}
												</td>
												<td>{formatDateTime(metric.updatedAt)}</td>
											</tr>
										))
									) : (
										<tr>
											<td colSpan="5" className="technician-thresholds_empty-row">
												Chưa có dữ liệu realtime từ cảm biến.
											</td>
										</tr>
									)}
								</tbody>
							</table>
						</div>
					</section>
				</form>

				<aside className="technician-thresholds_sidebar">
					<div className="technician-thresholds_panel technician-thresholds_pond-panel">
						<h2>Thông tin ao nuôi</h2>
						{selectedPond ? (
							<div className="technician-thresholds_pond-info">
								<div>
									<span>Ao</span>
									<strong>{selectedPond.pond_code} - {selectedPond.pond_name}</strong>
								</div>
								<div>
									<span>Diện tích</span>
									<strong>{selectedPond.area_m2 || '-'} m²</strong>
								</div>
								<div>
									<span>Trạng thái</span>
									<strong>{currentStatus}</strong>
								</div>
							</div>
						) : (
							<p className="technician-thresholds_empty">Chưa chọn ao nuôi.</p>
						)}
					</div>

					<div className="technician-thresholds_panel">
						<div className="technician-thresholds_section-head technician-thresholds_section-head--compact">
							<h2>Xem trước cảnh báo</h2>
							<span>{alertItems.length}</span>
						</div>
						<p className="technician-thresholds_empty" style={{ marginBottom: '10px' }}>
							Chỉ dựa trên tín hiệu realtime của cảm biến, không dùng dữ liệu nhập tay.
						</p>
						<ul className="technician-thresholds_alert-list">
							{alertItems.map((item) => (
								<li key={item.key} className={`technician-thresholds_alert-item technician-thresholds_alert-item--${item.severity}`}>
									<div className="technician-thresholds_alert-icon">
										{item.severity === 'high' ? '⚠️' : item.severity === 'low' ? '🚨' : 'ℹ️'}
									</div>
									<div>
										<strong>{item.title}</strong>
										<p>{item.description}</p>
									</div>
								</li>
							))}
						</ul>
					</div>
				</aside>
			</div>
		</div>
	)
}

export default TechnicianThresholds