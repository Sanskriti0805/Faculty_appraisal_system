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
  }

  // Self-heal legacy accounts: if user exists as faculty but has no
  // faculty_information row yet, create one on demand.
  if (numericFacultyId !== null) {
    const [facultyUsers] = await db.query(
      `SELECT id, name, email, department, designation, employee_id, date_of_joining
       FROM users
       WHERE id = ? AND role = 'faculty'
       LIMIT 1`,
      [numericFacultyId]
    );

    if (facultyUsers.length > 0) {
      const u = facultyUsers[0];

      if (u.email) {
        const [existingByEmail] = await db.query('SELECT id FROM faculty_information WHERE email = ? LIMIT 1', [u.email]);
        if (existingByEmail.length > 0) {
          return existingByEmail[0].id;
        }
      }

      const [insertResult] = await db.query(
        `INSERT INTO faculty_information (name, email, department, designation, employee_id, date_of_joining)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [u.name || null, u.email || null, u.department || null, u.designation || null, u.employee_id || null, u.date_of_joining || null]
      );

      return insertResult.insertId;
    }
  }

  return null;
};

// --- Paper Reviews ---
exports.createPaperReview = async (req, res) => {
    try {
    const { faculty_id, journal_name, review_type, tier, number_of_papers, month_of_review, existing_evidence_file } = req.body;
        
        const facultyInfoId = await resolveFacultyInfoId({
          facultyId: faculty_id || req.user?.id,
          email: req.user?.email
        });

        if (!facultyInfoId) {
          return res.status(400).json({ success: false, message: 'Faculty profile not found. Complete onboarding first.' });
        }

        const evidence_file = req.file ? req.file.filename : (existing_evidence_file || null);
        const [result] = await db.query(
            `INSERT INTO paper_reviews (faculty_id, journal_name, review_type, tier, number_of_papers, month_of_review, evidence_file) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [facultyInfoId, journal_name, review_type, tier, number_of_papers, month_of_review, evidence_file]
        );
        res.status(201).json({ success: true, id: result.insertId });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deletePaperReview = async (req, res) => {
    try {
        const [result] = await db.query('DELETE FROM paper_reviews WHERE id = ?', [req.params.id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Paper review not found' });
        }

        res.json({ success: true, message: 'Paper review deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// --- Technology Transfer ---
exports.createTechTransfer = async (req, res) => {
    try {
    const { faculty_id, title, agency, date, existing_evidence_file } = req.body;
        
        const facultyInfoId = await resolveFacultyInfoId({
          facultyId: faculty_id || req.user?.id,
          email: req.user?.email
        });

        if (!facultyInfoId) {
          return res.status(400).json({ success: false, message: 'Faculty profile not found. Complete onboarding first.' });
        }

        const evidence_file = req.file ? req.file.filename : (existing_evidence_file || null);
        const [result] = await db.query(
            `INSERT INTO technology_transfer (faculty_id, title, agency, date, evidence_file) 
             VALUES (?, ?, ?, ?, ?)`,
            [facultyInfoId, title, agency, date, evidence_file]
        );
        res.status(201).json({ success: true, id: result.insertId });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// --- Conference Sessions ---
exports.createConferenceSession = async (req, res) => {
    try {
  const { faculty_id, conference_name, session_title, role, location, date, existing_evidence_file } = req.body;
        
        const facultyInfoId = await resolveFacultyInfoId({
          facultyId: faculty_id || req.user?.id,
          email: req.user?.email
        });

        if (!facultyInfoId) {
          return res.status(400).json({ success: false, message: 'Faculty profile not found. Complete onboarding first.' });
        }

        const evidence_file = req.file ? req.file.filename : (existing_evidence_file || null);
        const [result] = await db.query(
          `INSERT INTO conference_sessions (faculty_id, conference_name, session_title, date, role, location, evidence_file) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [facultyInfoId, conference_name, session_title, date || null, role, location, evidence_file]
        );
        res.status(201).json({ success: true, id: result.insertId });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteConferenceSession = async (req, res) => {
    try {
        const [result] = await db.query('DELETE FROM conference_sessions WHERE id = ?', [req.params.id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Conference session not found' });
        }

        res.json({ success: true, message: 'Conference session deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// --- Keynotes & Talks ---
exports.createKeynoteTalk = async (req, res) => {
    try {
  const { faculty_id, event_name, title, event_type, audience_type, date, location, existing_evidence_file } = req.body;
        
        const facultyInfoId = await resolveFacultyInfoId({
          facultyId: faculty_id || req.user?.id,
          email: req.user?.email
        });

        if (!facultyInfoId) {
          return res.status(400).json({ success: false, message: 'Faculty profile not found. Complete onboarding first.' });
        }

        const evidence_file = req.file ? req.file.filename : (existing_evidence_file || null);
        const [result] = await db.query(
          `INSERT INTO keynotes_talks (faculty_id, event_name, title, date, location, event_type, audience_type, evidence_file) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [facultyInfoId, event_name, title, date || null, location || null, event_type, audience_type, evidence_file]
        );
        res.status(201).json({ success: true, id: result.insertId });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteKeynoteTalk = async (req, res) => {
    try {
        const [result] = await db.query('DELETE FROM keynotes_talks WHERE id = ?', [req.params.id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Keynote/talk not found' });
        }

        res.json({ success: true, message: 'Keynote/talk deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteTechTransfer = async (req, res) => {
    try {
        const [result] = await db.query('DELETE FROM technology_transfer WHERE id = ?', [req.params.id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Technology transfer entry not found' });
        }

        res.json({ success: true, message: 'Technology transfer deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
