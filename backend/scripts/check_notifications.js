const db = require('../src/config/database')

async function run() {
  try {
    const res = await db.query("SELECT * FROM notifications WHERE created_at > now() - interval '10 minutes' ORDER BY created_at DESC LIMIT 20")
    console.log('Recent notifications:')
    console.log(JSON.stringify(res.rows, null, 2))
    process.exit(0)
  } catch (err) {
    console.error('Error querying notifications:', err)
    process.exit(1)
  }
}

run()
