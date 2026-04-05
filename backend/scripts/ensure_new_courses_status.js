const db = require('../config/database');

async function run() {
  try {
    const [rows] = await db.query(
      "SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'new_courses' AND COLUMN_NAME = 'status'"
    );

    if (rows[0].c === 0) {
      await db.query("ALTER TABLE new_courses ADD COLUMN status ENUM('draft','submitted') DEFAULT 'draft' AFTER cif_file");
      console.log('Added new_courses.status');
    } else {
      console.log('new_courses.status already exists');
    }

    process.exit(0);
  } catch (error) {
    console.error('Ensure column failed:', error.message);
    process.exit(1);
  }
}

run();
