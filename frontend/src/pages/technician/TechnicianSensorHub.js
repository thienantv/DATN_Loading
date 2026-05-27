import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Line } from 'react-chartjs-2'
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
import { pondService, sensorService, environmentLogService } from '../../services/api'
import { showToast } from '../../utils/toast'
import { useAuth } from '../../context/AuthContext'
import { SENSOR_ORDER, getSensorProfile, getSensorStatus, getSensorStatusLabel, getSensorTypeKey } from '../../utils/sensorMetrics'
import '../../styles/dashboard.css'
import '../../styles/technician/technician-layout.css'
import '../../styles/technician/technician-sensors.css'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

const SENSOR_STATUS_OPTIONS = [
  { value: 'ALL', label: 'Tất cả trạng thái' },
  { value: 'ACTIVE', label: 'Hoạt động' },
  { value: 'INACTIVE', label: 'Ngoại tuyến' },
]

const SENSOR_TYPE_OPTIONS = [
  { value: 'temperature', label: 'Nhiệt độ nước' },
  { value: 'pH', label: 'Độ pH' },
  { value: 'dissolved oxygen', label: 'Oxy hòa tan (DO)' },
  { value: 'salinity', label: 'Độ mặn' },
  { value: 'turbidity', label: 'Độ đục' },
]

const SENSOR_COLORS = ['#2563eb', '#f97316', '#10b981', '#8b5cf6', '#ef4444', '#14b8a6', '#f59e0b', '#0f766e']

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

const normalizeType = (value) => String(value || '').trim().toLowerCase()

const normalizeStatus = (value) => {
  const status = String(value || '').trim().toUpperCase()
  if (['ACTIVE', 'HOAT_DONG', 'ONLINE'].includes(status)) return 'ACTIVE'
  if (['INACTIVE', 'OFFLINE', 'NGOAI_TUYEN'].includes(status)) return 'INACTIVE'
  return status || 'INACTIVE'
}

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

