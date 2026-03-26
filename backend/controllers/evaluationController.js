const db = require('../config/database');

// GET /api/evaluation
// Returns: rubrics (granular), submissions, scores (granular), remarks
exports.getEvaluationData = async (req, res) => {
  try {
    // 1. All rubrics for the evaluation structure
    const [rubrics] = await db.query(
      'SELECT id, section_name, sub_section, max_marks FROM dofa_rubrics ORDER BY id ASC'
    );

    // 2. Faculty submissions
    const [submissions] = await db.query(`
      SELECT s.id as submission_id, s.status, s.academic_year,
             u.id as faculty_id, u.name as faculty_name, u.department, u.email,
             f.designation, f.date_of_joining
      FROM submissions s
      JOIN users u ON s.faculty_id = u.id
      LEFT JOIN faculty_information f ON f.id = u.id
      WHERE s.status IN ('submitted','under_review','approved','sent_back')
      ORDER BY u.name ASC
    `);

    if (submissions.length === 0) {
      return res.json({ success: true, rubrics, submissions: [], scores: [], remarks: [] });
    }

    const submissionIds = submissions.map(s => s.submission_id);
    const placeholders = submissionIds.map(() => '?').join(',');

    // 3. Scores per (submission_id, rubric_id)
    const [scores] = await db.query(
      `SELECT submission_id, rubric_id, score FROM dofa_evaluation_scores WHERE submission_id IN (${placeholders})`,
      submissionIds
    );

    // 4. Remarks per submission
    const [remarks] = await db.query(
      `SELECT submission_id, remark FROM dofa_evaluation_remarks WHERE submission_id IN (${placeholders}) ORDER BY updated_at DESC`,
      submissionIds
    );

    res.json({ success: true, rubrics, submissions, scores, remarks });
  } catch (error) {
    console.error('Evaluation fetch error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/evaluation/scores
// Body: { submission_id, rubric_id, score }
exports.saveScore = async (req, res) => {
  try {
    const { submission_id, rubric_id, score } = req.body;

    if (!submission_id || !rubric_id) {
      return res.status(400).json({ success: false, message: 'submission_id and rubric_id required' });
    }

    // Validate against max marks
    const [rubricRows] = await db.query(
      'SELECT max_marks FROM dofa_rubrics WHERE id = ?',
      [rubric_id]
    );
    
    if (rubricRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Rubric not found' });
    }

    const maxMarks = parseFloat(rubricRows[0].max_marks);
    if (parseFloat(score) > maxMarks) {
      return res.status(400).json({
        success: false,
        message: `Score ${score} exceeds max marks of ${maxMarks} for this item`
      });
    }

    await db.query(`
      INSERT INTO dofa_evaluation_scores (submission_id, rubric_id, score)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE score = VALUES(score), updated_at = CURRENT_TIMESTAMP
    `, [submission_id, rubric_id, parseFloat(score) || 0]);

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
