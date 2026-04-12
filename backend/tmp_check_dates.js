const db = require('./config/database');

(async () => {
  try {
    const [users] = await db.query(
      "SELECT id, name, email, department_id, date_of_joining, created_at FROM users WHERE role = 'faculty' ORDER BY id DESC LIMIT 20"
    );
    const [facultyInfo] = await db.query(
      "SELECT id, name, email, date_of_joining FROM faculty_information ORDER BY id DESC LIMIT 20"
    );

    console.log('USERS');
    console.table(users);
    console.log('FACULTY_INFORMATION');
    console.table(facultyInfo);
  } catch (error) {
    console.error(error);
  } finally {
    process.exit(0);
  }
})();
