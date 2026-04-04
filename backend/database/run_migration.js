/**
 * Migration script: Fix email system DB issues
 * - Add 'hod' to role enum
 * - Add missing columns to users table
 * - Create departments table
 */
const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT) || 3306
  });

  try {
    console.log('=== Email System Migration ===\n');

    // 1. Fix role enum
    console.log('1. Fixing role enum to include hod (keeping admin)...');
    await conn.query(
      "ALTER TABLE users MODIFY COLUMN role ENUM('admin','faculty','hod','dofa','dofa_office') DEFAULT 'faculty'"
    );
    console.log('   Done.\n');

    // 2. Add missing columns
    console.log('2. Adding missing columns to users table...');
    const columns = [
      ['department_id', 'INT'],
      ['salutation', 'VARCHAR(20)'],
      ['employee_id', 'VARCHAR(50)'],
      ['employment_type', 'VARCHAR(50)'],
      ['date_of_joining', 'DATE'],
      ['password_reset_token', 'VARCHAR(255)'],
      ['password_reset_expires', 'DATETIME']
    ];

    for (const [name, type] of columns) {
      const [rows] = await conn.query(
        'SELECT COUNT(*) as c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
        ['users', name]
      );
      if (rows[0].c === 0) {
        await conn.query(`ALTER TABLE users ADD COLUMN ${name} ${type}`);
        console.log(`   Added: ${name} (${type})`);
      } else {
        console.log(`   Exists: ${name}`);
      }
    }
    console.log('');

    // 3. Create departments table
    console.log('3. Ensuring departments table exists...');
    await conn.query(`
      CREATE TABLE IF NOT EXISTS departments (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        code VARCHAR(50) NOT NULL UNIQUE,
        hod_email VARCHAR(255),
        hod_name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   Done.\n');

    // 4. Verify
    console.log('4. Verification:');
    const [userCols] = await conn.query('SHOW COLUMNS FROM users');
    console.log('   Users columns:', userCols.map(c => c.Field).join(', '));
    const [roleRow] = await conn.query("SHOW COLUMNS FROM users LIKE 'role'");
    console.log('   Role type:', roleRow[0].Type);
    const [deptCols] = await conn.query('SHOW COLUMNS FROM departments');
    console.log('   Departments columns:', deptCols.map(c => c.Field).join(', '));

    console.log('\n=== Migration complete! ===');
  } finally {
    await conn.end();
  }
}

run().catch(e => { console.error('Migration failed:', e.message); process.exit(1); });
