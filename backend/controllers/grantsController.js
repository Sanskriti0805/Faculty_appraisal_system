const db = require('../config/database');

// Get all grants for a faculty
exports.getGrantsByFaculty = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM research_grants WHERE faculty_id = ? ORDER BY created_at DESC',
      [req.params.facultyId]
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

    const evidence_file = req.file ? req.file.filename : null;
    
    const [result] = await db.query(
      `INSERT INTO research_grants 
      (faculty_id, grant_type, project_name, funding_agency, currency, grant_amount, 
       amount_in_lakhs, duration, researchers, role, evidence_file) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [faculty_id, grant_type, project_name, funding_agency, currency, grant_amount,
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

// Get all proposals for a faculty
exports.getProposalsByFaculty = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM submitted_proposals WHERE faculty_id = ? ORDER BY created_at DESC',
      [req.params.facultyId]
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
    
    const [result] = await db.query(
      `INSERT INTO submitted_proposals 
      (faculty_id, title, funding_agency, currency, grant_amount, amount_in_lakhs, 
       duration, submission_date, status, role) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [faculty_id, title, funding_agency, currency, grant_amount, amount_in_lakhs,
       duration, submission_date, status, role]
    );

    res.status(201).json({
      success: true,
      message: 'Proposal created successfully',
      data: { id: result.insertId }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete grant
exports.deleteGrant = async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM research_grants WHERE id = ?', [req.params.id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Grant not found' });
    }

    res.json({ success: true, message: 'Grant deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete proposal
exports.deleteProposal = async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM submitted_proposals WHERE id = ?', [req.params.id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Proposal not found' });
    }

    res.json({ success: true, message: 'Proposal deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
