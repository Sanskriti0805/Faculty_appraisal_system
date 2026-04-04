const db = require('./config/database');

async function migrate() {
  try {
    const [rows] = await db.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' AND COLUMN_NAME='onboarding_complete'"
    );
    if (rows.length === 0) {
      await db.query('ALTER TABLE users ADD COLUMN onboarding_complete TINYINT(1) NOT NULL DEFAULT 1');
      console.log('✅ Added onboarding_complete column');
    } else {
      console.log('ℹ️  Column already exists');
    }
  } catch (e) {
    console.error('Migration error:', e.message);
  }
  process.exit(0);
}

migrate();
