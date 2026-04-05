const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function resetAllData() {
  const confirm = process.argv.includes('--yes');
  if (!confirm) {
    console.error('Refusing to run without --yes flag.');
    process.exit(1);
  }

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT || '3306', 10),
    multipleStatements: true,
  });

  try {
    console.log('=== FULL DATA RESET START ===');

    const [tables] = await conn.query(
      `SELECT table_name AS name
       FROM information_schema.tables
       WHERE table_schema = DATABASE()
         AND table_type = 'BASE TABLE'
       ORDER BY table_name`
    );

    if (!tables.length) {
      console.log('No tables found. Nothing to reset.');
      return;
    }

    console.log(`Tables to truncate: ${tables.length}`);

    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const t of tables) {
      await conn.query(`TRUNCATE TABLE \`${t.name}\``);
    }
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');

    console.log('All tables truncated.');

    const seedRubricsPath = path.join(__dirname, '..', 'database', 'seed_rubrics.sql');
    if (fs.existsSync(seedRubricsPath)) {
      const sql = fs.readFileSync(seedRubricsPath, 'utf8');
      await conn.query(sql);
      const [rubricCount] = await conn.query('SELECT COUNT(*) AS c FROM dofa_rubrics');
      console.log(`Rubrics reseeded: ${rubricCount[0].c}`);
    } else {
      console.warn('seed_rubrics.sql not found; rubrics were not reseeded.');
    }

    console.log('=== FULL DATA RESET COMPLETE ===');
  } catch (error) {
    console.error('Reset failed:', error.message);
    process.exitCode = 1;
  } finally {
    await conn.end();
  }
}

resetAllData();
