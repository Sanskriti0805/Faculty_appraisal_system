const db = require('../config/database');

// GET /api/evaluation
// Returns: unique sections (cols), submissions (rows), scores, remarks
exports.getEvaluationData = async (req, res) => {
  try {
    // 1. Unique section names preserving first-appearance order
    const [sectionRows] = await db.query(
      'SELECT section_name, MIN(id) as first_id FROM dofa_rubrics GROUP BY section_name ORDER BY first_id ASC'
    );
    const sections = sectionRows.map(r => r.section_name);

    // 2. Faculty submissions (submitted/under_review/approved/sent_back)
    const [submissions] = await db.query(`
      SELECT s.id as submission_id, s.status, s.academic_year,
             u.id as faculty_id, u.name as faculty_name, u.department, u.email
      FROM submissions s
      JOIN users u ON s.faculty_id = u.id
      WHERE s.status IN ('submitted','under_review','approved','sent_back')
      ORDER BY u.name ASC
    `);

    if (submissions.length === 0) {
      return res.json({ success: true, sections, submissions: [], scores: [], remarks: [] });
    }

    const submissionIds = submissions.map(s => s.submission_id);
    const placeholders = submissionIds.map(() => '?').join(',');

    // 3. Scores per (submission_id, section_name)
    const [scores] = await db.query(
      `SELECT submission_id, section_name, score FROM dofa_section_scores WHERE submission_id IN (${placeholders})`,
      submissionIds
    );

    // 4. Remarks per submission
    const [remarks] = await db.query(
      `SELECT submission_id, remark FROM dofa_evaluation_remarks WHERE submission_id IN (${placeholders}) ORDER BY updated_at DESC`,
      submissionIds
    );

    res.json({ success: true, sections, submissions, scores, remarks });
  } catch (error) {
    console.error('Evaluation fetch error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/evaluation/scores
// Body: { submission_id, section_name, score }
exports.saveScore = async (req, res) => {
  try {
    const { submission_id, section_name, score } = req.body;

    if (!submission_id || !section_name) {
      return res.status(400).json({ success: false, message: 'submission_id and section_name required' });
    }

    // Get total max_marks for this section
    const [maxRows] = await db.query(
      'SELECT SUM(max_marks) as total_max FROM dofa_rubrics WHERE section_name = ?',
      [section_name]
    );
    const totalMax = parseFloat(maxRows[0]?.total_max) || Infinity;

    if (parseFloat(score) > totalMax) {
      return res.status(400).json({
        success: false,
        message: `Score ${score} exceeds max marks of ${totalMax} for section "${section_name}"`
      });
    }

    await db.query(`
      INSERT INTO dofa_section_scores (submission_id, section_name, score)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE score = VALUES(score), updated_at = CURRENT_TIMESTAMP
    `, [submission_id, section_name, parseFloat(score) || 0]);

    res.json({ success: true, message: 'Score saved' });
  } catch (error) {
    console.error('Score save error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/evaluation/remarks
// Body: { submission_id, remark }
exports.saveRemark = async (req, res) => {
  try {
    const { submission_id, remark, created_by } = req.body;

    if (!submission_id) {
      return res.status(400).json({ success: false, message: 'submission_id required' });
    }

    const [existing] = await db.query(
      'SELECT id FROM dofa_evaluation_remarks WHERE submission_id = ? ORDER BY created_at DESC LIMIT 1',
      [submission_id]
    );

    if (existing.length > 0) {
      await db.query(
        'UPDATE dofa_evaluation_remarks SET remark = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [remark, existing[0].id]
      );
    } else {
      await db.query(
        'INSERT INTO dofa_evaluation_remarks (submission_id, remark, created_by) VALUES (?, ?, ?)',
        [submission_id, remark, created_by || null]
      );
    }

    res.json({ success: true, message: 'Remark saved' });
  } catch (error) {
    console.error('Remark save error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
