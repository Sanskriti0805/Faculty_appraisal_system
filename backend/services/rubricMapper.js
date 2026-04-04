const db = require('../config/database');

/**
 * Maps rubric items to database checks.
 * Simplistic Logic: If ANY record exists in the corresponding table for the faculty, award MAX MARKS.
 */
const autoAllocateMarks = async (submissionId, facultyId, academicYear) => {
  try {
    console.log(`Auto-allocating marks for Submission: ${submissionId}, Faculty: ${facultyId}`);
    
    // 1. Get all rubrics
    const [rubrics] = await db.query('SELECT id, section_name, sub_section, max_marks FROM dofa_rubrics');
    
    // 2. Fetch all faculty data categories
    const [publications] = await db.query('SELECT * FROM research_publications WHERE faculty_id = ?', [facultyId]);
    const [courses] = await db.query('SELECT * FROM courses_taught WHERE faculty_id = ?', [facultyId]);
    const [newCourses] = await db.query('SELECT * FROM new_courses WHERE faculty_id = ?', [facultyId]);
    const [grants] = await db.query('SELECT * FROM research_grants WHERE faculty_id = ?', [facultyId]);
    const [patents] = await db.query('SELECT * FROM patents WHERE faculty_id = ?', [facultyId]);
    const [consultancy] = await db.query('SELECT * FROM consultancy WHERE faculty_id = ?', [facultyId]);
    const [awards] = await db.query('SELECT * FROM awards_honours WHERE faculty_id = ?', [facultyId]);
    const [proposals] = await db.query('SELECT * FROM submitted_proposals WHERE faculty_id = ?', [facultyId]);
    const [techTransfer] = await db.query('SELECT * FROM technology_transfer WHERE faculty_id = ?', [facultyId]);
    const [reviews] = await db.query('SELECT * FROM paper_reviews WHERE faculty_id = ?', [facultyId]);
    const [talks] = await db.query('SELECT * FROM keynotes_talks WHERE faculty_id = ?', [facultyId]);
    const [sessions] = await db.query('SELECT * FROM conference_sessions WHERE faculty_id = ?', [facultyId]);
    const [contribs] = await db.query('SELECT * FROM institutional_contributions WHERE faculty_id = ?', [facultyId]);

    const scoresToInsert = [];

    for (const rubric of rubrics) {
      let hasData = false;
      const sub = rubric.sub_section.toLowerCase();
      const sec = rubric.section_name.toLowerCase();

      // Mapping Logic
      if (sec.includes('teaching feedback')) {
          // Check if any course has a feedback score >= 3 (placeholder logic)
          hasData = courses.some(c => parseFloat(c.feedback_score) >= 3);
      } else if (sec.includes('research guidance')) {
          // Placeholder: mapping to goals or actual guidance table if it existed
          hasData = false; 
      } else if (sec.includes('new courses')) {
          hasData = newCourses.length > 0;
      } else if (sec.includes('research publications')) {
          if (sub.includes('q1')) hasData = publications.some(p => (p.sub_type||'').includes('Q1'));
          else if (sub.includes('q2')) hasData = publications.some(p => (p.sub_type||'').includes('Q2'));
          else if (sub.includes('q3')) hasData = publications.some(p => (p.sub_type||'').includes('Q3'));
          else hasData = publications.length > 0;
      } else if (sec.includes('conference')) {
          hasData = publications.some(p => (p.publication_type||'').toLowerCase().includes('conference'));
      } else if (sec.includes('sponsored project')) {
          if (sub.includes('proposal')) hasData = proposals.length > 0;
          else hasData = grants.length > 0;
      } else if (sec.includes('patent')) {
          hasData = patents.length > 0;
      } else if (sec.includes('technology contribution')) {
          hasData = techTransfer.length > 0;
      } else if (sec.includes('review of research papers')) {
          hasData = reviews.length > 0;
      } else if (sec.includes('talks and conferences')) {
          hasData = talks.length > 0 || sessions.length > 0;
      } else if (sec.includes('visits/honours/consultancy')) {
          if (sub.includes('honours')) hasData = awards.length > 0;
          else if (sub.includes('consultancy')) hasData = consultancy.length > 0;
          else hasData = false;
      } else if (sec.includes('institutional contributions')) {
          hasData = contribs.length > 0;
      }

      if (hasData) {
        scoresToInsert.push([submissionId, rubric.id, rubric.max_marks]);
      }
    }

    if (scoresToInsert.length > 0) {
      await db.query(`
        INSERT INTO dofa_evaluation_scores (submission_id, rubric_id, score)
        VALUES ?
        ON DUPLICATE KEY UPDATE score = VALUES(score)
      `, [scoresToInsert]);
      console.log(`Successfully allocated ${scoresToInsert.length} marks for items.`);
    }

    return true;
  } catch (error) {
    console.error('Auto-allocation error:', error);
    return false;
  }
};

module.exports = { autoAllocateMarks };
