/**
 * Migration: Create/update appraisal_sessions table with form release columns
 * Run: node scripts/migrate_form_release.js
 */
const db = require('../config/database');

async function migrate() {
  console.log('🔄 Running migration: Form Release System...');

  // First check if the table exists
  const [tables] = await db.query(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'appraisal_sessions'`,
    [process.env.DB_NAME]
  );

  if (tables.length === 0) {
    console.log('  📦 Table appraisal_sessions does not exist, creating...');
    await db.query(`
      CREATE TABLE appraisal_sessions (
        id INT NOT NULL AUTO_INCREMENT,
        academic_year VARCHAR(20) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        status ENUM('open','closed') DEFAULT 'closed',
        created_by INT DEFAULT NULL,
        created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        release_date DATETIME DEFAULT NULL,
        deadline DATE DEFAULT NULL,
        is_released TINYINT(1) DEFAULT 0,
        scheduled_release DATETIME DEFAULT NULL,
        reminder_sent TINYINT(1) DEFAULT 0,
        release_email_sent TINYINT(1) DEFAULT 0,
        PRIMARY KEY (id),
        KEY created_by (created_by),
        KEY idx_appraisal_sessions_status_workflow (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);
    console.log('  ✅ Table created with all columns.');
  } else {
    console.log('  📋 Table exists, adding new columns if needed...');

    const columns = [
      { name: 'release_date', def: 'DATETIME DEFAULT NULL' },
      { name: 'deadline', def: 'DATE DEFAULT NULL' },
      { name: 'is_released', def: 'TINYINT(1) DEFAULT 0' },
      { name: 'scheduled_release', def: 'DATETIME DEFAULT NULL' },
      { name: 'reminder_sent', def: 'TINYINT(1) DEFAULT 0' },
      { name: 'release_email_sent', def: 'TINYINT(1) DEFAULT 0' }
    ];

    for (const col of columns) {
      try {
        const [rows] = await db.query(
          `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'appraisal_sessions' AND COLUMN_NAME = ?`,
          [process.env.DB_NAME, col.name]
        );

        if (rows.length > 0) {
          console.log(`    ⏭️  Column '${col.name}' already exists.`);
          continue;
        }

        await db.query(`ALTER TABLE appraisal_sessions ADD COLUMN ${col.name} ${col.def}`);
        console.log(`    ✅ Added column '${col.name}'`);
      } catch (err) {
        console.error(`    ❌ Error adding '${col.name}': ${err.message}`);
      }
    }
  }

  console.log('✅ Migration complete!');
  process.exit(0);
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
