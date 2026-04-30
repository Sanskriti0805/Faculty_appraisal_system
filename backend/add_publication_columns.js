const db = require('./config/database');

(async () => {
  try {
    // Check if quartile column exists
    const [cols] = await db.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'research_publications' AND COLUMN_NAME = 'quartile'"
    );

    if (cols.length === 0) {
      console.log('Adding quartile column to research_publications...');
      await db.query("ALTER TABLE research_publications ADD COLUMN quartile VARCHAR(50) NULL AFTER sub_type");
      console.log('✓ Added quartile column');
    } else {
      console.log('✓ Quartile column already exists');
    }

    // Check if tier column exists for conferences
    const [tierCols] = await db.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'research_publications' AND COLUMN_NAME = 'tier'"
    );

    if (tierCols.length === 0) {
      console.log('Adding tier column to research_publications...');
      await db.query("ALTER TABLE research_publications ADD COLUMN tier VARCHAR(50) NULL AFTER sub_type");
      console.log('✓ Added tier column');
    } else {
      console.log('✓ Tier column already exists');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
