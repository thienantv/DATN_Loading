import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Line } from 'react-chartjs-2'
import { pondService, sensorService, environmentLogService } from '../../services/api'
import { showToast } from '../../utils/toast'
import { getSensorProfile, getSensorTypeKey, SENSOR_ORDER } from '../../utils/sensorMetrics'
import '../../styles/technician/technician-sensors.css'

import {
	Chart as ChartJS,
	CategoryScale,
	LinearScale,
	PointElement,
	LineElement,
	Title,
	Tooltip,
	Legend,
	Filler,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

const SENSOR_TYPE_OPTIONS = [
	{ value: 'temperature', label: 'Nhiệt độ nước' },
	{ value: 'pH', label: 'Độ pH' },
	{ value: 'dissolved oxygen', label: 'Oxy hòa tan (DO)' },
	{ value: 'salinity', label: 'Độ mặn' },
	{ value: 'turbidity', label: 'Độ đục' },
]

const SENSOR_STATUS_OPTIONS = [
	{ value: 'ALL', label: 'Tất cả trạng thái' },
	{ value: 'ACTIVE', label: 'Hoạt động' },
	{ value: 'INACTIVE', label: 'Tạm ngưng' },
	{ value: 'DISCONNECTED', label: 'Mất kết nối' },
]

const METRIC_DEFINITIONS = [
	{ code: 'ph', label: 'Độ pH', unit: 'pH', icon: '🔬', minKey: 'minPh', maxKey: 'maxPh', defaultMin: 7.4, defaultMax: 8.5, precision: 1 },
	{ code: 'temperature', label: 'Nhiệt độ nước', unit: '°C', icon: '🌡️', minKey: 'minTemp', maxKey: 'maxTemp', defaultMin: 26, defaultMax: 32, precision: 1 },
	{ code: 'oxygen', label: 'Oxy hòa tan (DO)', unit: 'mg/L', icon: '💨', minKey: 'minOxygen', maxKey: 'maxOxygen', defaultMin: 4.5, defaultMax: 8, precision: 1 },
	{ code: 'salinity', label: 'Độ mặn', unit: 'ppt', icon: '🧂', minKey: 'minSalinity', maxKey: 'maxSalinity', defaultMin: 12, defaultMax: 25, precision: 1 },
	{ code: 'turbidity', label: 'Độ đục', unit: 'NTU', icon: '🌫️', minKey: 'minTurbidity', maxKey: 'maxTurbidity', defaultMin: 0, defaultMax: 10, precision: 1 },
]

const DEFAULT_THRESHOLD_FORM = {
	minPh: 7.4,
	maxPh: 8.5,
	minTemp: 26,
	maxTemp: 32,
	minOxygen: 4.5,
	maxOxygen: 8,
	minSalinity: 12,
	maxSalinity: 25,
	minTurbidity: 0,
	maxTurbidity: 10,
	alertLevel: 'WARNING',
	notes: '',
}

const SENSOR_STATUS_STALE_MINUTES = 15

const STATUS_BADGES = {
	ACTIVE: 'technician-sensors_status--active',
	INACTIVE: 'technician-sensors_status--paused',
	DISCONNECTED: 'technician-sensors_status--disconnected',
}

const SERIAL_PREFIX_BY_TYPE = {
	temperature: 'TEMP',
	'dissolved oxygen': 'DO',
	pH: 'PH',
	salinity: 'SAL',
	turbidity: 'TURB',
}

const toNullableNumber = (value) => {
	if (value === '' || value === null || value === undefined) return null
	const parsed = Number(value)
	return Number.isFinite(parsed) ? parsed : null
}

const formatNumber = (value, precision = 1) => {
	if (value === null || value === undefined || value === '') return '--'
	const parsed = Number(value)
	if (Number.isNaN(parsed)) return String(value)
	return parsed.toFixed(precision)
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

const getSensorStatusState = (sensor) => {
	const baseStatus = String(sensor?.status || '').trim().toUpperCase()
	if (baseStatus === 'INACTIVE') return 'INACTIVE'

	const lastUpdated = sensor?.last_updated ? new Date(sensor.last_updated).getTime() : 0
	if (!lastUpdated) return 'DISCONNECTED'

	const staleWindow = SENSOR_STATUS_STALE_MINUTES * 60 * 1000
	if (Date.now() - lastUpdated > staleWindow) return 'DISCONNECTED'

	return 'ACTIVE'
}

const getSerialPreview = (ponds, pondId, sensorType) => {
	const pond = ponds.find((item) => String(item.pond_id) === String(pondId))
	const prefix = SERIAL_PREFIX_BY_TYPE[sensorType]
	if (!prefix) return ''
	if (pond?.pond_code) return `${prefix}-${pond.pond_code}`
	if (pondId) return `${prefix}-${pondId}`
	return ''
}

const normalizeThresholdForm = (data = {}) => ({
	minPh: data.min_ph ?? data.minPh ?? DEFAULT_THRESHOLD_FORM.minPh,
	maxPh: data.max_ph ?? data.maxPh ?? DEFAULT_THRESHOLD_FORM.maxPh,
	minTemp: data.min_temp ?? data.minTemp ?? DEFAULT_THRESHOLD_FORM.minTemp,
	maxTemp: data.max_temp ?? data.maxTemp ?? DEFAULT_THRESHOLD_FORM.maxTemp,
	minOxygen: data.min_oxygen ?? data.minOxygen ?? DEFAULT_THRESHOLD_FORM.minOxygen,
	maxOxygen: data.max_oxygen ?? data.maxOxygen ?? DEFAULT_THRESHOLD_FORM.maxOxygen,
	minSalinity: data.min_salinity ?? data.minSalinity ?? DEFAULT_THRESHOLD_FORM.minSalinity,
	maxSalinity: data.max_salinity ?? data.maxSalinity ?? DEFAULT_THRESHOLD_FORM.maxSalinity,
	minTurbidity: data.min_turbidity ?? data.minTurbidity ?? DEFAULT_THRESHOLD_FORM.minTurbidity,
	maxTurbidity: data.max_turbidity ?? data.maxTurbidity ?? DEFAULT_THRESHOLD_FORM.maxTurbidity,
	alertLevel: data.alert_level ?? data.alertLevel ?? DEFAULT_THRESHOLD_FORM.alertLevel,
	notes: data.notes ?? DEFAULT_THRESHOLD_FORM.notes,
})

const TechnicianSensors = () => {
	const [ponds, setPonds] = useState([])
	const [allSensors, setAllSensors] = useState([])
	const [selectedPondId, setSelectedPondId] = useState('')
	const [selectedPond, setSelectedPond] = useState(null)
	const [selectedPondRealtime, setSelectedPondRealtime] = useState({})
	const [selectedPondThresholds, setSelectedPondThresholds] = useState(DEFAULT_THRESHOLD_FORM)
	const [loading, setLoading] = useState(true)
	const [refreshingPond, setRefreshingPond] = useState(false)
	const [pageSize, setPageSize] = useState(8)
	const [currentPage, setCurrentPage] = useState(1)
	const [searchTerm, setSearchTerm] = useState('')
	const [pondFilter, setPondFilter] = useState('ALL')
	const [typeFilter, setTypeFilter] = useState('ALL')
	const [statusFilter, setStatusFilter] = useState('ALL')
	const [sensorModalOpen, setSensorModalOpen] = useState(false)
	const [thresholdModalOpen, setThresholdModalOpen] = useState(false)
	const [savingSensor, setSavingSensor] = useState(false)
	const [savingThresholds, setSavingThresholds] = useState(false)
	const [thresholdLoading, setThresholdLoading] = useState(false)
	const [activeThresholdMetric, setActiveThresholdMetric] = useState('')
	const [sensorForm, setSensorForm] = useState({
		sensorId: null,
		pondId: '',
		sensorName: '',
		sensorType: 'temperature',
		status: 'ACTIVE',
	})
	const [thresholdPondId, setThresholdPondId] = useState('')
	const [thresholdSensors, setThresholdSensors] = useState([])
	const [thresholdForm, setThresholdForm] = useState(DEFAULT_THRESHOLD_FORM)
	const selectedPondIdRef = useRef('')

	const loadPondSnapshot = useCallback(async (pondId, options = {}) => {
		if (!pondId) return
		const { silent = false, focusMetric = '', pondList = [] } = options

		const pond = pondList.find((item) => String(item.pond_id) === String(pondId)) || null
		if (!pond) return

		if (!silent) setRefreshingPond(true)

		try {
			const [sensorsRes, thresholdsRes] = await Promise.all([
				sensorService.getSensorsByPondId(pondId),
				environmentLogService.getThresholdsByPond(pondId),
			])

			const pondSensorsNext = sensorsRes?.data?.data || []
			const thresholdsNext = normalizeThresholdForm(thresholdsRes?.data?.data || {})

			setSelectedPond(pond)
			setSelectedPondId(String(pondId))
			setSelectedPondThresholds(thresholdsNext)

			const realtimeMap = {}
			await Promise.all(
				pondSensorsNext.map(async (sensor) => {
					const metricKey = getSensorTypeKey(sensor.sensor_type)
					if (!metricKey) return

					try {
						const readingsRes = await sensorService.getSensorReadings(sensor.sensor_id, 60)
						const readings = [...(readingsRes?.data?.data || [])].reverse()
						const latest = readings[readings.length - 1] || null

						if (!realtimeMap[metricKey] || new Date(latest?.recorded_at || 0).getTime() > new Date(realtimeMap[metricKey].latest?.recorded_at || 0).getTime()) {
							realtimeMap[metricKey] = { sensor, readings, latest }
						}
					} catch (readingError) {
						console.error('Error loading sensor readings:', readingError)
					}
				})
			)

			setSelectedPondRealtime(realtimeMap)
			setActiveThresholdMetric(focusMetric)
			if (focusMetric) {
				const element = document.getElementById(`threshold-metric-${focusMetric}`)
				if (element) {
					element.scrollIntoView({ behavior: 'smooth', block: 'center' })
				}
			}
		} catch (error) {
			showToast({ title: error?.response?.data?.message || 'Không tải được dữ liệu của ao', type: 'error' })
		} finally {
			if (!silent) setRefreshingPond(false)
		}
	}, [])

	const loadPondsAndSensors = useCallback(async (options = {}) => {
		const { silent = false } = options
		try {
			if (!silent) setLoading(true)
			const [pondRes, sensorRes] = await Promise.all([pondService.getAllPonds(), sensorService.getAllSensors()])
			const nextPonds = pondRes?.data?.data || []
			const nextSensors = sensorRes?.data?.data || []
			setPonds(nextPonds)
			setAllSensors(nextSensors)

			const preferredPondId = selectedPondIdRef.current || nextPonds[0]?.pond_id || ''
			if (preferredPondId) {
				await loadPondSnapshot(preferredPondId, { silent: true, pondList: nextPonds })
			}
		} catch (error) {
			showToast({ title: error?.response?.data?.message || 'Không tải được dữ liệu cảm biến', type: 'error' })
		} finally {
			if (!silent) setLoading(false)
		}
	}, [loadPondSnapshot])

	useEffect(() => {
		selectedPondIdRef.current = selectedPondId
	}, [selectedPondId])

	useEffect(() => {
		loadPondsAndSensors()
	}, [loadPondsAndSensors])

	useEffect(() => {
		const interval = setInterval(() => {
			if (selectedPondId) {
				loadPondSnapshot(selectedPondId, { silent: true })
			}
			loadPondsAndSensors({ silent: true })
		}, 30000)

		return () => clearInterval(interval)
	}, [loadPondSnapshot, loadPondsAndSensors, selectedPondId])

	const getPondLabel = (pondId) => {
		const pond = ponds.find((item) => String(item.pond_id) === String(pondId))
		if (!pond) return '-'
		return `${pond.pond_code || ''} ${pond.pond_name || ''}`.trim()
	}

	const filteredSensors = useMemo(() => {
		const normalizedSearch = searchTerm.trim().toLowerCase()

		return allSensors.filter((sensor) => {
			const searchMatched =
				!normalizedSearch ||
				String(sensor.sensor_name || '').toLowerCase().includes(normalizedSearch) ||
				String(sensor.serial_number || '').toLowerCase().includes(normalizedSearch)

			const sensorPondId = String(sensor.pond_id || '')
			const pondMatched = pondFilter === 'ALL' || pondFilter === sensorPondId

			const sensorType = getSensorTypeKey(sensor.sensor_type)
			const typeMatched = typeFilter === 'ALL' || sensorType === typeFilter

			const state = getSensorStatusState(sensor)
			const statusMatched = statusFilter === 'ALL' || state === statusFilter

			return searchMatched && pondMatched && typeMatched && statusMatched
		})
	}, [allSensors, pondFilter, searchTerm, statusFilter, typeFilter])

	const totalPages = Math.max(1, Math.ceil(filteredSensors.length / pageSize))
	const safePage = Math.min(currentPage, totalPages)
	const startIndex = (safePage - 1) * pageSize
	const endIndex = Math.min(startIndex + pageSize, filteredSensors.length)
	const paginatedSensors = filteredSensors.slice(startIndex, endIndex)

	useEffect(() => {
		if (currentPage > totalPages) {
			setCurrentPage(totalPages)
		}
	}, [currentPage, totalPages])

	const stats = useMemo(() => {
		const total = allSensors.length
		const active = allSensors.filter((sensor) => getSensorStatusState(sensor) === 'ACTIVE').length
		const paused = allSensors.filter((sensor) => getSensorStatusState(sensor) === 'INACTIVE').length
		const disconnected = allSensors.filter((sensor) => getSensorStatusState(sensor) === 'DISCONNECTED').length
		return {
			monitoredPonds: ponds.length,
			total,
			active,
			paused,
			disconnected,
		}
	}, [allSensors, ponds])

	const realtimeCards = useMemo(() => {
		return METRIC_DEFINITIONS.map((metric) => {
			const currentEntry = selectedPondRealtime[metric.code]
			const current = toNullableNumber(currentEntry?.latest?.value)
			const thresholdMin = toNullableNumber(selectedPondThresholds[metric.minKey])
			const thresholdMax = toNullableNumber(selectedPondThresholds[metric.maxKey])
			const dangerMode = String(selectedPondThresholds.alertLevel || 'WARNING').toUpperCase()
			let status = 'normal'

			if (current !== null) {
				if ((thresholdMin !== null && current < thresholdMin) || (thresholdMax !== null && current > thresholdMax)) {
					status = dangerMode === 'DANGER' ? 'danger' : 'warning'
				}
			} else {
				status = 'missing'
			}

			return {
				...metric,
				current,
				status,
				updatedAt: currentEntry?.latest?.recorded_at || null,
				fill: current === null ? 0 : Math.max(0, Math.min(100, ((current - (thresholdMin ?? metric.defaultMin)) / ((thresholdMax ?? metric.defaultMax) - (thresholdMin ?? metric.defaultMin) || 1)) * 100)),
				minValue: thresholdMin,
				maxValue: thresholdMax,
			}
		})
	}, [selectedPondRealtime, selectedPondThresholds])

	const alertCards = useMemo(() => {
		const alerts = realtimeCards.filter((card) => card.status === 'warning' || card.status === 'danger')
		if (!alerts.length) {
			return [
				{
					key: 'ok',
					title: 'Mọi chỉ số đang ổn định',
					description: 'Các giá trị realtime hiện tại chưa vượt ngưỡng đã cấu hình.',
					severity: 'ok',
				},
			]
		}

		return alerts.map((card) => ({
			key: card.code,
			title: `${card.label} đang ${card.status === 'danger' ? 'nguy hiểm' : 'cảnh báo'}`,
			description: `Giá trị hiện tại ${formatNumber(card.current, card.precision)} ${card.unit || ''}`.trim(),
			severity: card.status,
		}))
	}, [realtimeCards])

	const realtimeChartData = useMemo(() => {
		const timestamps = new Set()
		const chartSeries = []

		METRIC_DEFINITIONS.forEach((metric) => {
			const entry = selectedPondRealtime[metric.code]
			if (!entry?.readings?.length) return

			entry.readings.forEach((reading) => {
				if (reading?.recorded_at) {
					timestamps.add(new Date(reading.recorded_at).toISOString())
				}
			})

			chartSeries.push({
				metric,
				readings: entry.readings,
			})
		})

		const labelsIso = Array.from(timestamps).sort()
		const labels = labelsIso.map((iso) => new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(iso)))

		const datasets = chartSeries.map((series, index) => {
			const valueMap = new Map()
			series.readings.forEach((reading) => {
				if (reading?.recorded_at) {
					valueMap.set(new Date(reading.recorded_at).toISOString(), Number(reading.value))
				}
			})

			const colors = ['#2563eb', '#10b981', '#f97316', '#8b5cf6', '#ef4444']
			const color = colors[index % colors.length]

			return {
				label: series.metric.label,
				data: labelsIso.map((iso) => (valueMap.has(iso) ? valueMap.get(iso) : null)),
				borderColor: color,
				backgroundColor: `${color}26`,
				pointRadius: 2,
				tension: 0.35,
				fill: true,
			}
		})

		return { labels, datasets }
	}, [selectedPondRealtime])

	const chartOptions = useMemo(() => ({
		responsive: true,
		maintainAspectRatio: false,
		plugins: {
			legend: { display: true, position: 'top', labels: { usePointStyle: true, boxWidth: 8 } },
		},
		scales: {
			x: { grid: { color: 'rgba(148, 163, 184, 0.18)' } },
			y: { grid: { color: 'rgba(148, 163, 184, 0.18)' } },
		},
	}), [])

	const openSensorModal = (sensor = null) => {
		if (sensor) {
			setSensorForm({
				sensorId: sensor.sensor_id,
				pondId: String(sensor.pond_id || ''),
				sensorName: sensor.sensor_name || '',
				sensorType: sensor.sensor_type || 'temperature',
				status: String(sensor.status || 'ACTIVE').toUpperCase() === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
			})
		} else {
			setSensorForm({ sensorId: null, pondId: String(selectedPondId || ponds[0]?.pond_id || ''), sensorName: '', sensorType: 'temperature', status: 'ACTIVE' })
		}
		setSensorModalOpen(true)
	}

	const openThresholdModal = async (sensor = null) => {
		const pondId = sensor?.pond_id || selectedPondId || ponds[0]?.pond_id || ''
		if (!pondId) return

		setThresholdModalOpen(true)
		setThresholdPondId(String(pondId))
		setActiveThresholdMetric(sensor ? getSensorTypeKey(sensor.sensor_type) || '' : '')

		setThresholdLoading(true)
		try {
			const [sensorsRes, thresholdsRes] = await Promise.all([
				sensorService.getSensorsByPondId(pondId),
				environmentLogService.getThresholdsByPond(pondId),
			])

			setThresholdSensors(sensorsRes?.data?.data || [])
			setThresholdForm(normalizeThresholdForm(thresholdsRes?.data?.data || {}))
		} catch (error) {
			showToast({ title: error?.response?.data?.message || 'Không tải được cấu hình ngưỡng', type: 'error' })
		} finally {
			setThresholdLoading(false)
		}
	}

	const handleSensorFormChange = (field, value) => {
		setSensorForm((prev) => {
			const next = { ...prev, [field]: value }
			return next
		})
	}

	const handleSensorSubmit = async (event) => {
		event.preventDefault()

		if (!window.confirm(sensorForm.sensorId ? 'Xác nhận cập nhật cảm biến?' : 'Xác nhận thêm cảm biến mới?')) return

		if (!sensorForm.pondId || !sensorForm.sensorName.trim() || !sensorForm.sensorType) {
			showToast({ title: 'Vui lòng nhập đầy đủ thông tin cảm biến', type: 'error' })
			return
		}

		try {
			setSavingSensor(true)
			const payload = {
				pond_id: Number(sensorForm.pondId),
				sensor_name: sensorForm.sensorName.trim(),
				status: sensorForm.status,
			}

			if (sensorForm.sensorId) {
				await sensorService.updateSensor(sensorForm.sensorId, payload)
				showToast({ title: 'Cập nhật cảm biến thành công', type: 'success' })
			} else {
				await sensorService.createSensor({
					...payload,
					sensor_type: sensorForm.sensorType,
				})
				showToast({ title: 'Thêm cảm biến thành công', type: 'success' })
			}

			setSensorModalOpen(false)
			await loadPondsAndSensors()
		} catch (error) {
			showToast({ title: error?.response?.data?.message || 'Không lưu được cảm biến', type: 'error' })
		} finally {
			setSavingSensor(false)
		}
	}

	const handleDeleteSensor = async (sensor) => {
		if (!window.confirm(`Xóa cảm biến ${sensor.sensor_name || sensor.serial_number || sensor.sensor_id}?`)) return

		try {
			setSavingSensor(true)
			await sensorService.deleteSensor(sensor.sensor_id)
			showToast({ title: 'Đã xóa cảm biến', type: 'success' })
			await loadPondsAndSensors()
		} catch (error) {
			showToast({ title: error?.response?.data?.message || 'Không xóa được cảm biến', type: 'error' })
		} finally {
			setSavingSensor(false)
		}
	}

	const handleThresholdChange = (field, value) => {
		setThresholdForm((prev) => ({
			...prev,
			[field]: value,
		}))
	}

	const handleThresholdSubmit = async (event) => {
		event.preventDefault()

		if (!thresholdPondId) {
			showToast({ title: 'Vui lòng chọn ao nuôi', type: 'error' })
			return
		}

		for (const metric of METRIC_DEFINITIONS) {
			const minValue = toNullableNumber(thresholdForm[metric.minKey])
			const maxValue = toNullableNumber(thresholdForm[metric.maxKey])
			if (minValue !== null && maxValue !== null && minValue >= maxValue) {
				showToast({ title: `${metric.label}: giá trị tối thiểu phải nhỏ hơn giá trị tối đa`, type: 'error' })
				return
			}
		}

		if (!window.confirm('Xác nhận lưu cấu hình ngưỡng cảnh báo?')) return

		try {
			setSavingThresholds(true)
			await environmentLogService.setThresholdsByPond(thresholdPondId, {
				minPh: toNullableNumber(thresholdForm.minPh),
				maxPh: toNullableNumber(thresholdForm.maxPh),
				minTemp: toNullableNumber(thresholdForm.minTemp),
				maxTemp: toNullableNumber(thresholdForm.maxTemp),
				minOxygen: toNullableNumber(thresholdForm.minOxygen),
				maxOxygen: toNullableNumber(thresholdForm.maxOxygen),
				minSalinity: toNullableNumber(thresholdForm.minSalinity),
				maxSalinity: toNullableNumber(thresholdForm.maxSalinity),
				minTurbidity: toNullableNumber(thresholdForm.minTurbidity),
				maxTurbidity: toNullableNumber(thresholdForm.maxTurbidity),
				alertLevel: thresholdForm.alertLevel,
				notes: thresholdForm.notes,
			})

			showToast({ title: 'Đã lưu cấu hình ngưỡng thành công', type: 'success' })
			setThresholdModalOpen(false)
			await loadPondSnapshot(thresholdPondId, { silent: true, focusMetric: activeThresholdMetric })
		} catch (error) {
			showToast({ title: error?.response?.data?.message || 'Không lưu được cấu hình ngưỡng', type: 'error' })
		} finally {
			setSavingThresholds(false)
		}
	}

	const sensorTypeFilterOptions = useMemo(() => SENSOR_ORDER, [])

	if (loading) {
		return (
			<div className="dashboard technician-page-shell technician-sensor-page technician-sensors_page">
				<div className="flex-center technician-sensor-page_loading">
					<div className="spinner" />
				</div>
			</div>
		)
	}

	return (
		<div className="dashboard admin-page technician-page-shell technician-sensor-page technician-sensors_page">
			<div className="table-container table-panel technician-sensor-page_panel-shell">
				<div className="table-header table-header">
					<div>
						<h2>Quản lý cảm biến</h2>
						<p className="table-subtitle">Quản lý, giám sát và theo dõi dữ liệu cảm biến theo thời gian thực.</p>
					</div>
					<div className="technician-sensor-page_header-actions">
						<button type="button" className="btn btn-primary" onClick={() => openSensorModal()}>
							+ Thêm cảm biến
						</button>
						<button type="button" className="btn btn-secondary" onClick={() => openThresholdModal()}>
							Thiết lập ngưỡng
						</button>
					</div>
				</div>

				<section className="technician-ponds_stats-grid technician-sensor-page_stats-grid">
					<article className="technician-ponds_stat-card technician-ponds_stat-card--total technician-sensor-page_stat-card">
						<span>Ao đang giám sát</span>
						<strong>{stats.monitoredPonds}</strong>
					</article>
					<article className="technician-ponds_stat-card technician-ponds_stat-card--total technician-sensor-page_stat-card">
						<span>Tổng số cảm biến</span>
						<strong>{stats.total}</strong>
					</article>
					<article className="technician-ponds_stat-card technician-ponds_stat-card--farming technician-sensor-page_stat-card">
						<span>Cảm biến hoạt động</span>
						<strong>{stats.active}</strong>
					</article>
					<article className="technician-ponds_stat-card technician-ponds_stat-card--paused technician-sensor-page_stat-card">
						<span>Cảm biến tạm ngưng</span>
						<strong>{stats.paused}</strong>
					</article>
					<article className="technician-ponds_stat-card technician-ponds_stat-card--renovating technician-sensor-page_stat-card">
						<span>Cảm biến mất kết nối</span>
						<strong>{stats.disconnected}</strong>
					</article>
				</section>

				<section className="technician-sensor-page_ponds">
					<div className="technician-sensor-page_section-head">
						<div>
							<h2>Danh sách ao theo dõi Real-time</h2>
							<p>Chọn một ao để xem dữ liệu cảm biến và biểu đồ theo thời gian thực.</p>
						</div>
						<select
							className="table-filter technician-sensor-page_pond-select"
							value={selectedPondId}
							onChange={(e) => {
								const pondId = e.target.value
								if (pondId) {
									loadPondSnapshot(pondId)
								}
							}}
							disabled={!ponds.length}
						>
							<option value="">-- Chọn ao theo dõi --</option>
							{ponds.map((pond) => (
								<option key={pond.pond_id} value={pond.pond_id}>
									{pond.pond_code || 'AO'} - {pond.pond_name || 'Không tên'}
								</option>
							))}
						</select>
					</div>
				</section>

				<section className="technician-sensor-page_realtime">
					<div className="technician-sensor-page_section-head">
						<div>
							<h2>Dữ liệu cảm biến Real-time</h2>
							<p>{selectedPond ? `${selectedPond.pond_code} - ${selectedPond.pond_name}` : 'Chọn ao để xem dữ liệu realtime'}</p>
						</div>
						{refreshingPond && <span className="technician-sensor-page_refresh">Đang cập nhật...</span>}
					</div>

					<div className="technician-sensor-page_cards">
						{realtimeCards.map((card) => {
							const statusLabel = card.status === 'danger' ? 'Nguy hiểm' : card.status === 'warning' ? 'Cảnh báo' : card.status === 'missing' ? 'Không có dữ liệu' : 'Bình thường'
							return (
								<article key={card.code} className={`technician-sensor-page_card technician-sensor-page_card--${card.status}`}>
									<div className="technician-sensor-page_card-head">
										<div>
											<span>{card.icon}</span>
											<strong>{card.label}</strong>
										</div>
										<small>{statusLabel}</small>
									</div>
									<div className="technician-sensor-page_card-value">
										{card.current !== null ? formatNumber(card.current, card.precision) : '--'} <span>{card.unit}</span>
									</div>
									<div className="technician-sensor-page_card-bar">
										<span style={{ width: `${card.fill}%` }} />
									</div>
									<div className="technician-sensor-page_card-meta">Cập nhật gần nhất: {formatDateTime(card.updatedAt)}</div>
								</article>
							)
						})}
					</div>

					<div className="technician-sensor-page_chart-card">
						<div className="technician-sensor-page_section-head technician-sensor-page_section-head--compact">
							<h3>Biểu đồ dữ liệu real-time</h3>
							<span>Theo dõi biến động theo thời gian</span>
						</div>
						<div className="technician-sensor-page_chart-wrap">
							{realtimeChartData.datasets.length > 0 ? (
								<Line data={realtimeChartData} options={chartOptions} />
							) : (
								<div className="technician-sensor-page_empty-chart">Chưa có dữ liệu realtime cho ao này.</div>
							)}
						</div>
					</div>
				</section>

				<div className="table-toolbar technician-ponds_toolbar">
					<div className="table-search">
						<span>⌕</span>
						<input
							type="text"
							placeholder="Tìm theo tên cảm biến hoặc mã cảm biến..."
							value={searchTerm}
							onChange={(e) => {
								setSearchTerm(e.target.value)
								setCurrentPage(1)
							}}
						/>
					</div>

					<select className="table-filter" value={pondFilter} onChange={(e) => { setPondFilter(e.target.value); setCurrentPage(1) }}>
						<option value="ALL">Tất cả ao nuôi</option>
						{ponds.map((pond) => (
							<option key={pond.pond_id} value={pond.pond_id}>
								{pond.pond_code} - {pond.pond_name}
							</option>
						))}
					</select>

					<select className="table-filter" value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1) }}>
						<option value="ALL">Tất cả loại</option>
						{sensorTypeFilterOptions.map((type) => {
							const option = SENSOR_TYPE_OPTIONS.find((item) => item.value === type)
							return (
								<option key={type} value={type}>
									{option?.label || type}
								</option>
							)
						})}
					</select>

					<select className="table-filter" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1) }}>
						{SENSOR_STATUS_OPTIONS.map((option) => (
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
								<th>Tên cảm biến</th>
								<th>Loại cảm biến</th>
								<th>Ao nuôi</th>
								<th>Trạng thái cảm biến</th>
								<th>Chức năng</th>
							</tr>
						</thead>
						<tbody>
							{paginatedSensors.length === 0 ? (
								<tr>
									<td colSpan="5" className="table-empty-row">Không có cảm biến phù hợp.</td>
								</tr>
							) : (
								paginatedSensors.map((sensor) => {
									const statusState = getSensorStatusState(sensor)
									return (
										<tr key={sensor.sensor_id}>
											<td>
												<div className="technician-sensor-page_sensor-title">
													<strong>{sensor.sensor_name || '-'}</strong>
													<span>{sensor.serial_number || '-'}</span>
												</div>
											</td>
											<td>{getSensorProfile(getSensorTypeKey(sensor.sensor_type))?.label || sensor.sensor_type || '-'}</td>
											<td>{getPondLabel(sensor.pond_id)}</td>
											<td>
												<span className={`technician-sensors_status ${STATUS_BADGES[statusState] || ''}`}>
													{statusState === 'ACTIVE' ? 'Hoạt động' : statusState === 'INACTIVE' ? 'Tạm ngưng' : 'Mất kết nối'}
												</span>
											</td>
											<td>
													<div className="table-actions">
													<button
														type="button"
														className="table-action-btn table-action-btn--edit"
														title="Chỉnh sửa cảm biến"
														aria-label="Chỉnh sửa cảm biến"
														onClick={() => openSensorModal(sensor)}
													>
														✎
													</button>
													<button
														type="button"
														className="table-action-btn table-action-btn--settings"
														title="Thiết lập ngưỡng"
														aria-label="Thiết lập ngưỡng"
														onClick={() => openThresholdModal(sensor)}
													>
														⚙
													</button>
													<button
														type="button"
														className="table-action-btn table-action-btn--delete"
														title="Xóa cảm biến"
														aria-label="Xóa cảm biến"
														onClick={() => handleDeleteSensor(sensor)}
													>
														🗑
													</button>
												</div>
											</td>
										</tr>
									)
								})
							)}
						</tbody>
					</table>
				</div>

				<div className="table-pagination">
					<div className="table-pagination-left">
						<label htmlFor="sensorPageSize">Số hàng / trang</label>
						<select
							id="sensorPageSize"
							value={pageSize}
							onChange={(e) => {
								setPageSize(Number(e.target.value))
								setCurrentPage(1)
							}}
						>
							{[8, 12, 20].map((size) => (
								<option key={size} value={size}>{size}</option>
							))}
						</select>
						<span>{filteredSensors.length === 0 ? 0 : startIndex + 1}-{endIndex} / {filteredSensors.length}</span>
					</div>

					<div className="table-pagination-right">
						<button type="button" className="btn btn-sm btn-secondary" onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))} disabled={safePage <= 1}>‹</button>
						<span className="table-page-pill">{safePage}</span>
						<button type="button" className="btn btn-sm btn-secondary" onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))} disabled={safePage >= totalPages}>›</button>
					</div>
				</div>
				</div>

			{sensorModalOpen && (
				<div className="modal technician-sensor-page_modal" onClick={() => setSensorModalOpen(false)}>
					<div className="modal-content technician-sensors_modal" onClick={(event) => event.stopPropagation()}>
						<h3 className="technician-sensors_modal-title">{sensorForm.sensorId ? 'Chỉnh sửa cảm biến' : 'Thêm cảm biến'}</h3>
						<div className="technician-sensor-page_modal-head">
							<button type="button" className="technician-sensor-page_modal-close" onClick={() => setSensorModalOpen(false)}>×</button>
						</div>

						<form onSubmit={handleSensorSubmit} className="technician-sensor-page_form">
							<div className="form-group">
								<label>Tên cảm biến</label>
								<input
									type="text"
									className="input"
									value={sensorForm.sensorName}
									onChange={(e) => handleSensorFormChange('sensorName', e.target.value)}
								/>
							</div>

							<div className="form-group">
								<label>Ao nuôi</label>
								<select
									className="input"
									value={sensorForm.pondId}
									onChange={(e) => handleSensorFormChange('pondId', e.target.value)}
								>
									<option value="">-- Chọn ao nuôi --</option>
									{ponds.map((pond) => (
										<option key={pond.pond_id} value={pond.pond_id}>{pond.pond_code} - {pond.pond_name}</option>
									))}
								</select>
							</div>

							<div className="form-group">
								<label>Loại cảm biến</label>
								<select
									className="input"
									value={sensorForm.sensorType}
									disabled={Boolean(sensorForm.sensorId)}
									onChange={(e) => handleSensorFormChange('sensorType', e.target.value)}
								>
									{SENSOR_TYPE_OPTIONS.map((option) => (
										<option key={option.value} value={option.value}>{option.label}</option>
									))}
								</select>
							</div>

							<div className="form-group">
								<label>Mã cảm biến</label>
								<input
									type="text"
									className="input"
									readOnly
									value={sensorForm.sensorId ? (allSensors.find((item) => String(item.sensor_id) === String(sensorForm.sensorId))?.serial_number || '') : getSerialPreview(ponds, sensorForm.pondId, sensorForm.sensorType)}
									placeholder="Mã tự sinh"
								/>
							</div>

							<div className="form-group">
								<label>Trạng thái cảm biến</label>
								<select
									className="input"
									value={sensorForm.status}
									onChange={(e) => handleSensorFormChange('status', e.target.value)}
								>
									<option value="ACTIVE">Hoạt động</option>
									<option value="INACTIVE">Tạm ngưng</option>
								</select>
							</div>

							<p className="technician-sensor-page_note">Mã cảm biến được hệ thống tự sinh và không thể chỉnh sửa.</p>

							<div className="technician-sensors_actions">
								<button type="submit" className="btn btn-primary" disabled={savingSensor}>
									{savingSensor ? 'Đang lưu...' : 'Lưu cảm biến'}
								</button>
								<button type="button" className="btn btn-secondary" onClick={() => setSensorModalOpen(false)}>
									Hủy
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{thresholdModalOpen && (
				<div className="modal technician-sensor-page_modal" onClick={() => setThresholdModalOpen(false)}>
					<div className="modal-content technician-sensors_modal technician-sensors_modal--wide" onClick={(event) => event.stopPropagation()}>
						<h3 className="technician-sensors_modal-title">Thiết lập ngưỡng cảnh báo</h3>
						<div className="technician-sensor-page_modal-head">
							<button type="button" className="technician-sensor-page_modal-close" onClick={() => setThresholdModalOpen(false)}>×</button>
						</div>

						<form onSubmit={handleThresholdSubmit} className="technician-sensor-page_form">
							<div className="form-group">
								<label>Chọn ao nuôi</label>
								<select
									className="input"
									value={thresholdPondId}
									onChange={async (e) => {
										const pondId = e.target.value
										setThresholdPondId(pondId)
										if (pondId) {
											setThresholdLoading(true)
											try {
												const [sensorsRes, thresholdsRes] = await Promise.all([
													sensorService.getSensorsByPondId(pondId),
													environmentLogService.getThresholdsByPond(pondId),
												])
												setThresholdSensors(sensorsRes?.data?.data || [])
												setThresholdForm(normalizeThresholdForm(thresholdsRes?.data?.data || {}))
											} finally {
												setThresholdLoading(false)
											}
										}
									}}
								>
									<option value="">-- Chọn ao --</option>
									{ponds.map((pond) => (
										<option key={pond.pond_id} value={pond.pond_id}>{pond.pond_code} - {pond.pond_name}</option>
									))}
								</select>
							</div>

							<div className="technician-sensor-page_threshold-sensors">
								<strong>Cảm biến trong ao</strong>
								<div className="technician-sensor-page_sensor-chips">
									{thresholdSensors.length > 0 ? thresholdSensors.map((sensor) => {
										const metricKey = getSensorTypeKey(sensor.sensor_type)
										return (
											<button
												key={sensor.sensor_id}
												type="button"
												className={`technician-sensor-page_sensor-chip ${activeThresholdMetric === metricKey ? 'is-selected' : ''}`}
												onClick={() => setActiveThresholdMetric(metricKey || '')}
											>
												{sensor.sensor_name || sensor.serial_number || `Cảm biến ${sensor.sensor_id}`}
											</button>
										)
									}) : <span className="technician-sensor-page_empty-inline">Chưa có cảm biến trong ao này.</span>}
								</div>
							</div>

							<div className="technician-sensor-page_threshold-grid">
								{METRIC_DEFINITIONS.map((metric) => (
									<article key={metric.code} id={`threshold-metric-${metric.code}`} className={`technician-sensor-page_threshold-card ${activeThresholdMetric === metric.code ? 'is-focused' : ''}`}>
										<div className="technician-sensor-page_threshold-head">
											<span>{metric.icon}</span>
											<div>
												<strong>{metric.label}</strong>
												<small>Thiết lập ngưỡng tối thiểu, tối đa và mức cảnh báo</small>
											</div>
										</div>

										<div className="technician-sensor-page_threshold-inputs">
											<label>
												Tối thiểu
												<input className="input" type="number" step="0.1" value={thresholdForm[metric.minKey] ?? ''} onChange={(e) => handleThresholdChange(metric.minKey, e.target.value)} />
											</label>
											<label>
												Tối đa
												<input className="input" type="number" step="0.1" value={thresholdForm[metric.maxKey] ?? ''} onChange={(e) => handleThresholdChange(metric.maxKey, e.target.value)} />
											</label>
										</div>
										<p className="technician-sensor-page_metric-range">
											Hiện tại: {formatNumber(selectedPondRealtime[metric.code]?.latest?.value, metric.precision)} {metric.unit}
										</p>
									</article>
								))}
							</div>

								<div className="form-group">
									<label>Mức cảnh báo</label>
									<select className="input" value={thresholdForm.alertLevel} onChange={(e) => handleThresholdChange('alertLevel', e.target.value)}>
										<option value="WARNING">Cảnh báo</option>
										<option value="DANGER">Nguy hiểm</option>
									</select>
								</div>

							<div className="form-group">
								<label>Ghi chú cấu hình</label>
								<textarea
									className="input"
									rows="4"
									value={thresholdForm.notes || ''}
									onChange={(e) => handleThresholdChange('notes', e.target.value)}
									placeholder="Ghi chú cho cấu hình ngưỡng"
								/>
							</div>

							<div className="technician-sensors_actions">
								<button type="submit" className="btn btn-primary" disabled={savingThresholds || thresholdLoading || !thresholdPondId}>
									{savingThresholds ? 'Đang lưu...' : 'Lưu ngưỡng'}
								</button>
								<button type="button" className="btn btn-secondary" onClick={() => setThresholdModalOpen(false)}>
									Hủy
								</button>
							</div>
						</form>

						<div className="technician-sensor-page_alert-list">
							<strong>Cảnh báo real-time</strong>
							{alertCards.map((alert) => (
								<article key={alert.key} className={`technician-sensor-page_alert technician-sensor-page_alert--${alert.severity}`}>
									<h4>{alert.title}</h4>
									<p>{alert.description}</p>
								</article>
							))}
						</div>
					</div>
				</div>
			)}
		</div>
	)
}

export default TechnicianSensors

