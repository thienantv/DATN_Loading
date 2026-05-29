const db = require('../src/config/database')
const { generateRealtimeSensorValue, getSensorTypeCode, getSensorProfile } = require('../src/utils/sensorMetrics')

const DEFAULT_COUNT_PER_SENSOR = 96
const DEFAULT_INTERVAL_MINUTES = 15

const parseArgs = () => {
  const args = process.argv.slice(2)
  const options = {
    countPerSensor: DEFAULT_COUNT_PER_SENSOR,
    intervalMinutes: DEFAULT_INTERVAL_MINUTES,
    append: false,
  }

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]
    if (arg === '--append') {
      options.append = true
      continue
    }

    if (arg === '--count') {
      const nextValue = Number(args[i + 1])
      if (Number.isInteger(nextValue) && nextValue > 0) {
        options.countPerSensor = nextValue
      }
      i += 1
      continue
    }

    if (arg === '--interval') {
      const nextValue = Number(args[i + 1])
      if (Number.isInteger(nextValue) && nextValue > 0) {
        options.intervalMinutes = nextValue
      }
      i += 1
    }
  }

  return options
}

const clampToNumber = (value) => {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) {
    return null
  }
  return Number(numericValue.toFixed(3))
}

async function run() {
  const client = await db.connect()
  const options = parseArgs()
  const intervalMs = options.intervalMinutes * 60 * 1000
  let transactionStarted = false

  try {
    const sensorsResult = await client.query(`
      SELECT sensor_id, serial_number, sensor_type, status
      FROM sensors
      ORDER BY sensor_id ASC
    `)

    const sensors = sensorsResult.rows
    if (sensors.length === 0) {
      console.log('No sensors found. Seed sensors first, then rerun this script.')
      return 1
    }

    const sensorIds = sensors.map((sensor) => sensor.sensor_id)

    await client.query('BEGIN')
    transactionStarted = true

    if (!options.append) {
      await client.query(
        'DELETE FROM sensor_readings WHERE sensor_id = ANY($1::bigint[])',
        [sensorIds]
      )
      console.log(`Deleted existing sensor readings for ${sensorIds.length} sensor(s)`)
    }

    const now = Date.now()
    const startedAt = now - ((options.countPerSensor - 1) * intervalMs)
    let insertedCount = 0

    for (const sensor of sensors) {
      const sensorTypeCode = getSensorTypeCode(sensor.sensor_type)
      const profile = getSensorProfile(sensorTypeCode)
      const sensorLabel = sensor.serial_number || `sensor-${sensor.sensor_id}`

      if (!profile) {
        console.log(`Skipped sensor ${sensor.sensor_id} (${sensorLabel}) because sensor_type=${sensor.sensor_type} is not supported by sensorMetrics`)
        continue
      }

      const anchorOffset = ((sensor.sensor_id % 7) - 3) * (profile.step * 1.5)
      let previousValue = clampToNumber(profile.target + anchorOffset)
      if (previousValue === null) {
        previousValue = profile.target
      }

      for (let index = 0; index < options.countPerSensor; index += 1) {
        const timestamp = startedAt + (index * intervalMs)
        const generatedValue = generateRealtimeSensorValue(sensor.sensor_type, previousValue, sensor.sensor_id, timestamp)
        if (generatedValue === null) {
          continue
        }

        previousValue = generatedValue
        await client.query(
          `
            INSERT INTO sensor_readings (sensor_id, recorded_at, value)
            VALUES ($1, to_timestamp($2 / 1000.0), $3)
          `,
          [sensor.sensor_id, timestamp, generatedValue]
        )
        insertedCount += 1
      }

      const lastValue = previousValue == null ? 'n/a' : previousValue
      console.log(`Seeded ${options.countPerSensor} readings for sensor ${sensor.sensor_id} (${sensorLabel}) | last=${lastValue}`)
    }

    await client.query('COMMIT')
    console.log(`Done. Inserted ${insertedCount} fake sensor readings across ${sensors.length} sensor(s).`)
    return 0
  } catch (error) {
    if (transactionStarted) {
      await client.query('ROLLBACK')
    }
    console.error('Error seeding sensor readings:', error)
    return 1
  } finally {
    client.release()
    await db.end().catch(() => {})
  }
}

run()
  .then((exitCode) => process.exit(exitCode))
  .catch((error) => {
    console.error('Unexpected fatal error seeding sensor readings:', error)
    process.exit(1)
  })
