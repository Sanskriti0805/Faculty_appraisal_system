const db = require('../config/database');
const { getCurrentSessionWindow } = require('../utils/sessionScope');

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
  const currentSession = await getCurrentSessionWindow(db);
  return currentSession || getCurrentAcademicYear();
}

exports.getMySectionData = async (req, res) => {
  try {
    const facultyId = req.user.id;
    const { sectionKey } = req.params;
    const sessionId = await resolveAcademicYearForFaculty(facultyId);

    const [rows] = await db.query(
      `SELECT content_json
       FROM legacy_section_entries
       WHERE faculty_id = ? AND section_key = ? AND session_id = ?
       ORDER BY updated_at DESC
       LIMIT 1`,
      [facultyId, sectionKey, sessionId]
    );

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

    const sessionId = await resolveAcademicYearForFaculty(facultyId);

    await db.query(
      `INSERT INTO legacy_section_entries (faculty_id, academic_year, session_id, section_key, content_json)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         content_json = VALUES(content_json),
         updated_at = CURRENT_TIMESTAMP`,
      [facultyId, sessionId, sessionId, sectionKey, JSON.stringify(content)]
    );

    return res.json({ success: true, message: 'Section data saved successfully' });
  } catch (error) {
    console.error('saveMySectionData error:', error);
    return res.status(500).json({ success: false, message: 'Failed to save section data' });
  }
};
