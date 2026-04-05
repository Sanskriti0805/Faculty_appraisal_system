const db = require('../config/database');

async function run() {
  try {
    const [facultyUsers] = await db.query(
      "SELECT id, name, email, department, designation, employee_id FROM users WHERE role = 'faculty'"
    );

    let created = 0;
    for (const u of facultyUsers) {
      const [existing] = await db.query('SELECT id FROM faculty_information WHERE id = ?', [u.id]);
      if (existing.length === 0) {
        let employeeId = u.employee_id || null;
        if (employeeId) {
          const [empTaken] = await db.query('SELECT id FROM faculty_information WHERE employee_id = ? LIMIT 1', [employeeId]);
          if (empTaken.length > 0) {
            employeeId = null;
          }
        }

        await db.query(
          `INSERT INTO faculty_information (id, name, employee_id, department, designation, email)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [u.id, u.name || 'Faculty', employeeId, u.department || null, u.designation || null, u.email || null]
        );
        created += 1;
      }
    }

    console.log(`Faculty users scanned: ${facultyUsers.length}`);
    console.log(`faculty_information rows created: ${created}`);
    process.exit(0);
  } catch (error) {
    console.error('Sync failed:', error.message);
    process.exit(1);
  }
}

run();
