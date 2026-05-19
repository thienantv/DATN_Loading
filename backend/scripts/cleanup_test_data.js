const db = require('../src/config/database')

async function run() {
  try {
    // delete notifications created by the test technician run
    await db.query(
      "DELETE FROM notifications WHERE user_id = 6 OR (title = 'Cảnh báo môi trường' AND content = 'Oxy thấp ở AO001 | Độ đục cao ở AO001')"
    )
    console.log('Deleted test notifications')
    
    // delete test manual env logs
    await db.query('DELETE FROM manual_environment_logs WHERE pond_id = 1 AND created_by = 6')
    console.log('Deleted test manual logs')
    
    // delete thresholds for the seeded test pond
    await db.query('DELETE FROM environment_thresholds WHERE pond_id = 1')
    console.log('Deleted thresholds for pond 1')

    // delete test user's login logs before removing the user
    await db.query('DELETE FROM user_login_logs WHERE user_id = 6')
    console.log('Deleted test user login logs')

    // delete test user's audit logs before removing the user
    await db.query('DELETE FROM audit_logs WHERE user_id = 6')
    console.log('Deleted test user audit logs')
    
    // delete test user
    await db.query('DELETE FROM users WHERE user_id = 6')
    console.log('Deleted test user')
    
    console.log('Cleanup complete')
    process.exit(0)
  } catch (err) {
    console.error('Error in cleanup:', err)
    process.exit(1)
  }
}

run()
