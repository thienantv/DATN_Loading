const SENSOR_TYPE_ALIASES = {
  ph: 'PH',
  pH: 'PH',
  temp: 'TEMP',
  temperature: 'TEMP',
  'nhiệt độ': 'TEMP',
  'nhiệt_độ': 'TEMP',
  do: 'DO',
  'dissolved oxygen': 'DO',
  dissolved_oxygen: 'DO',
  'oxy hoà tan': 'DO',
  'oxy hòa tan': 'DO',
  sal: 'SAL',
  salinity: 'SAL',
  'độ mặn': 'SAL',
  'độ_mặn': 'SAL',
  level: 'LEVEL',
  'water level': 'LEVEL',
  water_level: 'LEVEL',
  'mực nước': 'LEVEL',
  'mực_nước': 'LEVEL',
}

const SENSOR_PROFILES = {
  PH: {
    label: 'pH',
    unit: '',
    target: 7.4,
    normalRange: [6.8, 8.5],
    min: 6.2,
    max: 9,
    precision: 2,
    step: 0.08,
    waveStrength: 0.04,
  },
  TEMP: {
    label: 'Nhiệt độ',
    unit: '°C',
    target: 29,
    normalRange: [26, 32],
    min: 24,
    max: 34,
    precision: 2,
    step: 0.18,
    waveStrength: 0.08,
  },
  DO: {
    label: 'Oxy hòa tan',
    unit: 'mg/l',
    target: 6.1,
    normalRange: [4.5, 8],
    min: 3.5,
    max: 8.8,
    precision: 2,
    step: 0.16,
    waveStrength: 0.06,
  },
  SAL: {
    label: 'Độ mặn',
    unit: 'ppt',
    target: 18,
    normalRange: [12, 25],
    min: 8,
    max: 30,
    precision: 2,
    step: 0.5,
    waveStrength: 0.14,
  },
  LEVEL: {
    label: 'Mực nước',
    unit: 'cm',
    target: 120,
    normalRange: [90, 150],
    min: 80,
    max: 160,
    precision: 1,
    step: 2.5,
    waveStrength: 0.9,
  },
}

const randomInRange = (min, max) => min + Math.random() * (max - min)

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const normalizeSensorTypeCode = (sensorType) => {
  const normalizedType = (sensorType || '').toString().trim().toLowerCase()

  for (const [key, value] of Object.entries(SENSOR_TYPE_ALIASES)) {
    if (key.toLowerCase() === normalizedType) {
      return value
    }
  }

  return null
}

const getSensorProfile = (sensorTypeCode) => SENSOR_PROFILES[sensorTypeCode] || null

const generateRealtimeSensorValue = (sensorType, previousValue, sensorId, timestamp = Date.now()) => {
  const typeCode = normalizeSensorTypeCode(sensorType)
  const profile = getSensorProfile(typeCode)

  if (!profile) return null

  const currentValue = Number(previousValue)
  const anchor = Number.isFinite(currentValue) ? currentValue : profile.target
  const meanReversion = (profile.target - anchor) * 0.12
  const wave = Math.sin(timestamp / 300000 + sensorId * 0.7) * profile.waveStrength
  const drift = Math.sin(timestamp / 900000 + sensorId * 0.35) * profile.step * 0.25
  const noise = randomInRange(-profile.step, profile.step)

  let value = anchor + meanReversion + wave + drift + noise

  if (Math.random() < 0.04) {
    value += randomInRange(-profile.step * 1.5, profile.step * 1.5)
  }

  value = clamp(value, profile.min, profile.max)

  return Number(value.toFixed(profile.precision))
}

module.exports = {
  getSensorTypeCode: normalizeSensorTypeCode,
  getSensorProfile,
  generateRealtimeSensorValue,
}
