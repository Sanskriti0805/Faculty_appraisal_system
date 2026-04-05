/**
 * Seeds the dofa_rubrics table with all 75 rubrics from seed_rubrics.sql.
 * This is safe to run multiple times - it clears existing and re-seeds.
 */
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '/../.env') });

async function run() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT) || 3306,
    multipleStatements: true
  });

  try {
    console.log('=== Seeding dofa_rubrics ===\n');

    // Read seed SQL
    const seedPath = path.join(__dirname, '/../database/seed_rubrics.sql');
    const sql = fs.readFileSync(seedPath, 'utf8');

    // Count existing rubrics
    const [existing] = await conn.query('SELECT COUNT(*) as c FROM dofa_rubrics');
    console.log(`Current rubric count: ${existing[0].c}`);

    if (existing[0].c > 0) {
      // Check if rubrics look like test data (non-Teaching Feedback names)
      const [tfCheck] = await conn.query(
        "SELECT COUNT(*) as c FROM dofa_rubrics WHERE section_name LIKE '%Teaching Feedback%'"
      );
      if (tfCheck[0].c === 0) {
        console.log('Existing rubrics appear to be test data. Clearing and re-seeding...');
        await conn.query('DELETE FROM dofa_rubrics');
      } else {
        console.log('Rubrics already seeded. Run aborted to avoid duplicates.');
        console.log('To force re-seed, manually DELETE FROM dofa_rubrics first.');
        return;
      }
    }

    // Execute seed SQL
    await conn.query(sql);

    // Verify
    const [newCount] = await conn.query('SELECT COUNT(*) as c FROM dofa_rubrics');
    const [tfCount] = await conn.query(
      "SELECT COUNT(*) as c FROM dofa_rubrics WHERE section_name LIKE '%Teaching Feedback%'"
    );
    console.log(`\nAfter seed: ${newCount[0].c} total rubrics, ${tfCount[0].c} Teaching Feedback rubrics.`);

    // Show Teaching Feedback rubrics
    const [tfRubrics] = await conn.query(
      "SELECT id, section_name, sub_section, max_marks FROM dofa_rubrics WHERE section_name LIKE '%Teaching Feedback%' ORDER BY id"
    );
    console.log('\nTeaching Feedback rubrics:');
    tfRubrics.forEach(r => console.log(`  ID ${r.id}: ${r.sub_section} → ${r.max_marks} pts`));

    console.log('\n=== Seed complete! ===');
  } finally {
    await conn.end();
  }
}

run().catch(e => { console.error('Seed failed:', e.message); process.exit(1); });
