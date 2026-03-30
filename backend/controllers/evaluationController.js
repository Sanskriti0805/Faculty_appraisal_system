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

// GET /api/evaluation/sheet2
exports.getSheet2Data = async (req, res) => {
  try {
    // 1. Get submissions with basic info
    const [submissions] = await db.query(`
      SELECT s.id as submission_id, u.name as faculty_name, u.department, f.designation
      FROM submissions s
      JOIN users u ON s.faculty_id = u.id
      LEFT JOIN faculty_information f ON f.id = u.id
      WHERE s.status IN ('submitted','under_review','approved','sent_back')
      ORDER BY u.name ASC
    `);

    if (submissions.length === 0) {
      return res.json({ success: true, data: [], gradingParameters: [] });
    }

    const submissionIds = submissions.map(s => s.submission_id);

    // 2. Get Sheet 1 total scores (calculated by summing scores)
    const [scores] = await db.query(`
      SELECT submission_id, SUM(score) as total_score
      FROM dofa_evaluation_scores
      WHERE submission_id IN (?)
      GROUP BY submission_id
    `, [submissionIds]);

    const scoreMap = {};
    scores.forEach(s => scoreMap[s.submission_id] = parseFloat(s.total_score) || 0);

    // 3. Get Sheet 2 remarks and grades
    const [sheet2Data] = await db.query(`
      SELECT submission_id, research_remarks, overall_feedback, teaching_feedback, final_grade
      FROM dofa_evaluation_sheet2
      WHERE submission_id IN (?)
    `, [submissionIds]);

    const sheet2Map = {};
    sheet2Data.forEach(s => sheet2Map[s.submission_id] = s);

    // 4. Get Grading Parameters
    const [gradingParams] = await db.query('SELECT * FROM dofa_grading_parameters ORDER BY threshold_value DESC');

    const result = submissions.map(sub => ({
      ...sub,
      total_score: scoreMap[sub.submission_id] || 0,
      ...(sheet2Map[sub.submission_id] || {
        research_remarks: '',
        overall_feedback: '',
        teaching_feedback: '',
        final_grade: ''
      })
    }));

    res.json({ success: true, data: result, gradingParameters: gradingParams });
  } catch (error) {
    console.error('Sheet 2 fetch error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/evaluation/sheet2/remarks
exports.saveSheet2Remarks = async (req, res) => {
  try {
    const { submission_id, field, value } = req.body;
    const allowedFields = ['research_remarks', 'overall_feedback', 'teaching_feedback', 'final_grade'];
    
    if (!submission_id || !allowedFields.includes(field)) {
      return res.status(400).json({ success: false, message: 'Invalid request' });
    }

    await db.query(`
      INSERT INTO dofa_evaluation_sheet2 (submission_id, ${field})
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE ${field} = VALUES(${field})
    `, [submission_id, value]);

    res.json({ success: true, message: 'Updated successfully' });
  } catch (error) {
    console.error('Sheet 2 remark save error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/evaluation/grading-parameters
exports.getGradingParameters = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM dofa_grading_parameters ORDER BY threshold_value DESC');
    res.json({ success: true, parameters: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/evaluation/grading-parameters
exports.saveGradingParameters = async (req, res) => {
  try {
    const { parameters } = req.body; // Array of {condition_op, threshold_value, grade}
    
    // Simple approach: Delete all and re-insert
    await db.query('DELETE FROM dofa_grading_parameters');
    
    if (parameters && parameters.length > 0) {
      const values = parameters.map(p => [p.condition_op, p.threshold_value, p.grade]);
      await db.query('INSERT INTO dofa_grading_parameters (condition_op, threshold_value, grade) VALUES ?', [values]);
    }
    
    res.json({ success: true, message: 'Parameters saved' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/evaluation/apply-grading
exports.applyGrading = async (req, res) => {
  try {
    // 1. Fetch all total scores
    const [scores] = await db.query(`
      SELECT submission_id, SUM(score) as total_score
      FROM dofa_evaluation_scores
      GROUP BY submission_id
    `);

    // 2. Fetch parameters
    const [params] = await db.query('SELECT * FROM dofa_grading_parameters ORDER BY threshold_value DESC');

    if (params.length === 0) {
      return res.status(400).json({ success: false, message: 'No grading parameters defined' });
    }

    // 3. Apply logic for each submission
    for (const s of scores) {
      const ts = parseFloat(s.total_score);
      let assignedGrade = '';

      for (const p of params) {
        const threshold = parseFloat(p.threshold_value);
        let match = false;
        switch (p.condition_op) {
          case '>': match = ts > threshold; break;
          case '<': match = ts < threshold; break;
          case '>=': match = ts >= threshold; break;
          case '<=': match = ts <= threshold; break;
          case '=': match = ts === threshold; break;
          default: break;
        }
        if (match) {
          assignedGrade = p.grade;
          break; // Stop at first match (since they are ordered)
        }
      }

      if (assignedGrade) {
        await db.query(`
          INSERT INTO dofa_evaluation_sheet2 (submission_id, final_grade)
          VALUES (?, ?)
          ON DUPLICATE KEY UPDATE final_grade = VALUES(final_grade)
        `, [s.submission_id, assignedGrade]);
      }
    }

    res.json({ success: true, message: 'Grading applied successfully' });
  } catch (error) {
    console.error('Apply grading error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/evaluation/sheet3
exports.getSheet3Data = async (req, res) => {
  try {
    // 1. Get submissions with Name, Dept, Score (Sheet 1) and Grade (Sheet 2)
    const [submissions] = await db.query(`
      SELECT s.id as submission_id, u.name as faculty_name, u.department,
             (SELECT SUM(score) FROM dofa_evaluation_scores WHERE submission_id = s.id) as total_score,
             e2.final_grade,
             e3.increment_percentage
      FROM submissions s
      JOIN users u ON s.faculty_id = u.id
      LEFT JOIN dofa_evaluation_sheet2 e2 ON e2.submission_id = s.id
      LEFT JOIN dofa_evaluation_sheet3 e3 ON e3.submission_id = s.id
      WHERE s.status IN ('submitted','under_review','approved','sent_back')
      ORDER BY u.name ASC
    `);

    // 2. Get unique grades for the configuration UI
    const [grades] = await db.query(`
      SELECT DISTINCT final_grade 
      FROM dofa_evaluation_sheet2 
      WHERE final_grade IS NOT NULL AND final_grade != ''
    `);

    // 3. Get existing grade-increment mappings
    const [increments] = await db.query('SELECT * FROM dofa_grade_increments');

    res.json({ 
      success: true, 
      data: submissions, 
      availableGrades: grades.map(g => g.final_grade),
      gradeIncrements: increments 
    });
  } catch (error) {
    console.error('Sheet 3 fetch error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/evaluation/grade-increments
exports.getGradeIncrements = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM dofa_grade_increments');
    res.json({ success: true, increments: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/evaluation/grade-increments
exports.saveGradeIncrements = async (req, res) => {
  try {
    const { increments } = req.body; // Array of {grade, increment_percentage}
    
    // We can use INSERT ... ON DUPLICATE KEY UPDATE or delete and re-insert
    await db.query('DELETE FROM dofa_grade_increments');
    
    if (increments && increments.length > 0) {
      const values = increments.map(i => [i.grade, parseFloat(i.increment_percentage) || 0]);
      await db.query('INSERT INTO dofa_grade_increments (grade, increment_percentage) VALUES ?', [values]);
    }
    
    res.json({ success: true, message: 'Grade increments saved' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/evaluation/apply-increments
exports.applyIncrements = async (req, res) => {
  try {
    // 1. Get all submissions with grades
    const [submissions] = await db.query('SELECT submission_id, final_grade FROM dofa_evaluation_sheet2 WHERE final_grade IS NOT NULL');
    
    // 2. Get mapping
    const [mappingRows] = await db.query('SELECT * FROM dofa_grade_increments');
    const mapping = {};
    mappingRows.forEach(row => mapping[row.grade] = row.increment_percentage);

    // 3. Apply increments
    for (const sub of submissions) {
      const inc = mapping[sub.final_grade];
      if (inc !== undefined) {
        await db.query(`
          INSERT INTO dofa_evaluation_sheet3 (submission_id, increment_percentage)
          VALUES (?, ?)
          ON DUPLICATE KEY UPDATE increment_percentage = VALUES(increment_percentage)
        `, [sub.submission_id, inc]);
      }
    }

    res.json({ success: true, message: 'Increments applied successfully' });
  } catch (error) {
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
