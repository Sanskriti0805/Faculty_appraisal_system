const db = require('../config/database');

/**
 * Resolves a candidate faculty_id (which may be a users.id) to the correct
 * faculty_information.id, following the same email-join logic used in coursesController.
 */
const resolveFacultyId = async (candidateFacultyId) => {
  if (candidateFacultyId === undefined || candidateFacultyId === null || candidateFacultyId === '') {
    return null;
  }

  // Check if it's already a valid faculty_information.id
  const [facultyRows] = await db.query(
    'SELECT id FROM faculty_information WHERE id = ? LIMIT 1',
    [candidateFacultyId]
  );
  if (facultyRows.length > 0) {
    return candidateFacultyId;
  }

  // Try mapping via users -> faculty_information using email
  const [mappedRows] = await db.query(
    `SELECT fi.id
     FROM users u
     INNER JOIN faculty_information fi ON fi.email = u.email
     WHERE u.id = ?
     LIMIT 1`,
    [candidateFacultyId]
  );
  if (mappedRows.length > 0) {
    return mappedRows[0].id;
  }

  return null;
};

module.exports = { resolveFacultyId };
