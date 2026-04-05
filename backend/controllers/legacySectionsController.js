const db = require('../config/database');

function getCurrentAcademicYear() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  if (month >= 7) {
    return `${year}-${String(year + 1).slice(-2)}`;
  }
  return `${year - 1}-${String(year).slice(-2)}`;
}

async function resolveAcademicYearForFaculty(facultyId) {
  const currentYear = getCurrentAcademicYear();
  const [rows] = await db.query(
    `SELECT academic_year
     FROM submissions
     WHERE faculty_id = ? AND academic_year = ?
     ORDER BY id DESC
     LIMIT 1`,
    [facultyId, currentYear]
  );

  if (rows.length > 0) {
    return rows[0].academic_year;
  }

  const [latestRows] = await db.query(
    `SELECT academic_year
     FROM submissions
     WHERE faculty_id = ?
     ORDER BY id DESC
     LIMIT 1`,
    [facultyId]
  );

  if (latestRows.length > 0) {
    return latestRows[0].academic_year;
  }

  return currentYear;
}

exports.getMySectionData = async (req, res) => {
  try {
    const facultyId = req.user.id;
    const { sectionKey } = req.params;
    const academicYear = await resolveAcademicYearForFaculty(facultyId);

    let [rows] = await db.query(
      `SELECT content_json
       FROM legacy_section_entries
       WHERE faculty_id = ? AND section_key = ? AND academic_year = ?
       ORDER BY updated_at DESC
       LIMIT 1`,
      [facultyId, sectionKey, academicYear]
    );

    if (rows.length === 0) {
      [rows] = await db.query(
        `SELECT content_json
         FROM legacy_section_entries
         WHERE faculty_id = ? AND section_key = ?
         ORDER BY updated_at DESC
         LIMIT 1`,
        [facultyId, sectionKey]
      );
    }

    const content = rows.length > 0 ? rows[0].content_json : null;
    return res.json({ success: true, data: content || null });
  } catch (error) {
    console.error('getMySectionData error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch section data' });
  }
};

exports.saveMySectionData = async (req, res) => {
  try {
    const facultyId = req.user.id;
    const { sectionKey } = req.params;
    const { content } = req.body;

    if (content === undefined) {
      return res.status(400).json({ success: false, message: 'content is required' });
    }

    const academicYear = await resolveAcademicYearForFaculty(facultyId);

    await db.query(
      `INSERT INTO legacy_section_entries (faculty_id, academic_year, section_key, content_json)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         content_json = VALUES(content_json),
         updated_at = CURRENT_TIMESTAMP`,
      [facultyId, academicYear, sectionKey, JSON.stringify(content)]
    );

    return res.json({ success: true, message: 'Section data saved successfully' });
  } catch (error) {
    console.error('saveMySectionData error:', error);
    return res.status(500).json({ success: false, message: 'Failed to save section data' });
  }
};
