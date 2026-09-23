// Read-only deployment diagnostic. Run from the project root:
// node backend/scripts/check_edit_permissions_schema.js
const db = require('../config/database');

const checks = [
  ['appraisal_sessions', 'id, academic_year, status, is_released, final_locked, created_at'],
  ['submissions', 'id, faculty_id, academic_year, form_type, status, locked, submitted_at, updated_at, created_at'],
  ['edit_requests', 'id, submission_id, faculty_id, status, approved_sections, reviewed_at']
];

async function run() {
  try {
    const [[server]] = await db.query('SELECT VERSION() AS version');
    console.log(`Database version: ${server.version}`);
    for (const [table, columns] of checks) {
      try {
        // LIMIT 0 verifies column names and SELECT access without reading faculty data.
        await db.query(`SELECT ${columns} FROM ${table} LIMIT 0`);
        console.log(`OK: ${table}`);
      } catch (error) {
        process.exitCode = 1;
        console.error(`FAIL: ${table}: ${error.code || 'DATABASE_ERROR'}: ${error.sqlMessage || error.message}`);
      }
    }
  } catch (error) {
    process.exitCode = 1;
    console.error(`Database check failed: ${error.code || 'DATABASE_ERROR'}: ${error.message}`);
  } finally {
    await db.end();
  }
}

run().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
