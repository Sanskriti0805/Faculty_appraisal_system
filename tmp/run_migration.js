const db = require('../backend/config/database');

async function main() {
  console.log('Running courses_taught migration...');

  const migrations = [
    // Add percentage column (% of course taught alone)
    `ALTER TABLE courses_taught ADD COLUMN IF NOT EXISTS percentage VARCHAR(20) NULL COMMENT 'Percentage of course taught alone' AFTER enrollment`,
    // Add status column
    `ALTER TABLE courses_taught ADD COLUMN IF NOT EXISTS status ENUM('draft', 'submitted') DEFAULT 'draft' AFTER percentage`,
    // Add feedback_score column
    `ALTER TABLE courses_taught ADD COLUMN IF NOT EXISTS feedback_score DECIMAL(5,3) NULL COMMENT 'Student feedback score (0.000 to 99.999)' AFTER status`,
  ];

  for (const m of migrations) {
    try {
      await db.query(m);
      console.log('OK:', m.substring(0, 80));
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('SKIP (already exists):', m.substring(0, 80));
      } else {
        console.log('ERR:', e.message);
      }
    }
  }

  // Verify final columns
  const [cols] = await db.query('DESCRIBE courses_taught');
  console.log('\nFINAL COLUMNS:');
  cols.forEach(c => console.log(' ', c.Field, c.Type));
  process.exit(0);
}

main().catch(e => { console.error(e.message); process.exit(1); });
