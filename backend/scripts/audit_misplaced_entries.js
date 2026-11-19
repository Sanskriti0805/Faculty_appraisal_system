/**
 * Audit entries that may have been saved under the wrong faculty.
 *
 * Background: users.id and faculty_information.id are different sequences. Before the fix, a faculty
 * user with NO faculty_information row (matched by email) had their users.id used as the
 * faculty_information id, so their entries may sit on another person's row.
 *
 * Usage (from backend/):
 *   node scripts/audit_misplaced_entries.js                  -> read-only report
 *   node scripts/audit_misplaced_entries.js --create-missing -> also create the missing
 *                                                               faculty_information rows (new ids)
 *
 * This script NEVER moves or deletes entries: ownership of an entry on a shared row cannot be proven
 * from the data alone, so suspicious rows are only listed for manual review.
 */
require('dotenv').config();
const db = require('../config/database');

const createMissing = process.argv.includes('--create-missing');

async function run() {
  const [users] = await db.query(
    "SELECT id, name, email, department, designation, employee_id FROM users WHERE role = 'faculty'"
  );

  const atRisk = [];
  for (const u of users) {
    const [byEmail] = await db.query('SELECT id FROM faculty_information WHERE email = ? LIMIT 1', [u.email]);
    if (byEmail.length === 0) atRisk.push(u);
  }

  console.log(`Faculty users: ${users.length}`);
  console.log(`Faculty users with NO faculty_information row (by email): ${atRisk.length}\n`);
  if (atRisk.length === 0) {
    console.log('Nothing at risk. No misplaced entries expected.');
    process.exit(0);
  }

  const [tables] = await db.query(
    `SELECT DISTINCT TABLE_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND COLUMN_NAME = 'faculty_id'
       AND TABLE_NAME <> 'faculty_information'`
  );

  let suspicious = 0;
  for (const u of atRisk) {
    const [owner] = await db.query('SELECT id, name, email FROM faculty_information WHERE id = ? LIMIT 1', [u.id]);
    const ownerLabel = owner.length ? `${owner[0].name} <${owner[0].email}>` : '(no row with that id)';
    const hits = [];
    for (const { TABLE_NAME: t } of tables) {
      const [[{ c }]] = await db.query(`SELECT COUNT(*) c FROM \`${t}\` WHERE faculty_id = ?`, [u.id]);
      if (c > 0) hits.push(`${t}: ${c}`);
    }
    console.log(`User #${u.id} ${u.name} <${u.email}> has no faculty_information row.`);
    console.log(`  Rows with faculty_id = ${u.id} belong to: ${ownerLabel}`);
    if (hits.length && owner.length) {
      suspicious += 1;
      console.log(`  SUSPICIOUS (may be ${u.name}'s entries or ${owner[0].name}'s): ${hits.join(', ')}`);
    } else {
      console.log('  No entries on that id.');
    }
    console.log('');
  }

  if (createMissing) {
    let created = 0;
    for (const u of atRisk) {
      let employeeId = u.employee_id || null;
      if (employeeId) {
        const [taken] = await db.query('SELECT id FROM faculty_information WHERE employee_id = ? LIMIT 1', [employeeId]);
        if (taken.length) employeeId = null;
      }
      // No explicit id: let the database assign one so it cannot collide with a users.id.
      await db.query(
        `INSERT INTO faculty_information (name, employee_id, department, designation, email)
         VALUES (?, ?, ?, ?, ?)`,
        [u.name || 'Faculty', employeeId, u.department || null, u.designation || null, u.email]
      );
      created += 1;
    }
    console.log(`Created ${created} missing faculty_information row(s). New entries will now save to the right person.`);
  } else {
    console.log('Read-only run. Re-run with --create-missing to create the missing rows.');
  }
  console.log(`Users with suspicious entries needing manual review: ${suspicious}`);
  process.exit(0);
}

run().catch((e) => { console.error('Audit failed:', e.message); process.exit(1); });
