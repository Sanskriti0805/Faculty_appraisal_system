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
      `SELECT es.submission_id, es.rubric_id, es.score
       FROM dofa_evaluation_scores es
       INNER JOIN (
         SELECT submission_id, rubric_id, MAX(id) AS latest_id
         FROM dofa_evaluation_scores
         WHERE submission_id IN (${placeholders})
         GROUP BY submission_id, rubric_id
       ) latest ON latest.latest_id = es.id`,
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
      SELECT latest.submission_id, SUM(latest.score) as total_score
      FROM (
        SELECT es.submission_id, es.rubric_id, es.score
        FROM dofa_evaluation_scores es
        INNER JOIN (
          SELECT submission_id, rubric_id, MAX(id) AS latest_id
          FROM dofa_evaluation_scores
          WHERE submission_id IN (?)
          GROUP BY submission_id, rubric_id
        ) m ON m.latest_id = es.id
      ) latest
      INNER JOIN dofa_rubrics r ON r.id = latest.rubric_id
      GROUP BY latest.submission_id
    `, [submissionIds]);

    const scoreMap = {};
    scores.forEach(s => scoreMap[s.submission_id] = parseFloat(s.total_score) || 0);

    // 3. Get Sheet 2 remarks and grades
    const [sheet2Data] = await db.query(`
      SELECT e2.submission_id, e2.research_remarks, e2.overall_feedback, e2.teaching_feedback, e2.final_grade
      FROM dofa_evaluation_sheet2 e2
      INNER JOIN (
        SELECT submission_id, MAX(id) AS latest_id
        FROM dofa_evaluation_sheet2
        WHERE submission_id IN (?)
        GROUP BY submission_id
      ) latest ON latest.latest_id = e2.id
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

    const [subRows] = await db.query('SELECT faculty_id, academic_year FROM submissions WHERE id = ?', [submission_id]);
    if (subRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }
    const { faculty_id, academic_year } = subRows[0];

    // If final_grade is being changed, delete old increment entries for this submission
    // to prevent orphaned records when the grade changes
    if (field === 'final_grade' && value) {
      await db.query(
        'DELETE FROM dofa_evaluation_sheet3 WHERE submission_id = ? AND final_grade != ?',
        [submission_id, value.trim()]
      );
    }

    const normalizedValue = field === 'final_grade' ? String(value || '').trim() : value;

    const [upd] = await db.query(
      `UPDATE dofa_evaluation_sheet2 SET ${field} = ? WHERE submission_id = ?`,
      [normalizedValue, submission_id]
    );

    if (!upd || upd.affectedRows === 0) {
      await db.query(
        `INSERT INTO dofa_evaluation_sheet2 (submission_id, faculty_id, academic_year, ${field}) VALUES (?, ?, ?, ?)`,
        [submission_id, faculty_id, academic_year, normalizedValue]
      );
    }

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
    // 1. Fetch all active submissions with Sheet 1 total scores.
    //    LEFT JOIN keeps submissions with no saved rubric scores (treated as 0).
    const [scores] = await db.query(`
      SELECT s.id as submission_id,
             s.faculty_id,
             s.academic_year,
             COALESCE(SUM(CASE WHEN r.id IS NOT NULL THEN es_latest.score ELSE 0 END), 0) as total_score
      FROM submissions s
      LEFT JOIN (
        SELECT es.submission_id, es.rubric_id, es.score
        FROM dofa_evaluation_scores es
        INNER JOIN (
          SELECT submission_id, rubric_id, MAX(id) AS latest_id
          FROM dofa_evaluation_scores
          GROUP BY submission_id, rubric_id
        ) m ON m.latest_id = es.id
      ) es_latest ON es_latest.submission_id = s.id
      LEFT JOIN dofa_rubrics r ON r.id = es_latest.rubric_id
      WHERE s.status IN ('submitted','under_review','approved','sent_back')
      GROUP BY s.id, s.faculty_id, s.academic_year
    `);

    // 2. Fetch parameters
    const [params] = await db.query('SELECT * FROM dofa_grading_parameters ORDER BY threshold_value DESC');

    if (params.length === 0) {
      return res.status(400).json({ success: false, message: 'No grading parameters defined' });
    }

    // 3. Apply logic for each submission and always persist the latest grade.
    //    This clears stale legacy grades (e.g., removed AB) when no rule matches.
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

      const [upd] = await db.query(
        'UPDATE dofa_evaluation_sheet2 SET final_grade = ? WHERE submission_id = ?',
        [assignedGrade, s.submission_id]
      );

      if (!upd || upd.affectedRows === 0) {
        await db.query(
          'INSERT INTO dofa_evaluation_sheet2 (submission_id, faculty_id, academic_year, final_grade) VALUES (?, ?, ?, ?)',
          [s.submission_id, s.faculty_id, s.academic_year, assignedGrade]
        );
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
    // 1. Get submissions with Name, Dept, Score (Sheet 1), Grade (Sheet 2) and Increment (Sheet 3)
    // Use proper joins to get only the latest/correct increment for each submission
    const [submissions] = await db.query(`
      SELECT s.id as submission_id, 
             u.name as faculty_name, 
             u.department,
             (
               SELECT COALESCE(SUM(esd.score), 0)
               FROM (
                 SELECT es1.rubric_id, es1.score
                 FROM dofa_evaluation_scores es1
                 INNER JOIN (
                   SELECT rubric_id, MAX(id) AS latest_id
                   FROM dofa_evaluation_scores
                   WHERE submission_id = s.id
                   GROUP BY rubric_id
                 ) m ON m.latest_id = es1.id
               ) esd
               INNER JOIN dofa_rubrics r ON r.id = esd.rubric_id
             ) as total_score,
             COALESCE(e2.final_grade, '') as final_grade,
             COALESCE(e3.increment_percentage, 0) as increment_percentage
      FROM submissions s
      JOIN users u ON s.faculty_id = u.id
      LEFT JOIN dofa_evaluation_sheet2 e2 ON e2.id = (
        SELECT MAX(e2x.id)
        FROM dofa_evaluation_sheet2 e2x
        WHERE e2x.submission_id = s.id
      )
      LEFT JOIN dofa_evaluation_sheet3 e3 ON e3.id = (
        SELECT MAX(e3x.id)
        FROM dofa_evaluation_sheet3 e3x
        WHERE e3x.submission_id = s.id
      )
      WHERE s.status IN ('submitted','under_review','approved','sent_back')
      ORDER BY u.name ASC
    `);

    // 2. Get unique grades for the configuration UI
    const [grades] = await db.query(`
      SELECT DISTINCT TRIM(e2.final_grade) AS final_grade
      FROM submissions s
      INNER JOIN dofa_evaluation_sheet2 e2 ON e2.id = (
        SELECT MAX(e2x.id)
        FROM dofa_evaluation_sheet2 e2x
        WHERE e2x.submission_id = s.id
      )
      WHERE s.status IN ('submitted','under_review','approved','sent_back')
        AND e2.final_grade IS NOT NULL
        AND TRIM(e2.final_grade) != ''
      ORDER BY final_grade ASC
    `);

    // 3. Get existing grade-increment mappings
    const [increments] = await db.query('SELECT * FROM dofa_grade_increments ORDER BY grade ASC');

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
      const cleaned = increments
        .filter(i => i && typeof i.grade === 'string' && i.grade.trim() !== '')
        .map(i => [i.grade.trim(), parseFloat(i.increment_percentage) || 0]);

      if (cleaned.length > 0) {
        await db.query('INSERT INTO dofa_grade_increments (grade, increment_percentage) VALUES ?', [cleaned]);
      }
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
    const [submissions] = await db.query(`
      SELECT e2.submission_id, e2.final_grade, s.faculty_id, s.academic_year
      FROM submissions s
      INNER JOIN dofa_evaluation_sheet2 e2 ON e2.id = (
        SELECT MAX(e2x.id)
        FROM dofa_evaluation_sheet2 e2x
        WHERE e2x.submission_id = s.id
      )
      WHERE s.status IN ('submitted','under_review','approved','sent_back')
        AND e2.final_grade IS NOT NULL
        AND TRIM(e2.final_grade) != ''
    `);
    
    // 2. Get mapping
    const [mappingRows] = await db.query('SELECT * FROM dofa_grade_increments');
    const mapping = {};
    mappingRows.forEach(row => mapping[row.grade] = row.increment_percentage);

    // 3. For each submission, delete old entries with different grades and insert the new one
    for (const sub of submissions) {
      const inc = mapping[sub.final_grade];
      
      // Keep exactly one current row in sheet3 per submission.
      // This removes stale grades and prevents repeated Apply operations from creating duplicates.
      await db.query(`
        DELETE FROM dofa_evaluation_sheet3
        WHERE submission_id = ?
      `, [sub.submission_id]);
      
      // Now insert or update with the correct increment for the current grade
      if (inc !== undefined) {
        await db.query(`
          INSERT INTO dofa_evaluation_sheet3 (submission_id, faculty_id, academic_year, final_grade, increment_percentage)
          VALUES (?, ?, ?, ?, ?)
        `, [sub.submission_id, sub.faculty_id, sub.academic_year, sub.final_grade, inc]);
      } else {
        // If no increment is defined for this grade, still create a record but with NULL increment
        // while preserving one current row for visibility in sheet3.
        await db.query(`
          INSERT INTO dofa_evaluation_sheet3 (submission_id, faculty_id, academic_year, final_grade, increment_percentage)
          VALUES (?, ?, ?, ?, NULL)
        `, [sub.submission_id, sub.faculty_id, sub.academic_year, sub.final_grade]);
      }
    }

    res.json({ success: true, message: 'Increments applied successfully' });
  } catch (error) {
    console.error('Apply increments error:', error);
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

    const numericScore = parseFloat(score) || 0;

    // Update existing rows first so this works even if UNIQUE(submission_id, rubric_id)
    // is missing in a legacy database.
    const [upd] = await db.query(
      'UPDATE dofa_evaluation_scores SET score = ? WHERE submission_id = ? AND rubric_id = ?',
      [numericScore, submission_id, rubric_id]
    );

    if (!upd || upd.affectedRows === 0) {
      await db.query(
        'INSERT INTO dofa_evaluation_scores (submission_id, rubric_id, score) VALUES (?, ?, ?)',
        [submission_id, rubric_id, numericScore]
      );
    }

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

// POST /api/evaluation/rerun-allocation/:submissionId
exports.rerunAllocation = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { autoAllocateMarks } = require('../services/rubricMapper');

    const [rows] = await db.query('SELECT faculty_id, academic_year FROM submissions WHERE id = ?', [submissionId]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    const { faculty_id, academic_year } = rows[0];
    await autoAllocateMarks(submissionId, faculty_id, academic_year);

    // Return updated scores
    const [scores] = await db.query(
      `SELECT es.rubric_id, es.score
       FROM dofa_evaluation_scores es
       INNER JOIN (
         SELECT rubric_id, MAX(id) AS latest_id
         FROM dofa_evaluation_scores
         WHERE submission_id = ?
         GROUP BY rubric_id
       ) latest ON latest.latest_id = es.id
       INNER JOIN dofa_rubrics r ON r.id = es.rubric_id`,
      [submissionId]
    );
    const total = scores.reduce((s, r) => s + parseFloat(r.score || 0), 0);

    res.json({ success: true, message: 'Re-allocation complete', total: total.toFixed(2), scores });
  } catch (error) {
    console.error('Rerun allocation error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
