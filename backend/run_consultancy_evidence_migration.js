const db = require('./config/database');

async function runMigration() {
  try {
    console.log('Running migration: add evidence_file to consultancy...');

    const [columns] = await db.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_NAME = 'consultancy'
         AND TABLE_SCHEMA = DATABASE()
         AND COLUMN_NAME = 'evidence_file'`
    );

    if (columns.length > 0) {
      console.log('✓ evidence_file already exists on consultancy');
      process.exit(0);
    }

    await db.query('ALTER TABLE consultancy ADD COLUMN evidence_file VARCHAR(255) NULL AFTER year');
    console.log('✓ Migration completed successfully');
  } catch (error) {
    console.error('✗ Migration failed:', error.message);
  } finally {
    process.exit(0);
  }
}

runMigration();
