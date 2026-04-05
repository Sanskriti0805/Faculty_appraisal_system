const db = require('../config/database');

async function migrate() {
  console.log('🔄 Running migration: Reminders Configuration...');

  const columns = [
    { name: 'reminder_days', def: 'INT DEFAULT 2' },
    { name: 'reminder_time', def: "TIME DEFAULT '08:00:00'" }
  ];

  for (const col of columns) {
    try {
      // Check if column exists
      const [rows] = await db.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'appraisal_sessions' AND COLUMN_NAME = ?`,
        [process.env.DB_NAME, col.name]
      );

      if (rows.length > 0) {
        console.log(`  ⏭️  Column '${col.name}' already exists, skipping.`);
        continue;
      }

      await db.query(`ALTER TABLE appraisal_sessions ADD COLUMN ${col.name} ${col.def}`);
      console.log(`  ✅ Added column '${col.name}'`);
    } catch (err) {
      console.error(`  ❌ Error adding '${col.name}': ${err.message}`);
    }
  }

  console.log('✅ Migration complete!');
  process.exit(0);
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
