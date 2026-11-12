// Rubric changes agreed with Dr. Saurabh Kumar (12 Nov 2026).
//
// Updates an existing Dofa_rubrics table in place so rubric ids (and the scores already stored
// against them) are preserved. Runs once: the "PhD Thesis Reviewer/Examiner" row is the marker.
// Fresh databases are seeded from seed_rubrics.sql, which already contains these values.

const PHD_SECTION = '9. PhD Thesis Reviewer/Examiner';
const PHD_SUB = 'PhD Thesis reviewer/examiner (5 points per thesis, up to a maximum of 10 points) [Tier-1/2 institutes only]';

// Sections after the new PhD section move down by one.
const RENUMBER = [
  ['13. Other activities', '14. Other activities'],
  ['12. Other Institutional Contributions', '13. Other Institutional Contributions'],
  ['11. Visits/Honours/Consultancy', '12. Visits/Honours/Consultancy'],
  ['10. Talks and conferences', '11. Talks and conferences'],
  ['9. Technology Contribution', '10. Technology Contribution']
];

// [section, current sub_section, new sub_section, new max_marks]
const UPDATES = [
  ['3. New Courses designed', 'New Courses designed', 'New Course designed and offered', 4],

  ['5. Conference', 'Tier 1', 'Conference Publication: Tier 1 (B/C)', 6],
  ['5. Conference', 'Tier 2', 'Conference Publication: Tier 2', 4],
  ['5. Conference', 'Tier 3', 'Conference Publication: Tier 3', 3],

  ['7. Sponsored project (approved in AY)', 'Grants received: Value>=20lacs (points for each project for PI)', 'Grants received: 20lacs<=value<50lacs (PI)', 15],
  ['7. Sponsored project (approved in AY)', 'Grants received: Values>=20lacs (points for each project for co-PI)', 'Grants received: 20lacs<=value<50lacs (co-PI)', 7.5],

  ['10. Technology Contribution', 'Technology developed and transferred [3/6/10 points]', 'Technology developed and transferred [3/6/10/15 points]', 15],
  ['10. Technology Contribution', 'Software developed and deployment [3/6/10 points]', 'Software developed and deployment [3/6/10/15 points]', 15],

  ['12. Visits/Honours/Consultancy', 'International Honours', 'International Honours', 15],
  ['12. Visits/Honours/Consultancy', 'National Honours', 'National Honours', 10],
  ['12. Visits/Honours/Consultancy', 'Consultancy Project: Project Value >5 lacs (PI)', 'Consultancy Project: 5 lacs<=Project Value<25 lacs (PI)', 10],
  ['12. Visits/Honours/Consultancy', 'Consultancy Project: Project Value >5 lacs (co-PI)', 'Consultancy Project: 5 lacs<=Project Value<25 lacs (co-PI)', 5],
  ['12. Visits/Honours/Consultancy', 'Consultancy Project: 2 lacs<=Project Value<=5lacs (PI)', 'Consultancy Project: 2 lacs<=Project Value<5 lacs (PI)', 6],
  ['12. Visits/Honours/Consultancy', 'Consultancy Project: 2 lacs<=Project Value<=5lacs (co-PI)', 'Consultancy Project: 2 lacs<=Project Value<5 lacs (co-PI)', 3],

  ['13. Other Institutional Contributions', 'Administrative Positions: Assistant Dean', 'Administrative Positions: Assistant Dean', 10],
  ['13. Other Institutional Contributions', 'Administrative Positions: Hostel Warden/ Mess Warden', 'Administrative Positions: Hostel Warden/ Mess Warden', 7],
  ['13. Other Institutional Contributions', 'Other Significant: Committee Member (up to a maximum of 5 points)', 'Other Significant: Committee Member (up to a maximum of 6 points)', 2],
  ['13. Other Institutional Contributions', 'Other Significant: Member of Major responsibilities (Admissions, Accreditations, etc)', 'Other Significant: Member of Major responsibilities (Admissions, Accreditations, etc) [1-6 points]', 6]
];

