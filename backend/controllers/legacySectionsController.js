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
    const rawContent = req.body?.content;

    if (rawContent === undefined) {
      return res.status(400).json({ success: false, message: 'content is required' });
    }

    let content = rawContent;
    if (typeof rawContent === 'string') {
      try {
        content = JSON.parse(rawContent);
      } catch (error) {
        return res.status(400).json({ success: false, message: 'Invalid JSON in content' });
      }
    }

    if (!content || typeof content !== 'object') {
      return res.status(400).json({ success: false, message: 'content must be a JSON object' });
    }

    if (sectionKey === 'other_activities') {
      const incomingVisits = Array.isArray(content.institutionalVisits) ? content.institutionalVisits : [];
      const normalizedVisits = incomingVisits.map((visit) => {
        if (typeof visit === 'string') {
          return { details: String(visit || '').trim(), evidence_file: '' };
        }

        return {
          details: String(visit?.details || visit?.visit || visit?.text || '').trim(),
          evidence_file: String(visit?.evidence_file || '').trim()
        };
      });

      const uploadedFiles = Array.isArray(req.files?.visit_evidence_files) ? req.files.visit_evidence_files : [];
      const rawIndexes = req.body?.visit_evidence_indexes;
      const indexList = Array.isArray(rawIndexes)
        ? rawIndexes
        : (rawIndexes !== undefined ? [rawIndexes] : []);

      uploadedFiles.forEach((file, idx) => {
        const targetIndex = Number(indexList[idx]);
        if (!Number.isFinite(targetIndex) || targetIndex < 0 || targetIndex >= normalizedVisits.length) {
          return;
        }
        normalizedVisits[targetIndex].evidence_file = file.filename;
      });

      content.institutionalVisits = normalizedVisits.filter((visit) => visit.details || visit.evidence_file);
      if (!Object.prototype.hasOwnProperty.call(content, 'softwareDeveloped')) {
        content.softwareDeveloped = '';
      }
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
