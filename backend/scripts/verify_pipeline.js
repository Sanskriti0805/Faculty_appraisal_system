const db = require('../config/database');
const { autoAllocateMarks } = require('../services/rubricMapper');

async function verify() {
  try {
    console.log('--- Verifying Pipeline for "abcd" ---');
    
    const facultyId = 9; // abcd
    const academicYear = '2023-24';

    // 1. Insert dummy research publication (Q1 Journal)
    await db.query(`
      INSERT INTO research_publications (faculty_id, publication_type, sub_type, title, year_of_publication)
      VALUES (?, ?, ?, ?, ?)
    `, [facultyId, 'Journal', 'Q1', 'Future of AI', 2023]);

    // 2. Insert dummy course
    await db.query(`
      INSERT INTO courses_taught (faculty_id, course_code, course_name, feedback_score)
      VALUES (?, ?, ?, ?)
    `, [facultyId, 'CS101', 'Intro to CS', 4.5]);

    // 3. Create a submission
    const [subResult] = await db.query(`
      INSERT INTO submissions (faculty_id, academic_year, status)
      VALUES (?, ?, ?)
    `, [facultyId, academicYear, 'draft']);
    const submissionId = subResult.insertId;
    console.log(`Created Submission ID: ${submissionId}`);

    // 4. Trigger Auto-Allocation manually for verification
    await autoAllocateMarks(submissionId, facultyId, academicYear);

    // 5. Check if scores were inserted
    const [scores] = await db.query(`
      SELECT s.*, r.sub_section, r.max_marks 
      FROM dofa_evaluation_scores s
      JOIN dofa_rubrics r ON s.rubric_id = r.id
      WHERE s.submission_id = ?
    `, [submissionId]);

    console.log('--- Allocated Scores ---');
    if (scores.length === 0) {
      console.log('No scores allocated! Something IS WRONG.');
    } else {
      scores.forEach(s => {
        console.log(`- Rubric: ${s.sub_section} | Score: ${s.score} / Max: ${s.max_marks}`);
      });
    }

    console.log('--- Pipeline Verification Complete ---');
    process.exit(0);
  } catch (error) {
    console.error('Verification failed:', error);
    process.exit(1);
  }
}

verify();
