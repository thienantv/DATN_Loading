const bcrypt = require('bcryptjs');
const db = require('./src/config/database');

const testAccounts = [
  {
    fullName: 'Admin User',
    username: 'admin',
    email: 'admin@shrimp-farm.local',
    password: 'admin123',
    roleId: 1, // ADMIN
  },
  {
    fullName: 'Manager User',
    username: 'manager1',
    email: 'manager1@shrimp-farm.local',
    password: 'manager123',
    roleId: 2, // MANAGER
  },
  {
    fullName: 'Worker User',
    username: 'worker1',
    email: 'worker1@shrimp-farm.local',
    password: 'worker123',
    roleId: 3, // STAFF
  },
];

async function createTestAccounts() {
  try {
    console.log('Starting to create test accounts...');

    for (const account of testAccounts) {
      // Check if user already exists
      const checkResult = await db.query(
        'SELECT * FROM users WHERE username = $1',
        [account.username]
      );

      if (checkResult.rows.length > 0) {
        console.log(`⏭️  User "${account.username}" already exists, skipping...`);
        continue;
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(account.password, 10);

      // Insert user
      const result = await db.query(
        `INSERT INTO users (full_name, username, password_hash, email, role_id, status)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING user_id, username, email, full_name`,
        [account.fullName, account.username, hashedPassword, account.email, account.roleId, true]
      );

      console.log(`✅ Created user: ${result.rows[0].username} (${account.fullName})`);
    }

    console.log('\n✅ All test accounts created successfully!');
    console.log('\n📋 Demo Accounts:');
    console.log('====================');
    testAccounts.forEach(account => {
      console.log(`Role: ${['ADMIN', 'MANAGER', 'STAFF'][account.roleId - 1]}`);
      console.log(`  Username: ${account.username}`);
      console.log(`  Password: ${account.password}`);
      console.log('');
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating test accounts:', error.message);
    process.exit(1);
  }
}

createTestAccounts();
