const db = require('../src/config/database')
const bcrypt = require('bcryptjs')

async function run() {
  try {
    // find TECHNICIAN role
    const roleRes = await db.query("SELECT role_id FROM roles WHERE UPPER(role_name) = 'TECHNICIAN' LIMIT 1")
    let techRoleId
    if (roleRes.rows.length > 0) {
      techRoleId = roleRes.rows[0].role_id
    } else {
      const insertRole = await db.query("INSERT INTO roles (role_name) VALUES ($1) RETURNING role_id", ['TECHNICIAN'])
      techRoleId = insertRole.rows[0].role_id
    }

    // pick an existing farm if any
    const farmRes = await db.query('SELECT farm_id FROM farms LIMIT 1')
    let farmId = farmRes.rows.length > 0 ? farmRes.rows[0].farm_id : null

    // if no farm, create a farm and owner user
    if (!farmId) {
      const now = Date.now().toString().slice(-6)
      const farmCode = `FARM-TEST-${now}`
      const farmInsert = await db.query('INSERT INTO farms (farm_code, farm_name, owner_user_id, status) VALUES ($1,$2,$3,$4) RETURNING farm_id', [farmCode, 'Test Farm', null, 'ACTIVE'])
      farmId = farmInsert.rows[0].farm_id
    }

    // create technician user
    const username = 'test_tech'
    const password = 'Password123!'
    // check if exists
    const userCheck = await db.query('SELECT user_id FROM users WHERE username = $1', [username])
    let userId
    if (userCheck.rows.length > 0) {
      userId = userCheck.rows[0].user_id
      console.log('User already exists, id=', userId)
    } else {
      const hashed = await bcrypt.hash(password, 10)
      const insertUser = await db.query('INSERT INTO users (full_name, username, email, password_hash, role_id, status, farm_id) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING user_id', ['Test Technician', username, 'test_tech@example.com', hashed, techRoleId, true, farmId])
      userId = insertUser.rows[0].user_id
      console.log('Created technician user:', username)
    }

    // pick a pond
    const pondRes = await db.query('SELECT pond_id FROM ponds WHERE farm_id = $1 LIMIT 1', [farmId])
    let pondId
    if (pondRes.rows.length > 0) {
      pondId = pondRes.rows[0].pond_id
    } else {
      // create pond
      const pondInsert = await db.query('INSERT INTO ponds (pond_code, pond_name, area_m2, farm_id) VALUES ($1,$2,$3,$4) RETURNING pond_id', [`POND-TEST-${Date.now().toString().slice(-4)}`, 'Ao test', 1000, farmId])
      pondId = pondInsert.rows[0].pond_id
      console.log('Created pond id=', pondId)
    }

    console.log('Setup complete. Credentials: username=', username, 'password=', password, 'pondId=', pondId)
    console.log('Use ThresholdSettings page in frontend to configure thresholds for your pond.')
    process.exit(0)
  } catch (err) {
    console.error('Error in setup script:', err)
    process.exit(1)
  }
}

run()
