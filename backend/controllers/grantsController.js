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

  return null;
};

// Get all grants for a faculty
exports.getGrantsByFaculty = async (req, res) => {
  try {
    const facultyInfoId = await resolveFacultyInfoId({ facultyId: req.params.facultyId });
    if (!facultyInfoId) {
      return res.json({ success: true, data: [] });
    }

    const [rows] = await db.query(
      'SELECT * FROM research_grants WHERE faculty_id = ? ORDER BY created_at DESC',
      [facultyInfoId]
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
      (faculty_id, grant_type, project_name, funding_agency, currency, grant_amount, 
       amount_in_lakhs, duration, researchers, role, evidence_file) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [facultyInfoId, grant_type, project_name, funding_agency, currency, grant_amount,
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

    query += ' WHERE id = ? AND faculty_id = ?';
    values.push(req.params.id, facultyInfoId);

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

    const [rows] = await db.query(
      'SELECT * FROM submitted_proposals WHERE faculty_id = ? ORDER BY created_at DESC',
      [facultyInfoId]
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

    const facultyInfoId = await resolveFacultyInfoId({
      facultyId: faculty_id || req.user?.id,
      email: req.user?.email
    });

    if (!facultyInfoId) {
      return res.status(400).json({ success: false, message: 'Faculty profile not found. Complete onboarding first.' });
    }

    const evidence_file = req.file ? req.file.filename : null;

    const [result] = await db.query(
      `INSERT INTO submitted_proposals 
      (faculty_id, title, funding_agency, currency, grant_amount, amount_in_lakhs, 
       duration, submission_date, status, role, evidence_file) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [facultyInfoId, title, funding_agency, currency, grant_amount, amount_in_lakhs,
        duration, submission_date, status, role, evidence_file]
    );

    res.status(201).json({
      success: true,
      message: 'Proposal created successfully',
      data: { id: result.insertId, file: evidence_file }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update proposal
exports.updateProposal = async (req, res) => {
  try {
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

    query += ' WHERE id = ? AND faculty_id = ?';
    values.push(req.params.id, facultyInfoId);

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
    const facultyInfoId = await resolveFacultyInfoId({ email: req.user?.email, facultyId: req.user?.id });

    if (!facultyInfoId) {
      return res.status(400).json({ success: false, message: 'Faculty profile not found. Complete onboarding first.' });
    }

    await db.query('DELETE FROM research_grants WHERE id = ? AND faculty_id = ?', [req.params.id, facultyInfoId]);
    res.json({ success: true, message: 'Grant deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete proposal
exports.deleteProposal = async (req, res) => {
  try {
    const facultyInfoId = await resolveFacultyInfoId({ email: req.user?.email, facultyId: req.user?.id });

    if (!facultyInfoId) {
      return res.status(400).json({ success: false, message: 'Faculty profile not found. Complete onboarding first.' });
    }

    await db.query('DELETE FROM submitted_proposals WHERE id = ? AND faculty_id = ?', [req.params.id, facultyInfoId]);
    res.json({ success: true, message: 'Proposal deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
