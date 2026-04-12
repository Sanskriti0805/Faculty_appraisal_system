const db = require('../config/database');

const toNumberOrNull = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const resolveFacultyInfoId = async ({ facultyId, email }) => {
  const numericFacultyId = toNumberOrNull(facultyId);

  if (email) {
    const [fiByEmail] = await db.query('SELECT id FROM faculty_information WHERE email = ? LIMIT 1', [email]);
    if (fiByEmail.length > 0) {
      return fiByEmail[0].id;
    }
  }

  if (numericFacultyId !== null) {
    const [fiById] = await db.query('SELECT id FROM faculty_information WHERE id = ? LIMIT 1', [numericFacultyId]);
    if (fiById.length > 0) {
      return fiById[0].id;
    }

    const [usersById] = await db.query('SELECT email FROM users WHERE id = ? LIMIT 1', [numericFacultyId]);
    if (usersById.length > 0) {
      const [fiByUserEmail] = await db.query('SELECT id FROM faculty_information WHERE email = ? LIMIT 1', [usersById[0].email]);
      if (fiByUserEmail.length > 0) {
        return fiByUserEmail[0].id;
      }
    }

    const [facultyUsers] = await db.query(
      `SELECT id, name, email, department, designation, employee_id, date_of_joining
       FROM users
       WHERE id = ? AND role = 'faculty'
       LIMIT 1`,
      [numericFacultyId]
    );

    if (facultyUsers.length > 0) {
      const userRow = facultyUsers[0];

      if (userRow.email) {
        const [existingByEmail] = await db.query('SELECT id FROM faculty_information WHERE email = ? LIMIT 1', [userRow.email]);
        if (existingByEmail.length > 0) {
          return existingByEmail[0].id;
        }
      }

      const [insertResult] = await db.query(
        `INSERT INTO faculty_information (name, email, department, designation, employee_id, date_of_joining)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userRow.name || null, userRow.email || null, userRow.department || null, userRow.designation || null, userRow.employee_id || null, userRow.date_of_joining || null]
      );

      return insertResult.insertId;
    }
  }

  return null;
};

module.exports = {
  resolveFacultyInfoId,
  toNumberOrNull,
};
