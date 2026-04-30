const db = require('./config/database');

(async () => {
  try {
    // Get publications ordered by creation time
    const [pubs] = await db.query(
      `SELECT id, publication_type, sub_type, title, created_at 
       FROM research_publications 
       WHERE faculty_id = 8 
       AND publication_type = 'Journal' 
       ORDER BY created_at ASC`
    );

    console.log('Publications in order of creation:');
    console.log(JSON.stringify(pubs, null, 2));

    if (pubs.length >= 2) {
      console.log('\n📋 Migration Plan:');
      console.log(`ID ${pubs[0].id} (${pubs[0].title}) -> sub_type: 'Q1'`);
      console.log(`ID ${pubs[1].id} (${pubs[1].title}) -> sub_type: 'Q2'`);

      // Apply the migration
      console.log('\n⏳ Applying migration...');
      await db.query("UPDATE research_publications SET sub_type = 'Q1' WHERE id = ? AND faculty_id = 8", [pubs[0].id]);
      await db.query("UPDATE research_publications SET sub_type = 'Q2' WHERE id = ? AND faculty_id = 8", [pubs[1].id]);

      console.log('✅ Migration completed!');

      // Verify
      const [updated] = await db.query(
        `SELECT id, title, sub_type FROM research_publications WHERE faculty_id = 8 AND publication_type = 'Journal'`
      );
      console.log('\nVerification - Updated publications:');
      console.log(JSON.stringify(updated, null, 2));
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
