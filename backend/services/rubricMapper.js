const db = require('../config/database');
const { resolveFacultyInfoId } = require('../utils/facultyResolver');
const { evaluateRuleConfig } = require('./rubricRuleEngine');

let ensuredRuleColumns = false;
let bootstrappedTeachingRules = false;

const ensureRuleDrivenColumns = async () => {
  if (ensuredRuleColumns) return;

  const ensureColumn = async (columnName, definitionSql) => {
    const [rows] = await db.query(
      `SELECT COLUMN_NAME
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Dofa_rubrics' AND COLUMN_NAME = ?`,
      [columnName]
    );

    if (rows.length === 0) {
      await db.query(`ALTER TABLE Dofa_rubrics ADD COLUMN ${definitionSql}`);
      console.log(`  Migration: added Dofa_rubrics.${columnName}`);
    }
  };

  const ensureScoringTypeSupportsRule = async () => {
    const [rows] = await db.query(
      `SELECT DATA_TYPE, COLUMN_TYPE
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Dofa_rubrics' AND COLUMN_NAME = 'scoring_type'`
    );

    if (rows.length === 0) {
      return;
    }

    const dataType = String(rows[0].DATA_TYPE || '').toLowerCase();
    const columnType = String(rows[0].COLUMN_TYPE || '').toLowerCase();

    if (dataType === 'enum' && !columnType.includes("'rule'")) {
      await db.query("ALTER TABLE Dofa_rubrics MODIFY COLUMN scoring_type ENUM('manual','count_based','text_exists','rule') NOT NULL DEFAULT 'manual'");
    }
  };

  await ensureColumn('scoring_type', "scoring_type VARCHAR(20) NOT NULL DEFAULT 'manual'");
  await ensureColumn('per_unit_marks', 'per_unit_marks DECIMAL(10,2) NULL');
  await ensureColumn('dynamic_section_id', 'dynamic_section_id INT NULL');
  await ensureColumn('rule_config', 'rule_config JSON NULL');
  await ensureColumn('data_source', 'data_source VARCHAR(64) NULL');
  await ensureScoringTypeSupportsRule();

  ensuredRuleColumns = true;
};

const buildTeachingFeedbackFilters = (subSectionText = '') => {
  const text = String(subSectionText || '').toLowerCase();
  const compact = text.replace(/\s+/g, '');
  const filters = [];

  if (text.includes('greater than or equal to 50') || compact.includes('>=50')) {
    filters.push({ field: 'enrollment', op: '>=', value: 50 });
  } else if (text.includes('less than 50') || compact.includes('<50')) {
    filters.push({ field: 'enrollment', op: '<', value: 50 });
  }

  const rangeMatch = text.match(/([0-9]+(?:\.[0-9]+)?)\s*<=?\s*feedback\s*<\s*([0-9]+(?:\.[0-9]+)?)/i);
  if (rangeMatch) {
    filters.push({ field: 'feedback_score', op: '>=', value: Number(rangeMatch[1]) });
    filters.push({ field: 'feedback_score', op: '<', value: Number(rangeMatch[2]) });
    return filters;
  }

  const gteMatch = text.match(/feedback\s*>=\s*([0-9]+(?:\.[0-9]+)?)/i)
    || text.match(/([0-9]+(?:\.[0-9]+)?)\s*<=?\s*feedback/i);
  if (gteMatch) {
    filters.push({ field: 'feedback_score', op: '>=', value: Number(gteMatch[1]) });
  }

  const ltMatch = text.match(/feedback\s*<\s*([0-9]+(?:\.[0-9]+)?)/i);
  if (ltMatch) {
    filters.push({ field: 'feedback_score', op: '<', value: Number(ltMatch[1]) });
  }

  return filters;
};

const bootstrapTeachingFeedbackRuleConfigs = async () => {
  if (bootstrappedTeachingRules) return;

  const [rows] = await db.query(
    `SELECT id, section_name, sub_section, max_marks, scoring_type, rule_config
     FROM Dofa_rubrics
     WHERE LOWER(section_name) LIKE '%teaching feedback%'`
  );

  for (const row of rows) {
    if (row.rule_config) continue;

    const filters = buildTeachingFeedbackFilters(row.sub_section || '');
    if (filters.length === 0) continue;

    const ruleConfig = {
      ruleType: 'count',
      sourceTable: 'courses_taught',
      filters,
      scorePerMatch: 'MAX',
      allowExceedMax: true
    };

    await db.query(
      `UPDATE Dofa_rubrics
       SET scoring_type = 'rule', data_source = 'courses_taught', rule_config = ?
       WHERE id = ?`,
      [JSON.stringify(ruleConfig), row.id]
    );
  }

  bootstrappedTeachingRules = true;
};

