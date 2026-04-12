const db = require('./config/database');

(async () => {
  try {
    const deptId = 1;
    const deptName = 'computer science';

    const [rows] = await db.query(
      `SELECT u.id, u.name, u.email,
              COALESCE(u.date_of_joining,
                (
                  SELECT fi.date_of_joining
                  FROM faculty_information fi
                  WHERE fi.email = u.email
                  ORDER BY fi.id DESC
                  LIMIT 1
                ),
                DATE(u.created_at)
              ) AS date_of_joining,
              u.created_at
       FROM users u
       WHERE u.role = 'faculty' AND COALESCE(u.is_archived, 0) = 0
         AND (
           u.department_id = ?
           OR (u.department_id IS NULL AND ? <> '' AND u.department = ?)
         )
       ORDER BY u.name`,
      [deptId, deptName, deptName]
    );

    console.table(rows);
  } catch (error) {
    console.error(error);
  } finally {
    process.exit(0);
  }
})();
