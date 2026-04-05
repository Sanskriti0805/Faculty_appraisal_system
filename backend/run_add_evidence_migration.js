const db = require('./config/database');

async function runMigration() {
  try {
    console.log('Running migration: add evidence_file to submitted_proposals...');
    
    // Check if column already exists
    const [columns] = await db.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_NAME = 'submitted_proposals' 
       AND TABLE_SCHEMA = 'faculty_appraisal'
       AND COLUMN_NAME = 'evidence_file'`
    );
    
    if (columns.length > 0) {
      console.log('✓ Column already exists, skipping migration');
      process.exit(0);
    }
    
    // Add the column
    const query = `ALTER TABLE submitted_proposals 
    ADD COLUMN evidence_file VARCHAR(255) NULL 
    AFTER role`;
    
    await db.query(query);
    
    console.log('✓ Migration completed successfully!');
    console.log('evidence_file column added to submitted_proposals table');
  } catch (error) {
    console.error('✗ Migration failed:', error.message);
  } finally {
    process.exit(0);
  }
}

runMigration();
