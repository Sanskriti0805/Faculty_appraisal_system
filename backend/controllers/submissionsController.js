const db = require('../config/database');
const { autoAllocateMarks } = require('../services/rubricMapper');

// GET /api/submissions/my — get or create draft submission for logged-in faculty
exports.getMySubmission = async (req, res) => {
  try {
    const facultyId = req.user.id;
    const academicYear = getCurrentAcademicYear();

    // Find existing submission for this faculty + year
    const [rows] = await db.query(
      'SELECT * FROM submissions WHERE faculty_id = ? AND academic_year = ? ORDER BY created_at DESC LIMIT 1',
      [facultyId, academicYear]
    );

    if (rows.length > 0) {
      return res.json({ success: true, data: rows[0] });
    }

    // Create new draft submission
    const [result] = await db.query(
      'INSERT INTO submissions (faculty_id, academic_year, form_type, status) VALUES (?, ?, ?, ?)',
      [facultyId, academicYear, 'A', 'draft']
    );

    const [newRow] = await db.query('SELECT * FROM submissions WHERE id = ?', [result.insertId]);
    res.json({ success: true, data: newRow[0] });
  } catch (error) {
    console.error('getMySubmission error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Helper: returns current academic year string, e.g. "2024-25"
function getCurrentAcademicYear() {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-12
  const year = now.getFullYear();
  // Academic year starts in July: before July → previous-current, from July → current-next
  if (month >= 7) {
    return `${year}-${String(year + 1).slice(-2)}`;
  } else {
    return `${year - 1}-${String(year).slice(-2)}`;
  }
}



// Get all submissions with filters
exports.getAllSubmissions = async (req, res) => {
  try {
    const { status, academic_year, faculty_id } = req.query;

    let query = `
      SELECT s.*, u.name as faculty_name, u.department, u.email,
             a.name as approved_by_name
      FROM submissions s
      JOIN users u ON s.faculty_id = u.id
      LEFT JOIN users a ON s.approved_by = a.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ' AND s.status = ?';
      params.push(status);
    }
    if (academic_year) {
      query += ' AND s.academic_year = ?';
      params.push(academic_year);
    }
    if (faculty_id) {
      query += ' AND s.faculty_id = ?';
      params.push(faculty_id);
    }

    query += ' ORDER BY s.created_at DESC';

    const [rows] = await db.query(query, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get submission by ID with all details
exports.getSubmissionById = async (req, res) => {
  try {
    const { id } = req.params;

    // Get submission details
    const [submission] = await db.query(`
      SELECT s.*, u.name as faculty_name, u.department, u.email, u.designation,
             a.name as approved_by_name
      FROM submissions s
      JOIN users u ON s.faculty_id = u.id
      LEFT JOIN users a ON s.approved_by = a.id
      WHERE s.id = ?
    `, [id]);

    if (submission.length === 0) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    const sub = submission[0];
    const facultyId = sub.faculty_id;
    const academicYear = sub.academic_year;

    // Helper to get year from academic_year string (e.g. "2025-26" -> 2025)
    const yearNum = academicYear.split('-')[0];

    // Get faculty information
    const [facultyInfo] = await db.query('SELECT * FROM faculty_information WHERE id = ?', [facultyId]);

    // Get courses taught
    const [courses] = await db.query('SELECT * FROM courses_taught WHERE faculty_id = ?', [facultyId]);

    // Get publications - Filter by year if possible, but keep all as requested for now if no specific year matching logic exists
    const [publications] = await db.query('SELECT * FROM research_publications WHERE faculty_id = ? AND year_of_publication >= ?', [facultyId, yearNum]);

    // Get grants
    const [grants] = await db.query('SELECT * FROM research_grants WHERE faculty_id = ?', [facultyId]);

    // Get patents
    const [patents] = await db.query('SELECT * FROM patents WHERE faculty_id = ?', [facultyId]);

    // Get awards
    const [awards] = await db.query('SELECT * FROM awards_honours WHERE faculty_id = ? AND year >= ?', [facultyId, yearNum]);

    // Get new courses developed
    const [newCourses] = await db.query('SELECT * FROM new_courses WHERE faculty_id = ?', [facultyId]);

    // Get submitted proposals
    const [proposals] = await db.query('SELECT * FROM submitted_proposals WHERE faculty_id = ?', [facultyId]);

    // Get paper reviews
    const [paperReviews] = await db.query('SELECT * FROM paper_reviews WHERE faculty_id = ?', [facultyId]);

    // Get technology transfer
    const [techTransfer] = await db.query('SELECT * FROM technology_transfer WHERE faculty_id = ?', [facultyId]);

    // Get conference sessions
    const [conferenceSessions] = await db.query('SELECT * FROM conference_sessions WHERE faculty_id = ?', [facultyId]);

    // Get keynotes and talks
    const [keynotesTalks] = await db.query('SELECT * FROM keynotes_talks WHERE faculty_id = ?', [facultyId]);

    // Get consultancy
    const [consultancy] = await db.query('SELECT * FROM consultancy WHERE faculty_id = ? AND year >= ?', [facultyId, yearNum]);

    // Get teaching innovation
    const [teachingInnovation] = await db.query('SELECT * FROM teaching_innovation WHERE faculty_id = ?', [facultyId]);

    // Get institutional contributions
    const [institutionalContributions] = await db.query('SELECT * FROM institutional_contributions WHERE faculty_id = ?', [facultyId]);

    // Get Part B goals
    const [goals] = await db.query('SELECT * FROM faculty_goals WHERE faculty_id = ?', [facultyId]);

    // Get review comments
    const [comments] = await db.query(`
      SELECT rc.*, u.name as reviewer_name
      FROM review_comments rc
      LEFT JOIN users u ON rc.reviewer_id = u.id
      WHERE rc.submission_id = ?
      ORDER BY rc.created_at DESC
    `, [id]);

    res.json({
      success: true,
      data: {
        submission: sub,
        facultyInfo: facultyInfo[0] || {},
        courses: courses || [],
        publications: publications || [],
        grants: grants || [],
        patents: patents || [],
        awards: awards || [],
        newCourses: newCourses || [],
        proposals: proposals || [],
        paperReviews: paperReviews || [],
        techTransfer: techTransfer || [],
        conferenceSessions: conferenceSessions || [],
        keynotesTalks: keynotesTalks || [],
        consultancy: consultancy || [],
        teachingInnovation: teachingInnovation || [],
        institutionalContributions: institutionalContributions || [],
        goals: goals || [],
        comments: comments || []
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create new submission
exports.createSubmission = async (req, res) => {
  try {
    const { faculty_id, academic_year, form_type } = req.body;

    const [result] = await db.query(
      'INSERT INTO submissions (faculty_id, academic_year, form_type, status) VALUES (?, ?, ?, ?)',
      [faculty_id, academic_year, form_type || 'A', 'draft']
    );

    res.status(201).json({
      success: true,
      message: 'Submission created successfully',
      data: { id: result.insertId }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update submission status
exports.updateSubmissionStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, approved_by } = req.body;

    let query = 'UPDATE submissions SET status = ?';
    const params = [status];

    if (status === 'submitted') {
      query += ', submitted_at = CURRENT_TIMESTAMP';
    }

    if (status === 'approved' && approved_by) {
      query += ', approved_by = ?, approved_at = CURRENT_TIMESTAMP';
      params.push(approved_by);
    }

    query += ' WHERE id = ?';
    params.push(id);

    const [result] = await db.query(query, params);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    // Trigger auto-allocation if status is 'submitted'
    if (status === 'submitted') {
      try {
        // Get faculty_id and academic_year for the submission
        const [subDetails] = await db.query('SELECT faculty_id, academic_year FROM submissions WHERE id = ?', [id]);
        if (subDetails.length > 0) {
          const { faculty_id, academic_year } = subDetails[0];
          await autoAllocateMarks(id, faculty_id, academic_year);
        }
      } catch (err) {
        console.error('Failed to trigger auto-allocation:', err);
      }
    }

    res.json({ success: true, message: 'Submission status updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Save consultancy
exports.saveConsultancy = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const { faculty_id, consultancy } = req.body;

    await connection.query('DELETE FROM consultancy WHERE faculty_id = ?', [faculty_id]);

    if (consultancy && Array.isArray(consultancy)) {
      for (const item of consultancy) {
        await connection.query(
          `INSERT INTO consultancy 
          (faculty_id, organization, project_title, role, duration, amount, year) 
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [faculty_id, item.organisation, item.project, item.role, item.duration, item.amount, item.year]
        );
      }
    }

    await connection.commit();
    res.json({ success: true, message: 'Consultancy saved successfully' });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ success: false, message: error.message });
  } finally {
    connection.release();
  }
};
// Get submission statistics
exports.getSubmissionStats = async (req, res) => {
  try {
    const { academic_year } = req.query;
    let whereClause = academic_year ? 'WHERE academic_year = ?' : '';
    const params = academic_year ? [academic_year] : [];

    const [stats] = await db.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft,
        SUM(CASE WHEN status = 'submitted' THEN 1 ELSE 0 END) as submitted,
        SUM(CASE WHEN status = 'under_review' THEN 1 ELSE 0 END) as under_review,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'sent_back' THEN 1 ELSE 0 END) as sent_back
      FROM submissions
      ${whereClause}
    `, params);

    const [totalFaculty] = await db.query("SELECT COUNT(*) as total FROM users WHERE role = 'faculty'");

    res.json({
      success: true,
      data: {
        totalFaculty: totalFaculty[0].total,
        totalSubmissions: stats[0].total,
        draft: stats[0].draft,
        submitted: stats[0].submitted,
        underReview: stats[0].under_review,
        approved: stats[0].approved,
        sentBack: stats[0].sent_back,
        pending: stats[0].submitted + stats[0].under_review
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Lock/Unlock submission
exports.toggleSubmissionLock = async (req, res) => {
  try {
    const { id } = req.params;
    const { locked, locked_by } = req.body;

    // Update submission lock status
    await db.query('UPDATE submissions SET locked = ? WHERE id = ?', [locked, id]);

    // Record lock/unlock event
    if (locked) {
      await db.query(
        'INSERT INTO submission_locks (submission_id, locked_by, is_locked) VALUES (?, ?, ?)',
        [id, locked_by, true]
      );
    } else {
      await db.query(
        'UPDATE submission_locks SET is_locked = ?, unlocked_at = CURRENT_TIMESTAMP WHERE submission_id = ? AND is_locked = ?',
        [false, id, true]
      );
    }

    res.json({
      success: true,
      message: locked ? 'Submission locked successfully' : 'Submission unlocked successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