const toNumber = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const formatNumber = (value, precision = 2) => {
  if (value === null || value === undefined || value === '') return '-'
  const number = Number(value)
  if (Number.isNaN(number)) return String(value)
  return (Math.round(number * 100) / 100).toFixed(precision)
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

const formatLongDateTime = (raw) => {
  if (!raw) return '-'
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('vi-VN')
}

const getLastUpdatedLabel = (value) => {
  if (!value) return 'Chưa có dữ liệu'
  const diffMs = Date.now() - new Date(value).getTime()
  if (diffMs < 0) return 'Vừa xong'
  const sec = Math.floor(diffMs / 1000)
  if (sec < 60) return `${sec} giây trước`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min} phút trước`
  const hour = Math.floor(min / 60)
  if (hour < 24) return `${hour} giờ trước`
  const day = Math.floor(hour / 24)
  return `${day} ngày trước`
}

const getSensorBadge = (sensorType) => {
  switch (normalizeType(sensorType)) {
    case 'ph':
      return 'pH'
    case 'temperature':
      return '°C'
    case 'dissolved oxygen':
      return 'O2'
    case 'salinity':
      return 'Na'
    case 'water level':
    case 'turbidity':
      return 'NTU'
    default:
      return 'SN'
  }
}

const getDisplayValue = (sensor) => {
  const value = sensor.current_value
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '-'

  const num = Number(value)
  const type = normalizeType(sensor.sensor_type)
  if (type === 'temperature') return `${num.toFixed(1)}°C`
  if (type === 'dissolved oxygen') return `${num.toFixed(1)} mg/L`
  if (type === 'ph') return `${num.toFixed(1)} pH`
  if (type === 'salinity') return `${num.toFixed(1)} ppt`
  if (type === 'water level' || type === 'turbidity') return `${num.toFixed(1)} NTU`
  return `${num.toFixed(1)}`
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
    const alertValue = metric.current != null ? `${formatNumber(metric.current, metric.precision)} ${metric.unit}` : '--'
    const thresholdText = thresholdValue != null ? `${formatNumber(thresholdValue, metric.precision)} ${metric.unit}` : '--'

    return {
      key: metric.key,
      severity: metric.status,
      title: `${metric.label} ${direction}`,
      description: `Giá trị realtime hiện tại ${alertValue} so với ngưỡng ${thresholdText}.`,
    }
  })
}

const TechnicianSensorHub = () => {
  const { realtimeSensorData } = useAuth()
  const [ponds, setPonds] = useState([])
  const [sensors, setSensors] = useState([])
  const [selectedPondId, setSelectedPondId] = useState('')
  const [selectedPond, setSelectedPond] = useState(null)
  const [thresholds, setThresholds] = useState(() => getDefaultThresholds())
  const [pondSensors, setPondSensors] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [savingSensor, setSavingSensor] = useState(false)
  const [savingThresholds, setSavingThresholds] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [pondFilter, setPondFilter] = useState('ALL')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [pageSize, setPageSize] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [showThresholdModal, setShowThresholdModal] = useState(false)
  const [form, setForm] = useState({
    pondId: '',
    sensorName: '',
    sensorType: '',
    serialNumber: '',
    status: 'ACTIVE',
  })
  const [editingId, setEditingId] = useState(null)
  const [sensorSearchTerm, setSensorSearchTerm] = useState('')
  const [sensorTypeFilter, setSensorTypeFilter] = useState('ALL')
  const selectedPondIdRef = useRef('')

  const loadPondMonitoringData = useCallback(async (pond, options = {}) => {
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
  }, [])

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [sensorRes, pondRes] = await Promise.all([
        sensorService.getAllSensors(),
        pondService.getAllPonds(),
      ])

      const nextSensors = sensorRes?.data?.data || []
      const nextPonds = pondRes?.data?.data || []
      setSensors(nextSensors)
      setPonds(nextPonds)

      const activePond = nextPonds.find((item) => String(item.pond_id) === String(selectedPondIdRef.current)) || nextPonds[0] || null
      if (activePond) {
        await loadPondMonitoringData(activePond, { silent: true })
      } else {
        setSelectedPond(null)
        setSelectedPondId('')
        setThresholds(getDefaultThresholds())
        setPondSensors([])
      }
    } catch (err) {
      showToast({ title: err?.response?.data?.message || 'Không tải được dữ liệu cảm biến', type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [loadPondMonitoringData])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    selectedPondIdRef.current = selectedPondId
  }, [selectedPondId])

  const pondOptions = useMemo(() => ponds, [ponds])

  useEffect(() => {
    if (pondOptions.length > 0 && !selectedPondId) {
      loadPondMonitoringData(pondOptions[0], { silent: true })
    }
  }, [loadPondMonitoringData, pondOptions, selectedPondId])

  const stats = useMemo(() => {
    const total = sensors.length
    const active = sensors.filter((item) => normalizeStatus(item.status) === 'ACTIVE').length
    const inactive = sensors.filter((item) => normalizeStatus(item.status) === 'INACTIVE').length
    const monitoredPonds = pondOptions.length
    return { total, active, inactive, monitoredPonds }
  }, [pondOptions, sensors])

  const selectedPondRealtimeData = useMemo(() => realtimeSensorData?.[selectedPondId] || {}, [realtimeSensorData, selectedPondId])

  const latestRealtimeSensors = useMemo(() => {
    return pondSensors.map((sensor, index) => {
      const metricKey = getSensorTypeKey(sensor.sensor_type)
      const directSource = selectedPondRealtimeData?.[sensor.sensor_type]
      const byMetricKey = selectedPondRealtimeData?.[metricKey]
      const source = directSource || byMetricKey || null
      const readings = source?.readings || []
      const latest = readings.length > 0 ? readings[readings.length - 1] : source ? {
        value: source.value,
        recorded_at: source.updatedAt || source.lastUpdated || source.recorded_at || source.updated_at || null,
      } : null
      const profile = getSensorProfile(sensor.sensor_type)
      const status = getSensorStatus(latest?.value, sensor.sensor_type)

      return {
        sensor,
        profile,
        readings,
        latest,
        status,
        color: SENSOR_COLORS[index % SENSOR_COLORS.length],
      }
    })
  }, [pondSensors, selectedPondRealtimeData])

  const liveReadings = useMemo(() => {
    const readingsMap = {}

    latestRealtimeSensors.forEach((item) => {
      const metricCode = getSensorTypeKey(item.sensor.sensor_type)
      if (!metricCode || !metricDefinitions.some((metric) => metric.code === metricCode)) return

      if (item.latest) {
        readingsMap[metricCode] = {
          current_value: item.latest.value,
          last_updated: item.latest.recorded_at,
          readings: item.readings,
          sensorId: item.sensor.sensor_id,
        }
      }
    })

    return readingsMap
  }, [latestRealtimeSensors])

  const metricCards = useMemo(() => buildMetricCards(liveReadings, thresholds), [liveReadings, thresholds])
  const alertItems = useMemo(() => buildAlertItems(metricCards), [metricCards])
  const lastUpdated = useMemo(() => {
    return metricCards.reduce((latest, metric) => {
      if (!metric.updatedAt) return latest
      if (!latest) return metric.updatedAt
      return new Date(metric.updatedAt).getTime() > new Date(latest).getTime() ? metric.updatedAt : latest
    }, null)
  }, [metricCards])
  const liveSensorRows = useMemo(() => {
    return metricCards
      .filter((metric) => metric.current != null)
      .sort((a, b) => metricDefinitions.findIndex((item) => item.code === a.code) - metricDefinitions.findIndex((item) => item.code === b.code))
  }, [metricCards])

  const currentStatus = useMemo(() => {
    if (metricCards.some((metric) => metric.status === 'low' || metric.status === 'high')) return 'Cần chú ý'
    if (metricCards.some((metric) => metric.current != null)) return 'Bình thường'
    return 'Chưa có dữ liệu'
  }, [metricCards])

  const realtimeWarningCount = useMemo(
    () => metricCards.filter((metric) => metric.status === 'low' || metric.status === 'high').length,
    [metricCards]
  )

  const realtimePondMetrics = useMemo(() => {
    return SENSOR_ORDER.map((key, index) => {
      const profile = getSensorProfile(key)
      const stat = metricCards.find((metric) => metric.code === key)
      const status = stat?.status || 'no-data'
      return {
        key,
        profile,
        stat,
        status,
        color: SENSOR_COLORS[index % SENSOR_COLORS.length],
      }
    })
  }, [metricCards])

  const realtimeChartData = useMemo(() => {
    const datasets = []
    const isoSet = new Set()

    latestRealtimeSensors.forEach((entry) => {
      ;(entry.readings || []).forEach((reading) => {
        if (reading?.recorded_at) {
          isoSet.add(new Date(reading.recorded_at).toISOString())
        }
      })
    })

    const isoLabels = Array.from(isoSet).sort()
    const labels = isoLabels.map((iso) => new Intl.DateTimeFormat('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Ho_Chi_Minh',
    }).format(new Date(iso)))

    latestRealtimeSensors.forEach((entry) => {
      const map = new Map()
      ;(entry.readings || []).forEach((reading) => {
        if (reading?.recorded_at) {
          map.set(new Date(reading.recorded_at).toISOString(), Number(reading.value))
        }
      })

      datasets.push({
        label: entry.profile?.label || entry.sensor.sensor_name,
        data: isoLabels.map((iso) => (map.has(iso) ? map.get(iso) : null)),
        borderColor: entry.color,
        backgroundColor: `${entry.color}26`,
        tension: 0.35,
        fill: true,
        pointRadius: 2,
      })
    })

    return { labels, datasets }
  }, [latestRealtimeSensors])

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          usePointStyle: true,
          boxWidth: 8,
        },
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(148, 163, 184, 0.22)' },
      },
      y: {
        beginAtZero: false,
        ticks: { callback: (value) => String(Math.round(value * 100) / 100) },
        grid: { color: 'rgba(148, 163, 184, 0.22)' },
      },
    },
  }

  const filteredSensors = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()
    return sensors.filter((sensor) => {
      const matchSearch =
        !normalizedSearch ||
        String(sensor.sensor_name || '').toLowerCase().includes(normalizedSearch) ||
        String(sensor.serial_number || '').toLowerCase().includes(normalizedSearch) ||
        String(sensor.sensor_id || '').toLowerCase().includes(normalizedSearch) ||
        String(sensor.pond_name || '').toLowerCase().includes(normalizedSearch)

      const sensorPondId = String(sensor.pond_id || '')
      const pondMatched = pondFilter === 'ALL' || String(pondFilter) === sensorPondId

      const sensorType = normalizeType(sensor.sensor_type)
      const typeMatched = typeFilter === 'ALL' || sensorType === normalizeType(typeFilter)

      const statusMatched = statusFilter === 'ALL' || normalizeStatus(sensor.status) === statusFilter

      return matchSearch && pondMatched && typeMatched && statusMatched
    })
  }, [pondFilter, searchTerm, sensors, statusFilter, typeFilter])

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

  const getPondName = (pondId) => {
    if (!pondId) return '-'
    const found = pondOptions.find((pond) => String(pond.pond_id) === String(pondId))
    return found ? `${found.pond_code || ''} ${found.pond_name || ''}`.trim() : '-'
  }

  const openCreateModal = () => {
    setForm({
      pondId: '',
      sensorName: '',
      sensorType: '',
      serialNumber: '',
      status: 'ACTIVE',
    })
    setEditingId(null)
    setShowModal(true)
  }

  const openThresholdModal = () => {
    setShowThresholdModal(true)
  }

  const openEditModal = (sensor) => {
    setEditingId(sensor.sensor_id)
    setForm({
      pondId: sensor.pond_id,
      sensorName: sensor.sensor_name,
      sensorType: sensor.sensor_type,
      serialNumber: sensor.serial_number || '',
      status: sensor.status || 'ACTIVE',
    })
    setShowModal(true)
  }

  const handleChange = (field, value) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value }

      if (field === 'pondId' || field === 'sensorType') {
        const pond = pondOptions.find((item) => String(item.pond_id) === String(next.pondId))
        const pondCode = pond ? pond.pond_code : null
        const typeMap = {
          pH: 'PH',
          temperature: 'TEMP',
          'dissolved oxygen': 'DO',
          salinity: 'SAL',
          turbidity: 'TURB',
          'water level': 'TURB',
        }

        const typeCode = typeMap[next.sensorType]
        if (typeCode && pondCode) {
          next.serialNumber = `${typeCode}-${pondCode}`
        } else if (typeCode && next.pondId) {
          next.serialNumber = `${typeCode}-${next.pondId}`
        }
      }

      return next
    })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!String(form.pondId || '').trim()) {
      showToast({ title: 'Vui lòng chọn ao nuôi', type: 'error' })
      return
    }
    if (!String(form.sensorName || '').trim()) {
      showToast({ title: 'Tên cảm biến không được để trống', type: 'error' })
      return
    }
    if (!String(form.sensorType || '').trim()) {
      showToast({ title: 'Vui lòng chọn loại cảm biến', type: 'error' })
      return
    }

    try {
      setSavingSensor(true)
      const wasEditing = !!editingId

      if (wasEditing) {
        await sensorService.updateSensor(editingId, {
          pond_id: Number(form.pondId),
          sensor_name: String(form.sensorName || '').trim(),
          status: form.status,
        })
      } else {
        await sensorService.createSensor({
          pond_id: Number(form.pondId),
          sensor_name: String(form.sensorName || '').trim(),
          sensor_type: String(form.sensorType || '').trim(),
          serial_number: String(form.serialNumber || '').trim() || null,
          status: form.status,
        })
      }

      setShowModal(false)
      setEditingId(null)
      setForm({
        pondId: '',
        sensorName: '',
        sensorType: '',
        serialNumber: '',
        status: 'ACTIVE',
      })
      await fetchData()
      showToast({ title: wasEditing ? 'Cập nhật cảm biến thành công' : 'Thêm cảm biến thành công', type: 'success' })
    } catch (err) {
      showToast({ title: err?.response?.data?.message || 'Không tạo được cảm biến', type: 'error' })
    } finally {
      setSavingSensor(false)
    }
  }

  const handleDelete = async (sensorId) => {
    if (!window.confirm('Bạn có chắc muốn xóa cảm biến này?')) return
    try {
      setSavingSensor(true)
      await sensorService.deleteSensor(sensorId)
      await fetchData()
      showToast({ title: 'Đã xóa cảm biến', type: 'success' })
    } catch (err) {
      showToast({ title: err?.response?.data?.message || 'Không xóa được cảm biến', type: 'error' })
    } finally {
      setSavingSensor(false)
    }
  }

  const handleThresholdChange = (field, value) => {
    setThresholds((prev) => ({
      ...prev,
      [field]: value === '' ? '' : Number(value),
    }))
  }

  const handlePondChange = async (pondId) => {
    const pond = pondOptions.find((item) => String(item.pond_id) === String(pondId))
    if (pond) {
      await loadPondMonitoringData(pond)
    }
  }

  const handleThresholdSubmit = async (event) => {
    event.preventDefault()
    if (!selectedPondId) {
      showToast({ title: 'Vui lòng chọn ao', type: 'error' })
      return
    }

    const validators = [
      ['pH', thresholds.minPh, thresholds.maxPh],
      ['Nhiệt độ', thresholds.minTemp, thresholds.maxTemp],
      ['Độ mặn', thresholds.minSalinity, thresholds.maxSalinity],
      ['Oxy', thresholds.minOxygen, thresholds.maxOxygen],
      ['Độ đục', thresholds.minTurbidity, thresholds.maxTurbidity],
    ]

    for (const [label, minValue, maxValue] of validators) {
      if (hasValue(minValue) && hasValue(maxValue) && Number(minValue) > Number(maxValue)) {
        showToast({ title: `${label}: Min phải nhỏ hơn Max`, type: 'error' })
        return
      }
    }

    try {
      setSavingThresholds(true)
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
      await loadPondMonitoringData(selectedPond || pondOptions.find((item) => String(item.pond_id) === String(selectedPondId)), { silent: true })
      showToast({ title: 'Đã lưu cấu hình ngưỡng thành công', type: 'success' })
    } catch (err) {
      showToast({ title: err?.response?.data?.message || 'Không lưu được ngưỡng cảnh báo', type: 'error' })
    } finally {
      setSavingThresholds(false)
    }
  }

  const filteredRealtimeRows = useMemo(() => {
    return latestRealtimeSensors
      .filter((item) => {
        const text = sensorSearchTerm.trim().toLowerCase()
        const typeKey = getSensorTypeKey(item.sensor.sensor_type)
        const matchText =
          !text ||
          String(item.sensor.sensor_name || '').toLowerCase().includes(text) ||
          String(item.sensor.serial_number || '').toLowerCase().includes(text)
        const matchType = sensorTypeFilter === 'ALL' || sensorTypeFilter === typeKey
        return matchText && matchType
      })
      .sort((a, b) => {
        const aTime = a.latest?.recorded_at ? new Date(a.latest.recorded_at).getTime() : 0
        const bTime = b.latest?.recorded_at ? new Date(b.latest.recorded_at).getTime() : 0
        return bTime - aTime
      })
  }, [latestRealtimeSensors, sensorSearchTerm, sensorTypeFilter])

  const handleExportCsv = () => {
    if (filteredRealtimeRows.length === 0) return
    const headers = ['Thoi gian', 'Cam bien', 'Ao nuoi', 'Gia tri', 'Don vi', 'Trang thai']
    const rows = filteredRealtimeRows.map((item) => [
      formatLongDateTime(item.latest?.recorded_at),
      item.sensor.sensor_name || item.sensor.serial_number || `Sensor ${item.sensor.sensor_id}`,
      `${selectedPond?.pond_code || ''} ${selectedPond?.pond_name || ''}`.trim(),
      formatNumber(item.latest?.value),
      item.profile?.unit || '-',
      getSensorStatusLabel(item.status).replace('✓ ', '').replace('⚠️ ', ''),
    ])
    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell || '').replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `sensor-realtime-${selectedPondId || 'all'}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  if (loading) {
    return (
      <div className="dashboard technician-page-shell technician-sensor-hub">
        <div className="flex-center technician-sensors_loading-container">
          <div className="spinner" />
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard technician-page-shell technician-sensor-hub">
      <div className="technician-sensors_title-block technician-sensors_title-row">
        <div>
          <h2>Quản lý cảm biến</h2>
          <p>Quản lý cảm biến, thiết lập ngưỡng cảnh báo và theo dõi realtime trên cùng một màn hình</p>
        </div>
        <div className="technician-sensors_header-actions">
          <button className="btn btn-primary technician-sensors_create-btn" onClick={openCreateModal}>
            ＋ Thêm cảm biến
          </button>
          <button className="btn btn-secondary technician-sensors_create-btn technician-sensors_create-btn--alt" onClick={openThresholdModal}>
            ⚙ Thiết lập ngưỡng
          </button>
        </div>
      </div>

      <section className="technician-sensors_overview-grid">
        <article className="technician-sensors_overview-card technician-sensors_overview-card--total">
          <span>Tổng cảm biến</span>
          <strong>{stats.total}</strong>
        </article>
        <article className="technician-sensors_overview-card technician-sensors_overview-card--active">
          <span>Cảm biến hoạt động</span>
          <strong>{stats.active}</strong>
        </article>
        <article className="technician-sensors_overview-card technician-sensors_overview-card--warning">
          <span>Cảm biến ngoại tuyến</span>
          <strong>{stats.inactive}</strong>
        </article>
        <article className="technician-sensors_overview-card technician-sensors_overview-card--ponds">
          <span>Ao đang giám sát</span>
          <strong>{stats.monitoredPonds}</strong>
        </article>
      </section>

      <section id="technician-sensor-management" className="technician-sensors_panel">
        <div className="technician-sensors_section-head">
          <div>
            <h3>Quản lý cảm biến</h3>
            <p>Danh sách cảm biến dưới dạng bảng, có tìm kiếm, lọc và thao tác CRUD.</p>
          </div>
          <button className="btn btn-primary technician-sensors_create-btn" onClick={openCreateModal}>
            + Thêm cảm biến
          </button>
        </div>

        <div className="technician-sensors_toolbar">
          <div className="technician-sensors_search-wrap">
            <span className="technician-sensors_search-icon">⌕</span>
            <input
              type="text"
              value={searchTerm}
              placeholder="Tìm kiếm theo tên cảm biến hoặc tên ao..."
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setCurrentPage(1)
              }}
            />
          </div>

          <select
            value={pondFilter}
            onChange={(e) => {
              setPondFilter(e.target.value)
              setCurrentPage(1)
            }}
          >
            <option value="ALL">Tất cả ao</option>
            {pondOptions.map((pond) => (
              <option key={pond.pond_id} value={pond.pond_id}>
                {pond.pond_code} - {pond.pond_name}
              </option>
            ))}
          </select>

          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value)
              setCurrentPage(1)
            }}
          >
            <option value="ALL">Tất cả loại cảm biến</option>
            {SENSOR_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              setCurrentPage(1)
            }}
          >
            {SENSOR_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="table-wrapper">
          <table className="technician-sensors_table">
            <thead>
              <tr>
                <th>Avatar</th>
                <th>Tên cảm biến</th>
                <th>Loại cảm biến</th>
                <th>Ao nuôi</th>
                <th>Giá trị hiện tại</th>
                <th>Trạng thái</th>
                <th>Lần cập nhật cuối</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {paginatedSensors.length === 0 ? (
                <tr>
                  <td colSpan="8" className="technician-sensors_empty-row">Không có cảm biến phù hợp bộ lọc</td>
                </tr>
              ) : (
                paginatedSensors.map((sensor) => (
                  <tr key={sensor.sensor_id}>
                    <td>
                      <span className="technician-sensors_avatar-chip">{getSensorBadge(sensor.sensor_type)}</span>
                    </td>
                    <td>{sensor.sensor_name || '-'}</td>
                    <td>{getSensorProfile(sensor.sensor_type)?.label || sensor.sensor_type || '-'}</td>
                    <td>{getPondName(sensor.pond_id)}</td>
                    <td className="technician-sensors_value-cell">{getDisplayValue(sensor)}</td>
                    <td>
                      <span className={`technician-sensors_status technician-sensors_status--${normalizeStatus(sensor.status).toLowerCase()}`}>
                        {normalizeStatus(sensor.status) === 'ACTIVE' ? 'Hoạt động' : 'Ngoại tuyến'}
                      </span>
                    </td>
                    <td>{formatDateTime(sensor.last_updated)}</td>
                    <td>
                      <div className="technician-sensors_table-actions">
                        <button className="btn btn-sm btn-secondary" onClick={() => openEditModal(sensor)} title="Sửa">
                          ✎
                        </button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(sensor.sensor_id)} title="Xóa">
                          🗑
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="technician-sensors_pagination">
          <div className="technician-sensors_pagination-left">
            <label htmlFor="technicianSensorPageSize">Số hàng trên trang:</label>
            <select
              id="technicianSensorPageSize"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value))
                setCurrentPage(1)
              }}
            >
              {[10, 20, 50].map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
            <span>{filteredSensors.length === 0 ? 0 : startIndex + 1}-{endIndex} / {filteredSensors.length}</span>
          </div>

          <div className="technician-sensors_pagination-right">
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={safePage <= 1}
            >
              ‹
            </button>
            <span className="technician-sensors_page-pill">{safePage}</span>
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
      </section>

      <section id="technician-sensor-thresholds" className="technician-thresholds-page">
        <div className="technician-thresholds_hero">
          <div>
            <h1>Thiết lập ngưỡng môi trường</h1>
            <p>Thiết lập ngưỡng an toàn theo ao đang chọn và theo dõi các chỉ số realtime ngay bên dưới.</p>
          </div>
          <button
            type="submit"
            form="technician-threshold-form"
            className="technician-thresholds_save-btn technician-thresholds_save-btn--inline"
            disabled={savingThresholds || !selectedPondId}
          >
            {savingThresholds ? 'Đang lưu...' : 'Lưu cấu hình'}
          </button>
        </div>

        <div className="technician-thresholds_toolbar">
          <div className="technician-thresholds_toolbar-main">
            <div className="technician-thresholds_selector">
              <label htmlFor="pond-select">Chọn ao nuôi</label>
              <select id="pond-select" value={selectedPondId} onChange={(e) => handlePondChange(e.target.value)}>
                {pondOptions.map((pond) => (
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
        </div>

        <div className="technician-thresholds_grid">
          <form id="technician-threshold-form" className="technician-thresholds_main" onSubmit={handleThresholdSubmit}>
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
                          {formatNumber(metric.current, metric.precision)} <span>{metric.unit}</span>
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
                      <span>{metric.minValue != null ? formatNumber(metric.minValue, metric.precision) : metric.defaultMin} {metric.unit}</span>
                      <span>{metric.maxValue != null ? formatNumber(metric.maxValue, metric.precision) : metric.defaultMax} {metric.unit}</span>
                    </div>

                    <div className="threshold-card_inputs">
                      <div className="threshold-card_field">
                        <label htmlFor={`min-${metric.key}`}>Ngưỡng tối thiểu</label>
                        <div className="threshold-card_input-row">
                          <input
                            id={`min-${metric.key}`}
                            type="number"
                            min="0"
                            step="0.1"
                            value={thresholds[metric.minKey]}
                            onChange={(e) => handleThresholdChange(metric.minKey, e.target.value)}
                            placeholder="Tối thiểu"
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
                            min="0"
                            step="0.1"
                            value={thresholds[metric.maxKey]}
                            onChange={(e) => handleThresholdChange(metric.maxKey, e.target.value)}
                            placeholder="Tối đa"
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
                          <td>{metric.current != null ? `${formatNumber(metric.current, metric.precision)} ${metric.unit}` : '--'}</td>
                          <td>{metric.label}</td>
                          <td>{metric.current != null ? `${formatNumber(metric.current, metric.precision)} ${metric.unit}` : '--'}</td>
                          <td>
                            {metric.minValue != null || metric.maxValue != null
                              ? `${metric.minValue != null ? formatNumber(metric.minValue, metric.precision) : '--'} - ${metric.maxValue != null ? formatNumber(metric.maxValue, metric.precision) : '--'} ${metric.unit}`
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
                  <div>
                    <span>Cảm biến</span>
                    <strong>{pondSensors.length}</strong>
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
      </section>

      <section id="technician-sensor-realtime" className="staff-sensor-page">
        <div className="staff-sensor-header">
          <h1>Dữ liệu cảm biến real-time</h1>
          <p>Theo dõi dữ liệu cảm biến ao tôm theo thời gian thực</p>
        </div>

        <div className="realtime-kpi-grid">
          <div className="realtime-kpi-card">
            <div className="realtime-kpi-icon">◉</div>
            <div>
              <p>Tổng cảm biến hoạt động</p>
              <h3>{latestRealtimeSensors.filter((item) => !!item.latest).length}</h3>
            </div>
          </div>
          <div className="realtime-kpi-card">
            <div className="realtime-kpi-icon">◎</div>
            <div>
              <p>Ao nuôi giám sát</p>
              <h3>{pondOptions.length}</h3>
            </div>
          </div>
          <div className="realtime-kpi-card">
            <div className="realtime-kpi-icon">⚠</div>
            <div>
              <p>Cảnh báo hiện tại</p>
              <h3>{realtimeWarningCount}</h3>
            </div>
          </div>
          <div className="realtime-kpi-card">
            <div className="realtime-kpi-icon">◷</div>
            <div>
              <p>Cập nhật gần nhất</p>
              <h3>{getLastUpdatedLabel(lastUpdated)}</h3>
            </div>
          </div>
        </div>

        <div className="staff-sensor-controls">
          <label>Chọn ao</label>
          <select value={selectedPondId} onChange={(e) => handlePondChange(e.target.value)}>
            <option value="">-- Chọn ao nuôi --</option>
            {pondOptions.map((pond) => (
              <option key={pond.pond_id} value={pond.pond_id}>
                {pond.pond_code} - {pond.pond_name}
              </option>
            ))}
          </select>
          {selectedPond && (
            <div className="staff-sensor-timestamp">
              Đang xem: {selectedPond.pond_code} - {selectedPond.pond_name}
            </div>
          )}
        </div>

        {pondSensors.length === 0 ? (
          <div className="staff-sensor-card">
            <p className="staff-sensor-empty">Ao nuôi này chưa có cảm biến được thiết lập.</p>
          </div>
        ) : (
          <>
            <div className="sensor-strip-grid">
              {realtimePondMetrics.map((metric) => {
                const status = metric.status
                const stat = metric.stat
                return (
                  <div key={metric.key} className={`sensor-strip-card status-${status}`}>
                    <div className="sensor-strip-head">
                      <span className="sensor-strip-icon">{metric.profile.icon}</span>
                      <span className="sensor-strip-type">{(metric.profile.shortLabel || metric.profile.label || metric.key).toUpperCase()}</span>
                    </div>
                    <div className="sensor-strip-value">
                      {stat && stat.current != null ? formatNumber(stat.current, metric.profile.precision || 1) : '-'}
                      {metric.profile.unit && <span>{metric.profile.unit}</span>}
                    </div>
                    <div className="sensor-strip-meta">
                      <span>{stat ? getLastUpdatedLabel(stat.updatedAt) : 'Chưa có dữ liệu'}</span>
                      <span className={`sensor-strip-status status-${status}`}>{getSensorStatusLabel(status).replace('✓ ', '').replace('⚠️ ', '')}</span>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="staff-sensor-card chart-card">
              <div className="chart-card-header">
                <h3>Dữ liệu cảm biến gần đây</h3>
              </div>

              {realtimeChartData.datasets.length > 0 ? (
                <div className="chart-canvas-wrap">
                  <Line data={realtimeChartData} options={chartOptions} />
                </div>
              ) : (
                <div className="staff-sensor-chart-empty">Chưa có dữ liệu realtime để hiển thị</div>
              )}
            </div>

            <div className="staff-sensor-card">
              <div className="sensor-table-toolbar">
                <div className="sensor-table-search">
                  <span>⌕</span>
                  <input
                    type="text"
                    placeholder="Tìm theo tên cảm biến..."
                    value={sensorSearchTerm}
                    onChange={(e) => setSensorSearchTerm(e.target.value)}
                  />
                </div>
                <select value={sensorTypeFilter} onChange={(e) => setSensorTypeFilter(e.target.value)}>
                  <option value="ALL">Tất cả loại cảm biến</option>
                  {SENSOR_ORDER.map((type) => {
                    const profile = getSensorProfile(type)
                    return (
                      <option key={type} value={type}>
                        {profile?.label || type}
                      </option>
                    )
                  })}
                </select>
                <button type="button" className="btn btn-secondary" onClick={handleExportCsv}>
                  ⤓ Tải CSV
                </button>
              </div>

              <div className="staff-sensor-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Thời gian</th>
                      <th>Tên cảm biến</th>
                      <th>Ao nuôi</th>
                      <th>Giá trị</th>
                      <th>Đơn vị</th>
                      <th>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRealtimeRows.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="staff-sensor-empty">Không có dữ liệu phù hợp với bộ lọc</td>
                      </tr>
                    ) : (
                      filteredRealtimeRows.map((item) => (
                        <tr key={item.sensor.sensor_id}>
                          <td>{formatLongDateTime(item.latest?.recorded_at)}</td>
                          <td>{item.sensor.sensor_name || item.sensor.serial_number || `Cảm biến ${item.sensor.sensor_id}`}</td>
                          <td>{selectedPond ? `${selectedPond.pond_code} - ${selectedPond.pond_name}` : '-'}</td>
                          <td>{formatNumber(item.latest?.value)}</td>
                          <td>{item.profile?.unit || '-'}</td>
                          <td>
                            <span className={`badge status-${item.status}`}>
                              {getSensorStatusLabel(item.status).replace('✓ ', '').replace('⚠️ ', '')}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </section>

      {showModal && (
        <div className="modal" onClick={() => setShowModal(false)}>
          <div className="modal-content technician-sensors_modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="technician-sensors_modal-title">{editingId ? 'Sửa cảm biến' : 'Thêm cảm biến mới'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Ao nuôi</label>
                <select className="input" value={form.pondId} onChange={(e) => handleChange('pondId', e.target.value)} required>
                  <option value="">-- Chọn ao --</option>
                  {pondOptions.map((pond) => (
                    <option key={pond.pond_id} value={pond.pond_id}>
                      {pond.pond_code} - {pond.pond_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Tên cảm biến</label>
                <input className="input" value={form.sensorName} onChange={(e) => handleChange('sensorName', e.target.value)} required />
              </div>

              <div className="technician-sensors_form-grid">
                <div className="form-group">
                  <label>Loại cảm biến</label>
                  <select className="input" value={form.sensorType} onChange={(e) => handleChange('sensorType', e.target.value)} required disabled={!!editingId}>
                    <option value="">-- Chọn loại --</option>
                    {SENSOR_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Mã cảm biến</label>
                  <input className="input" value={form.serialNumber} readOnly placeholder="Sẽ tự điền khi chọn ao và loại" />
                </div>
              </div>

              <div className="form-group">
                <label>Trạng thái</label>
                <select className="input" value={form.status} onChange={(e) => handleChange('status', e.target.value)}>
                  <option value="ACTIVE">Hoạt động</option>
                  <option value="INACTIVE">Ngoại tuyến</option>
                </select>
              </div>

              {editingId && (
                <div className="technician-sensors_edit-note">
                  Loại cảm biến và mã cảm biến chỉ được thiết lập khi tạo mới.
                </div>
              )}

              <div className="technician-sensors_form-buttons">
                <button type="submit" className="btn btn-primary" disabled={savingSensor}>
                  💾 {savingSensor ? 'Đang lưu' : 'Lưu cảm biến'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  ❌ Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default TechnicianSensorHub