// [section, sub_section, max_marks, per_unit_marks, data_source]
const INSERTS = [
  ['3. New Courses designed', 'Course Coordinator (for large courses with multiple sections)', 4, null, 'new_courses'],

  ['5. Conference', 'Conference Publication: A*', 10, null, 'research_publications'],
  ['5. Conference', 'Conference Publication: A', 8, null, 'research_publications'],

  ['7. Sponsored project (approved in AY)', 'Grants received: Value>=1cr (PI)', 25, null, 'research_grants'],
  ['7. Sponsored project (approved in AY)', 'Grants received: Value>=1cr (co-PI)', 12.5, null, 'research_grants'],
  ['7. Sponsored project (approved in AY)', 'Grants received: 50lacs<=value<1cr (PI)', 20, null, 'research_grants'],
  ['7. Sponsored project (approved in AY)', 'Grants received: 50lacs<=value<1cr (co-PI)', 10, null, 'research_grants'],

  [PHD_SECTION, PHD_SUB, 10, 5, 'phd_thesis_reviews'],

  ['11. Talks and conferences', 'Invited talks: Keynote (irrespective of national/international)', 10, null, 'keynotes_talks'],
  ['11. Talks and conferences', 'Invited talks: International invited talk', 10, null, 'keynotes_talks'],

  ['12. Visits/Honours/Consultancy', 'Consultancy Project: 25 lacs<=Project Value<=50 lacs (PI)', 15, null, 'consultancy'],
  ['12. Visits/Honours/Consultancy', 'Consultancy Project: 25 lacs<=Project Value<=50 lacs (co-PI)', 7.5, null, 'consultancy'],
  ['12. Visits/Honours/Consultancy', 'Consultancy Project: Project Value >50 lacs (PI)', 20, null, 'consultancy'],
  ['12. Visits/Honours/Consultancy', 'Consultancy Project: Project Value >50 lacs (co-PI)', 10, null, 'consultancy']
];

// Technology rows score "number of entries x per-unit marks"; keep per-unit in step with the new top mark.
const TECHNOLOGY_PER_UNIT = 15;

async function applyNov2026RubricUpdate(db, log = console.log) {
  const [existing] = await db.query('SELECT COUNT(*) AS total FROM Dofa_rubrics');
  if (!existing[0] || Number(existing[0].total) === 0) return { applied: false, reason: 'no rubric rows' };

  const [marker] = await db.query('SELECT id FROM Dofa_rubrics WHERE section_name = ? LIMIT 1', [PHD_SECTION]);
  if (marker.length > 0) return { applied: false, reason: 'already applied' };

  const conn = await db.getConnection();
  const missing = [];
  try {
    await conn.beginTransaction();

    for (const [from, to] of RENUMBER) {
      await conn.query('UPDATE Dofa_rubrics SET section_name = ? WHERE section_name = ?', [to, from]);
    }

    // The UPDATES table already uses post-renumber section names.
    for (const [section, oldSub, newSub, max] of UPDATES) {
      const [result] = await conn.query(
        'UPDATE Dofa_rubrics SET sub_section = ?, max_marks = ? WHERE section_name = ? AND sub_section = ?',
        [newSub, max, section, oldSub]
      );
      if (result.affectedRows === 0) missing.push(`${section} | ${oldSub}`);
    }

    await conn.query(
      'UPDATE Dofa_rubrics SET per_unit_marks = ? WHERE section_name = ? AND sub_section LIKE ?',
      [TECHNOLOGY_PER_UNIT, '10. Technology Contribution', '%[3/6/10/15 points]']
    );

    for (const [section, sub, max, perUnit, dataSource] of INSERTS) {
      await conn.query(
        `INSERT INTO Dofa_rubrics (section_name, sub_section, max_marks, scoring_type, per_unit_marks, data_source)
         VALUES (?, ?, ?, 'manual', ?, ?)`,
        [section, sub, max, perUnit, dataSource]
      );
    }

    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }

  log(`Rubric update (Nov 2026) applied: ${UPDATES.length - missing.length} rows updated, ${INSERTS.length} added.`);
  if (missing.length > 0) {
    log('Rubric update: these rows were not found (renamed in Rubrics Management?) and were left unchanged:');
    missing.forEach((entry) => log('  - ' + entry));
  }
  return { applied: true, missing };
}

module.exports = { applyNov2026RubricUpdate };
