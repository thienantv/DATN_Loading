const db = require('../src/config/database')
const logger = require('../src/utils/logger')

async function run() {
  try {
    const days = Number(process.env.CLEANUP_LOCKED_DAYS || 365)
    logger.info(`Starting cleanup of locked users older than ${days} days`)

    const result = await db.query(`DELETE FROM users WHERE status = FALSE AND locked_at IS NOT NULL AND locked_at < NOW() - INTERVAL '${days} days' RETURNING user_id, username`)

    logger.info(`Cleanup complete. Deleted ${result.rowCount} users.`)
    if (result.rowCount > 0) {
      logger.info('Deleted user ids: ' + result.rows.map(r => r.user_id).join(', '))
    }
    process.exit(0)
  } catch (err) {
    logger.error('Error cleaning up locked users', err)
    process.exit(1)
  }
}

run()
