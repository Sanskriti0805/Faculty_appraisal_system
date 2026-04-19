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
    console.log('=== appraisal_sessions Schema Fix ===\n');

    const columns = [
      ['is_released', 'TINYINT(1) DEFAULT 0'],
      ['release_date', 'TIMESTAMP NULL'],
      ['scheduled_release', 'TIMESTAMP NULL'],
      ['release_email_sent', 'TINYINT(1) DEFAULT 0'],
      ['reminder_sent', 'TINYINT(1) DEFAULT 0'],
      ['deadline', 'DATE NULL'],
      ['reminder_days', 'INT DEFAULT 2'],
      ['reminder_time', 'TIME DEFAULT "08:00:00"']
    ];

    for (const [name, definition] of columns) {
      const [rows] = await conn.query(
        'SELECT COUNT(*) as c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
        ['appraisal_sessions', name]
      );
      if (rows[0].c === 0) {
        await conn.query(`ALTER TABLE appraisal_sessions ADD COLUMN ${name} ${definition}`);
        console.log(`   Added: ${name} (${definition})`);
      } else {
        console.log(`   Exists: ${name}`);
      }
    }

    console.log('\n=== Schema fix complete! ===');
  } catch (err) {
    console.error('❌ Schema fix failed:', err.message);
  } finally {
    await conn.end();
  }
}

run();