/**
 * Auto-allocates marks per rubric for a submitted faculty appraisal.
 * Logic: granular mapping of each rubric to specific DB data.
 * Teaching Feedback  -> computed from courses_taught (enrollment + feedback_score).
 * Research Guidance  -> 0 (no guidance table in DB yet).
 * All unmatched rubrics -> 0 (inserted explicitly for complete record).
 *
 * Teaching Feedback rubric categories (Form A, Part A, Section 4.1):
 *   Rubric IDs 1-3  (â‰¥50 students category, scale 5-4-3):
 *     ID 1: enrollmentâ‰¥50 AND feedbackâ‰¥4   -> 5 pts
 *     ID 2: enrollmentâ‰¥50 AND 3.5â‰¤fb<4    -> 4 pts
 *     ID 3: enrollmentâ‰¥50 AND 3â‰¤fb<3.5    -> 3 pts
 *   Rubric IDs 4-6  (<50 students category, scale 4-3-2):
 *     ID 4: enrollment<50  AND feedbackâ‰¥4  -> 4 pts
 *     ID 5: enrollment<50  AND 3.5â‰¤fb<4   -> 3 pts
 *     ID 6: enrollment<50  AND 3â‰¤fb<3.5   -> 2 pts
 *   Each qualifying course contributes independently to exactly one rubric,
 *   and scores are accumulated across all courses.
 */
