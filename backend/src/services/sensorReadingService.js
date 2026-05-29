const db = require('../config/database')
const logger = require('../utils/logger')
const { generateRealtimeSensorValue, getSensorTypeCode, getSensorProfile } = require('../utils/sensorMetrics')

let isRunning = false

const fetchActiveSensorsWithLatestReading = async (client) => {
  const result = await client.query(`
    SELECT
      s.sensor_id,
      s.pond_id,
      s.sensor_type,
      s.status,
      lr.value AS previous_value
    FROM sensors s
    LEFT JOIN LATERAL (
      SELECT sr.value
      FROM sensor_readings sr
      WHERE sr.sensor_id = s.sensor_id
      ORDER BY sr.recorded_at DESC, sr.reading_id DESC
      LIMIT 1
    ) lr ON TRUE
    WHERE UPPER(COALESCE(s.status, 'ACTIVE')) = 'ACTIVE'
    ORDER BY s.pond_id ASC, s.sensor_id ASC
  `)

  return result.rows || []
}

const generateFakeSensorReadings = async ({ timestamp = Date.now() } = {}) => {
  if (isRunning) {
    logger.warn('Sensor reading generator is still running, skipping this tick')
    return { insertedCount: 0, skippedCount: 0, sensorCount: 0, skippedByType: 0, skippedBecauseBusy: true }
  }

  isRunning = true
  const client = await db.connect()

  try {
    const sensors = await fetchActiveSensorsWithLatestReading(client)
    if (sensors.length === 0) {
      logger.info('No active sensors found for fake reading generation')
      return { insertedCount: 0, skippedCount: 0, sensorCount: 0, skippedByType: 0, skippedBecauseBusy: false }
    }

    let insertedCount = 0
    let skippedCount = 0
    let skippedByType = 0

    await client.query('BEGIN')

    for (const sensor of sensors) {
      const typeCode = getSensorTypeCode(sensor.sensor_type)
      const profile = getSensorProfile(typeCode)

      if (!profile) {
        skippedByType += 1
        continue
      }

      const generatedValue = generateRealtimeSensorValue(
        sensor.sensor_type,
        sensor.previous_value,
        sensor.sensor_id,
        timestamp
      )

      if (generatedValue === null || generatedValue === undefined || Number.isNaN(Number(generatedValue))) {
        skippedCount += 1
        continue
      }

      await client.query(
        `
          INSERT INTO sensor_readings (sensor_id, recorded_at, value)
          VALUES ($1, to_timestamp($2 / 1000.0), $3)
        `,
        [sensor.sensor_id, timestamp, generatedValue]
      )
      insertedCount += 1
    }

    await client.query('COMMIT')

    logger.info(
      `Generated ${insertedCount} fake sensor reading(s) across ${sensors.length} active sensor(s)` +
      (skippedByType > 0 ? `, skipped ${skippedByType} unsupported sensor(s)` : '')
    )

    return {
      insertedCount,
      skippedCount,
      skippedByType,
      sensorCount: sensors.length,
      skippedBecauseBusy: false,
    }
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    logger.error('Failed to generate fake sensor readings', error)
    throw error
  } finally {
    client.release()
    isRunning = false
  }
}

const getSensorReadingGeneratorStatus = () => ({
  isRunning,
})

module.exports = {
  generateFakeSensorReadings,
  getSensorReadingGeneratorStatus,
}
