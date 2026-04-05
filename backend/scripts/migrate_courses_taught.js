/**
 * Migration: Fix courses_taught table
 * - Add feedback_score column (student feedback score, 0-10 with 3 decimal places)
 * - Add percentage column (% of course taught alone)
 * - Add status column (draft/submitted workflow)
 */
const mysql = require('mysql2/promise');
require('dotenv').config({ path: __dirname + '/../.env' });

async function run() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT) || 3306
  });

  try {
    console.log('=== Courses Taught Migration ===\n');

    // Helper to check column existence
    const columnExists = async (table, column) => {
      const [rows] = await conn.query(
        'SELECT COUNT(*) as c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
        [table, column]
      );
      return rows[0].c > 0;
    };

    // 1. Add percentage column
    if (!(await columnExists('courses_taught', 'percentage'))) {
      await conn.query(`ALTER TABLE courses_taught ADD COLUMN percentage VARCHAR(20) NULL COMMENT 'Percentage of course taught alone' AFTER enrollment`);
      console.log('✓ Added: percentage');
    } else {
      console.log('- Skip: percentage (already exists)');
    }

    // 2. Add status column
    if (!(await columnExists('courses_taught', 'status'))) {
      await conn.query(`ALTER TABLE courses_taught ADD COLUMN status ENUM('draft', 'submitted') DEFAULT 'draft' AFTER percentage`);
      console.log('✓ Added: status');
    } else {
      console.log('- Skip: status (already exists)');
    }

    // 3. Add feedback_score column
    if (!(await columnExists('courses_taught', 'feedback_score'))) {
      await conn.query(`ALTER TABLE courses_taught ADD COLUMN feedback_score DECIMAL(5,3) NULL COMMENT 'Student feedback score (0.000 to 10.000)' AFTER status`);
      console.log('✓ Added: feedback_score');
    } else {
      console.log('- Skip: feedback_score (already exists)');
    }

    // 4. Verification
    console.log('\n=== Final columns in courses_taught ===');
    const [cols] = await conn.query('DESCRIBE courses_taught');
    cols.forEach(c => console.log(`  ${c.Field} (${c.Type})`));

    console.log('\n=== Migration complete! ===');
  } finally {
    await conn.end();
  }
}

run().catch(e => { console.error('Migration failed:', e.message); process.exit(1); });
