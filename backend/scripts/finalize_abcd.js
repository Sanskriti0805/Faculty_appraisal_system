const db = require('../config/database');

async function run() {
  try {
    // Update submission status to 'submitted'
    const [result] = await db.query(
      "UPDATE submissions SET status = 'submitted' WHERE faculty_id = 9"
    );
    console.log('Rows updated:', result.affectedRows);

    // Verify
    const [rows] = await db.query('SELECT id, faculty_id, status, academic_year FROM submissions WHERE faculty_id = 9');
    console.log('Submissions for abcd:');
    rows.forEach(r => console.log(`  ID: ${r.id} | Status: ${r.status} | AY: ${r.academic_year}`));

    // Verify scores
    const [scores] = await db.query(`
      SELECT s.submission_id, r.section_name, r.sub_section, s.score, r.max_marks
      FROM dofa_evaluation_scores s
      JOIN dofa_rubrics r ON s.rubric_id = r.id
      WHERE s.submission_id IN (SELECT id FROM submissions WHERE faculty_id = 9)
    `);
    console.log('\nAllocated scores:');
    scores.forEach(s => console.log(`  [Sub ${s.submission_id}] ${s.section_name} > ${s.sub_section}: ${s.score}/${s.max_marks}`));

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
run();