const autoAllocateMarks = async (submissionId, facultyId, academicYear) => {
  try {
    console.log(`\n=== Auto-Allocating Marks ===`);
    console.log(`  Submission: ${submissionId} | Faculty: ${facultyId} | Year: ${academicYear}`);

    await ensureRuleDrivenColumns();
    await bootstrapTeachingFeedbackRuleConfigs();

    // -- Fetch all rubrics --------------------------------------------------
    const [rubrics] = await db.query(
      `SELECT id, section_name, sub_section, max_marks, scoring_type, per_unit_marks, dynamic_section_id, rule_config, data_source
       FROM Dofa_rubrics
       ORDER BY id ASC`
    );

    // Resolve all possible faculty identifiers used across legacy/current tables.
    const [userRows] = await db.query('SELECT email FROM users WHERE id = ? LIMIT 1', [facultyId]);
    const resolvedFacultyInfoId = await resolveFacultyInfoId({
      facultyId,
      email: userRows.length > 0 ? userRows[0].email : null
    });
    const facultyIds = Array.from(new Set([Number(facultyId), Number(resolvedFacultyInfoId)].filter(Number.isFinite)));
    const placeholders = facultyIds.map(() => '?').join(',');

    const byFacultyIds = async (tableName) => {
      const [rows] = await db.query(`SELECT * FROM ${tableName} WHERE faculty_id IN (${placeholders})`, facultyIds);
      return rows;
    };

    // -- Fetch all faculty submission data ----------------------------------
    const publications = await byFacultyIds('research_publications');
    const courses = await byFacultyIds('courses_taught');
    const newCourses = await byFacultyIds('new_courses');
    const grants = await byFacultyIds('research_grants');
    const patents = await byFacultyIds('patents');
    const consultancy = await byFacultyIds('consultancy');
    const awards = await byFacultyIds('awards_honours');
    const proposals = await byFacultyIds('submitted_proposals');
    const techTransfer = await byFacultyIds('technology_transfer');
    const reviews = await byFacultyIds('paper_reviews');
    const talks = await byFacultyIds('keynotes_talks');
    const sessions = await byFacultyIds('conference_sessions');
    const contribs = await byFacultyIds('institutional_contributions');
    const teachingInnovation = await byFacultyIds('teaching_innovation');

    // Optional data sources: keep scoring resilient if these tables are not present yet.
    let guidance = [];
    try {
      guidance = await byFacultyIds('research_guidance');
    } catch (_) {
      guidance = [];
    }

    let otherActivities = [];
    try {
      otherActivities = await byFacultyIds('other_activities');
    } catch (_) {
      otherActivities = [];
    }

    let dynamicResponses = [];
    try {
      const [rows] = await db.query(
        `SELECT dr.*, df.section_id, df.label AS field_label, ds.title AS section_title
         FROM dynamic_responses dr
         JOIN dynamic_fields df ON df.id = dr.field_id
         JOIN dynamic_sections ds ON ds.id = df.section_id
         WHERE dr.faculty_id IN (${placeholders})
           AND (dr.submission_id = ? OR dr.submission_id IS NULL)`,
        [...facultyIds, submissionId]
      );
      dynamicResponses = rows;
    } catch (_) {
      dynamicResponses = [];
    }

    // -- Helper: safely parse float -----------------------------------------
    const f = (v) => parseFloat(v) || 0;
    const norm = (v) => String(v || '').toLowerCase();
    const resolveTechnologyType = (row = {}) => {
      const explicit = norm(row.technology_type);
      if (explicit.includes('software developed and deployed') || explicit.includes('software')) return 'software_developed_and_deployed';
      if (explicit.includes('technology developed and transferred') || explicit.includes('technology') || explicit.includes('transfer')) return 'technology_developed_and_transferred';

      const mergedText = `${norm(row.title)} ${norm(row.description)} ${norm(row.agency)}`;
      if (mergedText.includes('software')) return 'software_developed_and_deployed';
      return 'technology_developed_and_transferred';
    };
    const parseResponseValue = (raw) => {
      if (raw === null || raw === undefined) return null;
      if (typeof raw === 'object') return raw;
      if (typeof raw === 'string') {
        try {
          return JSON.parse(raw);
        } catch (_) {
          return raw;
        }
      }
      return raw;
    };

    const hasMeaningfulValue = (value) => {
      if (value === null || value === undefined) return false;
      if (typeof value === 'string') return value.trim() !== '';
      if (typeof value === 'number') return true;
      if (typeof value === 'boolean') return value;
      if (Array.isArray(value)) {
        return value.some(row => hasMeaningfulValue(row));
      }
      if (typeof value === 'object') {
        return Object.values(value).some(v => hasMeaningfulValue(v));
      }
      return false;
    };

    // -- Build score map: rubricId -> score ----------------------------------
    const scoreMap = {};

    const dataSources = {
      research_publications: publications,
      courses_taught: courses,
      new_courses: newCourses,
      research_grants: grants,
      patents,
      consultancy,
      awards_honours: awards,
      submitted_proposals: proposals,
      technology_transfer: techTransfer,
      paper_reviews: reviews,
      keynotes_talks: talks,
      conference_sessions: sessions,
      institutional_contributions: contribs,
      teaching_innovation: teachingInnovation,
      research_guidance: guidance,
      other_activities: otherActivities,
      dynamic_responses: dynamicResponses
    };

    // -- Pre-compute Teaching Feedback scores (IDs 1-6) --------------------
    // Get the 6 Teaching Feedback rubrics sorted by ID.
    const tfRubrics = rubrics
      .filter(r => r.section_name.toLowerCase().includes('teaching feedback') && String(r.scoring_type || 'manual').toLowerCase() !== 'rule')
      .sort((a, b) => a.id - b.id); // IDs 1->6 in order

    if (tfRubrics.length === 6) {
      // rubric indices: [0]=ID1, [1]=ID2, [2]=ID3, [3]=ID4, [4]=ID5, [5]=ID6
      // Initialise all 6 to 0
      tfRubrics.forEach(r => { scoreMap[r.id] = 0; });

      let qualifyingCourses = 0;

      for (const course of courses) {
        const enrollment = parseInt(course.enrollment) || 0;
        const fb = parseFloat(course.feedback_score);

        // Skip courses with no feedback score recorded
        if (course.feedback_score === null || course.feedback_score === undefined || isNaN(fb)) continue;

        if (enrollment >= 50) {
          // Category  5-4-3  (rubric IDs 1,2,3  -> indices 0,1,2)
          if (fb >= 4) {
            scoreMap[tfRubrics[0].id] += f(tfRubrics[0].max_marks);
            qualifyingCourses += 1;
          } else if (fb >= 3.5) {
            scoreMap[tfRubrics[1].id] += f(tfRubrics[1].max_marks);
            qualifyingCourses += 1;
          } else if (fb >= 3) {
            scoreMap[tfRubrics[2].id] += f(tfRubrics[2].max_marks);
            qualifyingCourses += 1;
          }
          // fb < 3 -> no points
        } else {
          // Category  4-3-2  (rubric IDs 4,5,6  -> indices 3,4,5)
          if (fb >= 4) {
            scoreMap[tfRubrics[3].id] += f(tfRubrics[3].max_marks);
            qualifyingCourses += 1;
          } else if (fb >= 3.5) {
            scoreMap[tfRubrics[4].id] += f(tfRubrics[4].max_marks);
            qualifyingCourses += 1;
          } else if (fb >= 3) {
            scoreMap[tfRubrics[5].id] += f(tfRubrics[5].max_marks);
            qualifyingCourses += 1;
          }
          // fb < 3 -> no points
        }
      }

      const teachingFeedbackTotal = tfRubrics.reduce((sum, r) => sum + (scoreMap[r.id] || 0), 0);
      if (qualifyingCourses > 0) {
        console.log(`  Teaching Feedback: ${qualifyingCourses} qualifying course(s) -> ${teachingFeedbackTotal.toFixed(2)} pts`);
      } else {
        console.log(`  Teaching Feedback: no qualifying courses found -> all 0`);
      }
    } else {
      console.log(`  Warning: Expected 6 Teaching Feedback rubrics, found ${tfRubrics.length}`);
    }

    for (const rubric of rubrics) {
      const sec = rubric.section_name.toLowerCase();
      const sub = (rubric.sub_section || '').toLowerCase();
      const max = f(rubric.max_marks);
      let score = 0;

      const scoringType = String(rubric.scoring_type || 'manual').toLowerCase();
      const linkedResponses = dynamicResponses.filter((resp) =>
        rubric.dynamic_section_id
          ? Number(resp.section_id) === Number(rubric.dynamic_section_id)
          : false
      );

      if (scoringType === 'count_based') {
        const nonEmptyCount = linkedResponses.filter((resp) => {
          const value = parseResponseValue(resp.value);
          return hasMeaningfulValue(value);
        }).length;

        const perUnit = f(rubric.per_unit_marks);
        scoreMap[rubric.id] = Math.min(nonEmptyCount * perUnit, max);
        continue;
      }

      if (scoringType === 'text_exists') {
        const exists = linkedResponses.some((resp) => {
          const value = parseResponseValue(resp.value);
          return hasMeaningfulValue(value);
        });

        scoreMap[rubric.id] = exists ? max : 0;
        continue;
      }

      const isRuleDriven = String(rubric.scoring_type || 'manual').toLowerCase() === 'rule' && rubric.rule_config;
      if (isRuleDriven) {
        const ruleEval = evaluateRuleConfig({
          ruleConfig: rubric.rule_config,
          dataSources,
          rubric
        });

        if (ruleEval.applied) {
          scoreMap[rubric.id] = Math.max(0, f(ruleEval.score));
          continue;
        }
      }

      // -- 1. Teaching Feedback (IDs 1-6) --------------------------------
      // Scores already computed and injected into scoreMap above.
      // Skip loop processing for these rubrics.
      if (sec.includes('teaching feedback')) {
        score = scoreMap[rubric.id] ?? 0;
      }

      // -- 2. Research Guidance (IDs 7-10) -------------------------------
      else if (sec.includes('research guidance')) {
        if (guidance.length === 0) {
          score = 0;
        } else {
          const units = guidance.reduce((sum, g) => {
            const gType = norm(g.guidance_type || g.type || g.category || g.program_type || g.level);
            const qty = parseInt(g.count || g.quantity || g.students_count || g.number_of_students || g.number_of_projects || 1) || 1;

            if (sub.includes('btp') && gType.includes('btp')) return sum + qty;
            if ((sub.includes('phd') && !sub.includes('co-guide')) && gType.includes('phd') && !gType.includes('co')) return sum + qty;
            if (sub.includes('co-guide') && gType.includes('co')) return sum + qty;
            if ((sub.includes('m.tech') || sub.includes('m.sc')) && (gType.includes('m.tech') || gType.includes('mtech') || gType.includes('m.sc') || gType.includes('msc'))) return sum + qty;
            return sum;
          }, 0);

          score = units > 0 ? Math.min(units * max, max) : 0;
        }
      }

      // -- 3. New Courses designed (ID 11) -------------------------------
      else if (sec.includes('new courses')) {
        score = newCourses.length > 0 ? max : 0;
      }

      // -- 4. Research Publications ---------------------------------------
      else if (sec.includes('research publications')) {
        if (sub.includes('q1')) {
          const count = publications.filter(p =>
            (p.publication_type || '').toLowerCase() === 'journal' &&
            (p.sub_type || '').toUpperCase().includes('Q1')
          ).length;
          score = Math.min(count * max, max);
        } else if (sub.includes('q2')) {
          const count = publications.filter(p =>
            (p.publication_type || '').toLowerCase() === 'journal' &&
            (p.sub_type || '').toUpperCase().includes('Q2')
          ).length;
          score = Math.min(count * max, max);
        } else if (sub.includes('q3')) {
          const count = publications.filter(p =>
            (p.publication_type || '').toLowerCase() === 'journal' &&
            (p.sub_type || '').toUpperCase().includes('Q3')
          ).length;
          score = Math.min(count * max, max);
        } else if (sub.includes('q4') || sub.includes('scopus') || sub.includes('peer')) {
          const count = publications.filter(p =>
            (p.publication_type || '').toLowerCase() === 'journal' &&
            ((p.sub_type || '').toUpperCase().includes('Q4') ||
             (p.sub_type || '').toLowerCase().includes('scopus') ||
             (p.sub_type || '').toLowerCase().includes('peer'))
          ).length;
          score = Math.min(count * max, max);
        } else {
          score = publications.length > 0 ? max : 0;
        }
      }

      // -- 5. Conference Publications -------------------------------------
      else if (sec.includes('conference') && !sec.includes('talks and conferences')) {
        const confPubs = publications.filter(p =>
          (p.publication_type || '').toLowerCase() === 'conference'
        );
        if (sub.includes('tier 1')) {
          const count = confPubs.filter(p =>
            (p.sub_type || '').toLowerCase().includes('tier 1') ||
            (p.type_of_conference || '').toLowerCase().includes('international')
          ).length;
          score = Math.min(count * max, max);
        } else if (sub.includes('tier 2')) {
          const count = confPubs.filter(p =>
            (p.sub_type || '').toLowerCase().includes('tier 2')
          ).length;
          score = Math.min(count * max, max);
        } else if (sub.includes('tier 3')) {
          const count = confPubs.filter(p =>
            (p.sub_type || '').toLowerCase().includes('tier 3') ||
            (p.type_of_conference || '').toLowerCase().includes('national')
          ).length;
          score = Math.min(count * max, max);
        } else {
          score = confPubs.length > 0 ? max : 0;
        }
      }

      // -- 6. Others - book chapter / edited / textbook / paper presentation -
      else if (sec.startsWith('6.') || (sec.includes('others') && !sec.includes('institutional') && !sec.includes('activities'))) {
        if (sub.includes('paper') || sub.includes('poster')) {
          score = publications.filter(p =>
            (p.publication_type || '').toLowerCase().includes('poster') ||
            (p.publication_type || '').toLowerCase().includes('presentation')
          ).length > 0 ? max : 0;
        } else if (sub.includes('book chapter')) {
          score = publications.filter(p =>
            (p.publication_type || '').toLowerCase().includes('book chapter')
          ).length > 0 ? max : 0;
        } else if (sub.includes('book edited')) {
          score = publications.filter(p =>
            (p.publication_type || '').toLowerCase().includes('book edited')
          ).length > 0 ? max : 0;
        } else if (sub.includes('textbook')) {
          score = publications.filter(p =>
            (p.publication_type || '').toLowerCase().includes('textbook')
          ).length > 0 ? max : 0;
        }
      }

      // -- 7. Sponsored Projects (Grants) --------------------------------
      else if (sec.includes('sponsored project')) {
        if (sub.includes('proposal')) {
          // Proposals submitted
          const isPI = sub.includes('(pi)') || sub.includes(' pi)');
          const filtered = proposals.filter(p =>
            isPI ? (p.role || '').toLowerCase().includes('pi') && !(p.role || '').toLowerCase().includes('co')
                 : (p.role || '').toLowerCase().includes('co')
          );
          score = Math.min(filtered.length * max, max);
        } else {
          // Grants received - check amount range and PI/co-PI
          const isPI = sub.includes('(pi)') || sub.endsWith(' pi)');
          const matchingGrants = grants.filter(g => {
            const amt = f(g.amount_in_lakhs);
            const role = (g.role || '').toLowerCase();
            const piMatch = isPI
              ? role.includes('pi') && !role.includes('co')
              : role.includes('co');

            if (!piMatch) return false;

            if (sub.includes('>=20') || sub.includes('â‰¥20') || sub.includes('value>=20') || sub.includes('value>20')) {
              return amt >= 20;
            } else if (sub.includes('10') && sub.includes('20')) {
              return amt >= 10 && amt < 20;
            } else if (sub.includes('5') && sub.includes('10')) {
              return amt >= 5 && amt < 10;
            } else if (sub.includes('2') && sub.includes('5')) {
              return amt >= 2 && amt < 5;
            } else if (sub.includes('50000') || sub.includes('0.5')) {
              return amt >= 0.5 && amt < 2;
            }
            return false;
          });
          score = Math.min(matchingGrants.length * max, max);
        }
      }

      // -- 8. Patents -----------------------------------------------------
      else if (sec.includes('patent')) {
        if (sub.includes('granted')) {
          score = patents.filter(p =>
            (p.patent_type || '').toLowerCase().includes('grant')
          ).length > 0 ? max : 0;
        } else if (sub.includes('published')) {
          score = patents.filter(p =>
            (p.patent_type || '').toLowerCase().includes('publish')
          ).length > 0 ? max : 0;
        } else if (sub.includes('filed')) {
          score = patents.filter(p =>
            (p.patent_type || '').toLowerCase().includes('fil')
          ).length > 0 ? max : 0;
        } else {
          score = patents.length > 0 ? max : 0;
        }
      }

      // -- 9. Technology Contribution -------------------------------------
      else if (sec.includes('technology contribution')) {
        const getCountForType = (typeName) => techTransfer.filter((tt) => resolveTechnologyType(tt) === typeName).length;
        const softwareCount = getCountForType('software_developed_and_deployed');
        const technologyCount = getCountForType('technology_developed_and_transferred');

        if (sub.includes('software developed and deployed') || sub.includes('software')) {
          score = softwareCount * max;
        } else if (sub.includes('technology developed and transferred') || sub.includes('technology')) {
          score = technologyCount * max;
        } else {
          score = (softwareCount + technologyCount) * max;
        }
      }

      // -- 10. Review of Research Papers ---------------------------------
      else if (sec.includes('review of research papers')) {
        const totalPapers = reviews.reduce((sum, r) => sum + (parseInt(r.number_of_papers) || 0), 0);
        const isHighTier = sub.includes('q1') || sub.includes('q2');
        const highCount = reviews.filter(r =>
          (r.review_type || '').toLowerCase().includes('q1') ||
          (r.review_type || '').toLowerCase().includes('q2')
        ).reduce((sum, r) => sum + (parseInt(r.number_of_papers) || 0), 0);

        if (isHighTier) {
          score = Math.min(highCount * max, 10); // max 10 pts
        } else {
          const lowCount = totalPapers - highCount;
          score = Math.min(lowCount * max, 10); // max 10 pts
        }
      }

      // -- 11. Talks and Conferences --------------------------------------
      else if (sec.includes('talks and conferences')) {
        const hasSessionMatch = (predicate) => sessions.some(s => {
          const roleText = norm(s.role);
          const titleText = norm(s.session_title);
          const conferenceText = norm(s.conference_name);
          const all = `${roleText} ${titleText} ${conferenceText}`;
          return predicate({ roleText, titleText, conferenceText, all });
        });

        const isFdpOrConferenceTalk = (talk) => {
          const eventName = norm(talk.event_name);
          const eventType = norm(talk.event_type);
          const title = norm(talk.title);
          return eventType.includes('fdp') || eventType.includes('conference') || eventName.includes('fdp') || eventName.includes('conference') || title.includes('fdp') || title.includes('conference');
        };

        if (sub.includes('convenor') && !sub.includes('co-convenor')) {
          score = hasSessionMatch(({ all }) => all.includes('convenor') || all.includes('coordinator') || all.includes('workshop') || all.includes('fdp')) ? max : 0;
        } else if (sub.includes('co-convenor')) {
          score = hasSessionMatch(({ all }) => all.includes('co-convenor') || all.includes('co convenor') || all.includes('coordinator')) ? max : 0;
        } else if (sub.includes('organizing committee')) {
          score = hasSessionMatch(({ all }) => all.includes('organizing') || all.includes('committee')) ? max : 0;
        } else if (sub.includes('fdp') || (sub.includes('invited') && sub.includes('fdp'))) {
          const fdpTalks = talks.filter(isFdpOrConferenceTalk);
          score = Math.min(fdpTalks.length * max, 10);
        } else if (sub.includes('invited')) {
          const invitedOther = talks.filter(talk => !isFdpOrConferenceTalk(talk));
          score = Math.min(invitedOther.length * max, 5);
        } else if (sub.includes('pc chair') || sub.includes('session chair') || sub.includes('general chair')) {
          score = hasSessionMatch(({ all }) => all.includes('pc chair') || all.includes('session chair') || all.includes('general chair') || all.includes('chair')) ? max : 0;
        } else if (sub.includes('tpc') || sub.includes('other member')) {
          score = hasSessionMatch(({ all }) => all.includes('tpc') || all.includes('technical program committee') || all.includes('member')) ? max : 0;
        } else {
          score = (talks.length > 0 || sessions.length > 0) ? max : 0;
        }
      }

      // -- 12. Visits / Honours / Consultancy ----------------------------
      else if (sec.includes('visits') || sec.includes('honours') || sec.includes('consultancy')) {
        if (sub.includes('visits') || sub.includes('collaborative')) {
          score = Math.min(contribs.filter(c =>
            norm(c.contribution_type).includes('visit') || norm(c.title).includes('visit') || norm(c.description).includes('visit')
          ).length * max, 10);
        } else if (sub.includes('international honours')) {
          score = awards.filter(a =>
            norm(a.honor_type) === 'international' ||
            norm(a.award_name).includes('international') ||
            norm(a.awarding_agency).includes('international')
          ).length > 0 ? max : 0;
        } else if (sub.includes('national honours')) {
          score = awards.filter(a =>
            norm(a.honor_type) === 'national' ||
            norm(a.award_name).includes('national') ||
            norm(a.awarding_agency).includes('national') ||
            norm(a.awarding_agency).includes('india')
          ).length > 0 ? max : 0;
        } else if (sub.includes('consultancy')) {
          // Match by project amount
          const isPI = sub.includes('(pi)');
          const matching = consultancy.filter(c => {
            const amt = f(c.amount) / 100000; // convert to lakhs
            const role = (c.role || '').toLowerCase() || 'pi';
            const piMatch = isPI
              ? !role.includes('co')
              : role.includes('co');

            if (sub.includes('>5')) return amt > 5 && piMatch;
            if (sub.includes('2') && sub.includes('5')) return amt >= 2 && amt <= 5 && piMatch;
            if (sub.includes('<2')) return amt < 2 && piMatch;
            return piMatch;
          });
          score = Math.min(matching.length * max, max);
        }
      }

      // -- 13. Institutional Contributions -------------------------------
      else if (sec.includes('institutional contributions')) {
        const hasPosition = (entry, expected) => {
          const selected = norm(entry.title);
          const legacy = `${norm(entry.contribution_type)} ${norm(entry.description)}`;

          if (selected) {
            if (expected === 'dean') return selected === 'dean';
            if (expected === 'associate dean') return selected === 'associate dean';
            if (expected === 'assistant dean') return selected === 'assistant dean';
            if (expected === 'hod') return selected === 'hod';
            if (expected === 'chief warden') return selected === 'chief warden';
            if (expected === 'associate chief warden') return selected === 'associate chief warden';
            if (expected === 'assistant warden') return selected === 'assistant warden';
            if (expected === 'warden') return selected === 'warden';
            if (expected === 'centre lead') return selected === 'centre lead' || selected === 'center lead';
            if (expected === 'centre co-lead') return selected === 'centre co-lead' || selected === 'center co-lead';
            if (expected === 'chairperson') return selected === 'chairperson';
            if (expected === 'convenor') return selected === 'convenor' || selected === 'convener';
            if (expected === 'committee member') return selected === 'committee member';
            if (expected === 'faculty mentor') return selected === 'faculty mentor';
            if (expected === 'major responsibilities') return selected === 'major responsibilities';
            if (expected === 'certificate programme') return selected === 'certificate programme' || selected === 'certificate program';
            if (expected === 'scholarly') return selected === 'scholarly contribution' || selected === 'scholarly';
            return false;
          }

          // Backward compatibility for existing rows that do not have selected position in title.
          if (expected === 'associate dean') return legacy.includes('associate dean');
          if (expected === 'assistant dean') return legacy.includes('assistant dean');
          if (expected === 'dean') return legacy.includes(' dean') && !legacy.includes('associate dean') && !legacy.includes('assistant dean');
          if (expected === 'hod') return legacy.includes('hod') || legacy.includes('head of department');
          if (expected === 'chief warden') return legacy.includes('chief warden');
          if (expected === 'associate chief warden') return legacy.includes('associate chief warden');
          if (expected === 'assistant warden') return legacy.includes('assistant warden');
          if (expected === 'warden') return legacy.includes(' warden') && !legacy.includes('chief warden') && !legacy.includes('associate chief warden') && !legacy.includes('assistant warden');
          if (expected === 'centre co-lead') return legacy.includes('centre co-lead') || legacy.includes('center co-lead');
          if (expected === 'centre lead') return legacy.includes('centre lead') || legacy.includes('center lead');
          if (expected === 'chairperson') return legacy.includes('chairperson');
          if (expected === 'convenor') return legacy.includes('convenor') || legacy.includes('convener');
          if (expected === 'committee member') return legacy.includes('committee member');
          if (expected === 'faculty mentor') return legacy.includes('faculty mentor') || legacy.includes('mentor');
          if (expected === 'major responsibilities') return legacy.includes('major responsibilities') || legacy.includes('admissions') || legacy.includes('accreditation');
          if (expected === 'certificate programme') return legacy.includes('certificate programme') || legacy.includes('certificate program');
          if (expected === 'scholarly') return legacy.includes('scholarly') || legacy.includes('newspaper') || legacy.includes('magazine');
          return false;
        };

        const matchedCount = contribs.filter(c => {
          if (sub.includes('associate dean')) return hasPosition(c, 'associate dean');
          if (sub.includes('assistant dean')) return hasPosition(c, 'assistant dean');
          if (sub.includes('dean')) return hasPosition(c, 'dean');
          if (sub.includes('hod')) return hasPosition(c, 'hod');
          if (sub.includes('chief warden')) return hasPosition(c, 'chief warden');
          if (sub.includes('associate chief warden')) return hasPosition(c, 'associate chief warden');
          if (sub.includes('assistant warden')) return hasPosition(c, 'assistant warden');
          if (sub.includes('warden')) return hasPosition(c, 'warden');
          if (sub.includes('centre co-lead')) return hasPosition(c, 'centre co-lead');
          if (sub.includes('centre lead')) return hasPosition(c, 'centre lead');
          if (sub.includes('chairperson')) return hasPosition(c, 'chairperson');
          if (sub.includes('convenor')) return hasPosition(c, 'convenor');
          if (sub.includes('committee member')) return hasPosition(c, 'committee member');
          if (sub.includes('faculty mentor')) return hasPosition(c, 'faculty mentor');
          if (sub.includes('major responsibilities')) return hasPosition(c, 'major responsibilities');
          if (sub.includes('certificate programme')) return hasPosition(c, 'certificate programme');
          if (sub.includes('scholarly')) return hasPosition(c, 'scholarly');
          return false;
        }).length;

        if (matchedCount > 0) {
          if (sub.includes('committee member') || sub.includes('scholarly') || sub.includes('faculty mentor')) {
            score = Math.min(matchedCount * max, 5);
          } else {
            score = max;
          }
        } else {
          score = 0;
        }
      }

      // -- 14. Other Activities ------------------------------------------
      else if (sec.includes('other activities')) {
        const hasOtherActivity = otherActivities.length > 0 || teachingInnovation.length > 0;
        score = hasOtherActivity ? max : 0;
      }

      if (sec.includes('teaching feedback')) {
        // Teaching Feedback is cumulative per-course; do not clamp to single-rubric max.
        scoreMap[rubric.id] = score;
      } else {
        scoreMap[rubric.id] = Math.min(score, max); // never exceed max
      }
    }

    // -- Reset previous rows for this submission first.
    // This avoids cumulative duplicates in legacy databases missing a unique key.
    await db.query('DELETE FROM Dofa_evaluation_scores WHERE submission_id = ?', [submissionId]);

    // -- Insert all rubric rows (including zeros) --------------------------
    const valuesToInsert = rubrics.map(r => [submissionId, r.id, scoreMap[r.id] ?? 0]);

    await db.query(
      `INSERT INTO Dofa_evaluation_scores (submission_id, rubric_id, score)
       VALUES ?`,
      [valuesToInsert]
    );

    const nonZero = valuesToInsert.filter(v => v[2] > 0).length;
    const total   = valuesToInsert.reduce((s, v) => s + v[2], 0);
    console.log(`  âœ“ Allocated ${nonZero}/${rubrics.length} rubric(s) with scores. Grand Total: ${total.toFixed(2)}`);

    return true;
  } catch (error) {
    console.error('Auto-allocation error:', error);
    return false;
  }
};

module.exports = { autoAllocateMarks };

