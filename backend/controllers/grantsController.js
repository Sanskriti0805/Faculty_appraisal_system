const db = require('../config/database');
const { getCurrentSessionWindow, appendCreatedAtWindow } = require('../utils/sessionScope');

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

// Get all grants for a faculty
exports.getGrantsByFaculty = async (req, res) => {
  try {
    const facultyInfoId = await resolveFacultyInfoId({ facultyId: req.params.facultyId });
    if (!facultyInfoId) {
      return res.json({ success: true, data: [] });
    }
    const sessionWindow = await getCurrentSessionWindow(db);
    const scoped = appendCreatedAtWindow(
      'SELECT * FROM research_grants WHERE faculty_id = ?',
      [facultyInfoId],
      sessionWindow
    );

    const [rows] = await db.query(
      `${scoped.sql} ORDER BY created_at DESC`,
      scoped.params
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create grant
exports.createGrant = async (req, res) => {
  try {
    const {
      faculty_id,
      grant_type,
      project_name,
      funding_agency,
      currency,
      grant_amount,
      amount_in_lakhs,
      duration,
      researchers,
      role
    } = req.body;
    const sessionId = await getCurrentSessionWindow(db);

    const facultyInfoId = await resolveFacultyInfoId({
      facultyId: faculty_id || req.user?.id,
      email: req.user?.email
    });

    if (!facultyInfoId) {
      return res.status(400).json({ success: false, message: 'Faculty profile not found. Complete onboarding first.' });
    }

    const evidence_file = req.file ? req.file.filename : null;

    const [result] = await db.query(
      `INSERT INTO research_grants 
      (faculty_id, session_id, grant_type, project_name, funding_agency, currency, grant_amount, 
       amount_in_lakhs, duration, researchers, role, evidence_file) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [facultyInfoId, sessionId, grant_type, project_name, funding_agency, currency, grant_amount,
        amount_in_lakhs, duration, researchers, role, evidence_file]
    );

    res.status(201).json({
      success: true,
      message: 'Grant created successfully',
      data: { id: result.insertId, file: evidence_file }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update grant
exports.updateGrant = async (req, res) => {
  try {
    const sessionId = await getCurrentSessionWindow(db);
    const {
      grant_type,
      project_name,
      funding_agency,
      currency,
      grant_amount,
      amount_in_lakhs,
      duration,
      researchers,
      role
    } = req.body;

    const facultyInfoId = await resolveFacultyInfoId({ email: req.user?.email, facultyId: req.user?.id });
    if (!facultyInfoId) {
      return res.status(400).json({ success: false, message: 'Faculty profile not found. Complete onboarding first.' });
    }

    const values = [
      grant_type,
      project_name,
      funding_agency,
      currency,
      grant_amount,
      amount_in_lakhs,
      duration,
      researchers,
      role,
    ];

    let query = `
      UPDATE research_grants
      SET grant_type = ?, project_name = ?, funding_agency = ?, currency = ?, grant_amount = ?,
          amount_in_lakhs = ?, duration = ?, researchers = ?, role = ?
    `;

    if (req.file && req.file.filename) {
      query += ', evidence_file = ?';
      values.push(req.file.filename);
    }

    query += ' WHERE id = ? AND faculty_id = ? AND session_id = ?';
    values.push(req.params.id, facultyInfoId, sessionId);

    const [result] = await db.query(query, values);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Grant not found' });
    }

    res.json({ success: true, message: 'Grant updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all proposals for a faculty
exports.getProposalsByFaculty = async (req, res) => {
  try {
    const facultyInfoId = await resolveFacultyInfoId({ facultyId: req.params.facultyId });
    if (!facultyInfoId) {
      return res.json({ success: true, data: [] });
    }
    const sessionWindow = await getCurrentSessionWindow(db);
    const scoped = appendCreatedAtWindow(
      'SELECT * FROM submitted_proposals WHERE faculty_id = ?',
      [facultyInfoId],
      sessionWindow
    );

    const [rows] = await db.query(
      `${scoped.sql} ORDER BY created_at DESC`,
      scoped.params
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create proposal
exports.createProposal = async (req, res) => {
  try {
    const {
      faculty_id,
      title,
      funding_agency,
      currency,
      grant_amount,
      amount_in_lakhs,
      duration,
      submission_date,
      status,
      role
    } = req.body;
    const sessionId = await getCurrentSessionWindow(db);

    const facultyInfoId = await resolveFacultyInfoId({
      facultyId: faculty_id || req.user?.id,
      email: req.user?.email
    });

    if (!facultyInfoId) {
      return res.status(400).json({ success: false, message: 'Faculty profile not found. Complete onboarding first.' });
    }

    // Validate required fields
    if (!title || !funding_agency) {
      return res.status(400).json({ success: false, message: 'Title and Funding Agency are required' });
    }

    if (!submission_date) {
      return res.status(400).json({ success: false, message: 'Submission date is required' });
    }

    const evidence_file = req.file ? req.file.filename : null;

    // Log for debugging
    console.log('Creating proposal with:', {
      faculty_id: facultyInfoId,
      title,
      funding_agency,
      submission_date,
      evidence_file
    });

    const [result] = await db.query(
      `INSERT INTO submitted_proposals 
      (faculty_id, session_id, title, funding_agency, currency, grant_amount, amount_in_lakhs, 
       duration, submission_date, status, role, evidence_file) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [facultyInfoId, sessionId, title, funding_agency, currency, grant_amount, amount_in_lakhs,
        duration, submission_date, status, role, evidence_file]
    );

    res.status(201).json({
      success: true,
      message: 'Proposal created successfully',
      data: { id: result.insertId, file: evidence_file }
    });
  } catch (error) {
    console.error('Error creating proposal:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update proposal
exports.updateProposal = async (req, res) => {
  try {
    const sessionId = await getCurrentSessionWindow(db);
    const {
      title,
      funding_agency,
      currency,
      grant_amount,
      amount_in_lakhs,
      duration,
      submission_date,
      status,
      role
    } = req.body;

    const facultyInfoId = await resolveFacultyInfoId({ email: req.user?.email, facultyId: req.user?.id });
    if (!facultyInfoId) {
      return res.status(400).json({ success: false, message: 'Faculty profile not found. Complete onboarding first.' });
    }

    const values = [
      title,
      funding_agency,
      currency,
      grant_amount,
      amount_in_lakhs,
      duration,
      submission_date,
      status,
      role,
    ];

    let query = `
      UPDATE submitted_proposals
      SET title = ?, funding_agency = ?, currency = ?, grant_amount = ?, amount_in_lakhs = ?,
          duration = ?, submission_date = ?, status = ?, role = ?
    `;

    if (req.file && req.file.filename) {
      query += ', evidence_file = ?';
      values.push(req.file.filename);
    }

    query += ' WHERE id = ? AND faculty_id = ? AND session_id = ?';
    values.push(req.params.id, facultyInfoId, sessionId);

    const [result] = await db.query(query, values);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Proposal not found' });
    }

    res.json({ success: true, message: 'Proposal updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete grant
exports.deleteGrant = async (req, res) => {
  try {
    const sessionId = await getCurrentSessionWindow(db);
    const facultyInfoId = await resolveFacultyInfoId({ email: req.user?.email, facultyId: req.user?.id });

    if (!facultyInfoId) {
      return res.status(400).json({ success: false, message: 'Faculty profile not found. Complete onboarding first.' });
    }

    await db.query('DELETE FROM research_grants WHERE id = ? AND faculty_id = ? AND session_id = ?', [req.params.id, facultyInfoId, sessionId]);
    res.json({ success: true, message: 'Grant deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete proposal
exports.deleteProposal = async (req, res) => {
  try {
    const sessionId = await getCurrentSessionWindow(db);
    const facultyInfoId = await resolveFacultyInfoId({ email: req.user?.email, facultyId: req.user?.id });

    if (!facultyInfoId) {
      return res.status(400).json({ success: false, message: 'Faculty profile not found. Complete onboarding first.' });
    }

    await db.query('DELETE FROM submitted_proposals WHERE id = ? AND faculty_id = ? AND session_id = ?', [req.params.id, facultyInfoId, sessionId]);
    res.json({ success: true, message: 'Proposal deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
