const db = require('../config/database');

/**
 * Auto-allocates marks per rubric for a submitted faculty appraisal.
 * Logic: granular mapping of each rubric to specific DB data.
 * Teaching Feedback  → computed from courses_taught (enrollment + feedback_score).
 * Research Guidance  → 0 (no guidance table in DB yet).
 * All unmatched rubrics → 0 (inserted explicitly for complete record).
 *
 * Teaching Feedback rubric categories (Form A, Part A, Section 4.1):
 *   Rubric IDs 1-3  (≥50 students category, scale 5-4-3):
 *     ID 1: enrollment≥50 AND feedback≥4   → 5 pts
 *     ID 2: enrollment≥50 AND 3.5≤fb<4    → 4 pts
 *     ID 3: enrollment≥50 AND 3≤fb<3.5    → 3 pts
 *   Rubric IDs 4-6  (<50 students category, scale 4-3-2):
 *     ID 4: enrollment<50  AND feedback≥4  → 4 pts
 *     ID 5: enrollment<50  AND 3.5≤fb<4   → 3 pts
 *     ID 6: enrollment<50  AND 3≤fb<3.5   → 2 pts
 *   Each qualifying course contributes independently to exactly one rubric,
 *   and scores are accumulated across all courses.
 */
const autoAllocateMarks = async (submissionId, facultyId, academicYear) => {
  try {
    console.log(`\n=== Auto-Allocating Marks ===`);
    console.log(`  Submission: ${submissionId} | Faculty: ${facultyId} | Year: ${academicYear}`);

    // ── Fetch all rubrics ──────────────────────────────────────────────────
    const [rubrics] = await db.query(
      'SELECT id, section_name, sub_section, max_marks FROM dofa_rubrics ORDER BY id ASC'
    );

    // ── Fetch all faculty submission data ──────────────────────────────────
    const [publications]    = await db.query('SELECT * FROM research_publications WHERE faculty_id = ?', [facultyId]);
    const [courses]         = await db.query('SELECT * FROM courses_taught WHERE faculty_id = ?', [facultyId]);
    const [newCourses]      = await db.query('SELECT * FROM new_courses WHERE faculty_id = ?', [facultyId]);
    const [grants]          = await db.query('SELECT * FROM research_grants WHERE faculty_id = ?', [facultyId]);
    const [patents]         = await db.query('SELECT * FROM patents WHERE faculty_id = ?', [facultyId]);
    const [consultancy]     = await db.query('SELECT * FROM consultancy WHERE faculty_id = ?', [facultyId]);
    const [awards]          = await db.query('SELECT * FROM awards_honours WHERE faculty_id = ?', [facultyId]);
    const [proposals]       = await db.query('SELECT * FROM submitted_proposals WHERE faculty_id = ?', [facultyId]);
    const [techTransfer]    = await db.query('SELECT * FROM technology_transfer WHERE faculty_id = ?', [facultyId]);
    const [reviews]         = await db.query('SELECT * FROM paper_reviews WHERE faculty_id = ?', [facultyId]);
    const [talks]           = await db.query('SELECT * FROM keynotes_talks WHERE faculty_id = ?', [facultyId]);
    const [sessions]        = await db.query('SELECT * FROM conference_sessions WHERE faculty_id = ?', [facultyId]);
    const [contribs]        = await db.query('SELECT * FROM institutional_contributions WHERE faculty_id = ?', [facultyId]);
    const [teachingInnovation] = await db.query('SELECT * FROM teaching_innovation WHERE faculty_id = ?', [facultyId]);

    // Optional data sources: keep scoring resilient if these tables are not present yet.
    let guidance = [];
    try {
      [guidance] = await db.query('SELECT * FROM research_guidance WHERE faculty_id = ?', [facultyId]);
    } catch (_) {
      guidance = [];
    }

    let otherActivities = [];
    try {
      [otherActivities] = await db.query('SELECT * FROM other_activities WHERE faculty_id = ?', [facultyId]);
    } catch (_) {
      otherActivities = [];
    }

    // ── Helper: safely parse float ─────────────────────────────────────────
    const f = (v) => parseFloat(v) || 0;
    const norm = (v) => String(v || '').toLowerCase();

    // ── Build score map: rubricId → score ──────────────────────────────────
    const scoreMap = {};

    // ── Pre-compute Teaching Feedback scores (IDs 1-6) ────────────────────
    // Get the 6 Teaching Feedback rubrics sorted by ID.
    const tfRubrics = rubrics
      .filter(r => r.section_name.toLowerCase().includes('teaching feedback'))
      .sort((a, b) => a.id - b.id); // IDs 1→6 in order

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
          // Category  5-4-3  (rubric IDs 1,2,3  → indices 0,1,2)
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
          // fb < 3 → no points
        } else {
          // Category  4-3-2  (rubric IDs 4,5,6  → indices 3,4,5)
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
          // fb < 3 → no points
        }
      }

      const teachingFeedbackTotal = tfRubrics.reduce((sum, r) => sum + (scoreMap[r.id] || 0), 0);
      if (qualifyingCourses > 0) {
        console.log(`  Teaching Feedback: ${qualifyingCourses} qualifying course(s) → ${teachingFeedbackTotal.toFixed(2)} pts`);
      } else {
        console.log(`  Teaching Feedback: no qualifying courses found → all 0`);
      }
    } else {
      console.log(`  Warning: Expected 6 Teaching Feedback rubrics, found ${tfRubrics.length}`);
    }

    for (const rubric of rubrics) {
      const sec = rubric.section_name.toLowerCase();
      const sub = (rubric.sub_section || '').toLowerCase();
      const max = f(rubric.max_marks);
      let score = 0;

      // ── 1. Teaching Feedback (IDs 1-6) ────────────────────────────────
      // Scores already computed and injected into scoreMap above.
      // Skip loop processing for these rubrics.
      if (sec.includes('teaching feedback')) {
        score = scoreMap[rubric.id] ?? 0;
      }

      // ── 2. Research Guidance (IDs 7-10) ───────────────────────────────
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

      // ── 3. New Courses designed (ID 11) ───────────────────────────────
      else if (sec.includes('new courses')) {
        score = newCourses.length > 0 ? max : 0;
      }

      // ── 4. Research Publications ───────────────────────────────────────
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

      // ── 5. Conference Publications ─────────────────────────────────────
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

      // ── 6. Others — book chapter / edited / textbook / paper presentation ─
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

      // ── 7. Sponsored Projects (Grants) ────────────────────────────────
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
          // Grants received — check amount range and PI/co-PI
          const isPI = sub.includes('(pi)') || sub.endsWith(' pi)');
          const matchingGrants = grants.filter(g => {
            const amt = f(g.amount_in_lakhs);
            const role = (g.role || '').toLowerCase();
            const piMatch = isPI
              ? role.includes('pi') && !role.includes('co')
              : role.includes('co');

            if (!piMatch) return false;

            if (sub.includes('>=20') || sub.includes('≥20') || sub.includes('value>=20') || sub.includes('value>20')) {
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

      // ── 8. Patents ─────────────────────────────────────────────────────
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

      // ── 9. Technology Contribution ─────────────────────────────────────
      else if (sec.includes('technology contribution')) {
        if (sub.includes('software')) {
          score = techTransfer.filter(tt =>
            norm(tt.description).includes('software') ||
            norm(tt.title).includes('software') ||
            norm(tt.agency).includes('software')
          ).length > 0 ? max : 0;
        } else {
          score = techTransfer.length > 0 ? max : 0;
        }
      }

      // ── 10. Review of Research Papers ─────────────────────────────────
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

      // ── 11. Talks and Conferences ──────────────────────────────────────
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

      // ── 12. Visits / Honours / Consultancy ────────────────────────────
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

      // ── 13. Institutional Contributions ───────────────────────────────
      else if (sec.includes('institutional contributions')) {
        const matchedCount = contribs.filter(c => {
          const hay = `${norm(c.contribution_type)} ${norm(c.title)} ${norm(c.description)}`;

          if (sub.includes('associate dean')) return hay.includes('associate dean');
          if (sub.includes('assistant dean')) return hay.includes('assistant dean');
          if (sub.includes('dean')) return hay.includes(' dean');
          if (sub.includes('hod')) return hay.includes('hod') || hay.includes('head of department');
          if (sub.includes('chief warden')) return hay.includes('chief warden');
          if (sub.includes('associate chief warden')) return hay.includes('associate chief warden');
          if (sub.includes('assistant warden')) return hay.includes('assistant warden');
          if (sub.includes('warden')) return hay.includes(' warden');
          if (sub.includes('centre co-lead')) return hay.includes('centre co-lead') || hay.includes('center co-lead');
          if (sub.includes('centre lead')) return hay.includes('centre lead') || hay.includes('center lead');
          if (sub.includes('chairperson')) return hay.includes('chairperson');
          if (sub.includes('convenor')) return hay.includes('convenor') || hay.includes('convener');
          if (sub.includes('committee member')) return hay.includes('committee member') || hay.includes('member');
          if (sub.includes('faculty mentor')) return hay.includes('faculty mentor') || hay.includes('mentor');
          if (sub.includes('major responsibilities')) return hay.includes('major responsibilities') || hay.includes('admissions') || hay.includes('accreditation');
          if (sub.includes('certificate programme')) return hay.includes('certificate programme') || hay.includes('certificate program');
          if (sub.includes('scholarly')) return hay.includes('scholarly') || hay.includes('newspaper') || hay.includes('magazine');
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

      // ── 14. Other Activities ──────────────────────────────────────────
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

    // ── Reset previous rows for this submission first.
    // This avoids cumulative duplicates in legacy databases missing a unique key.
    await db.query('DELETE FROM dofa_evaluation_scores WHERE submission_id = ?', [submissionId]);

    // ── Insert all rubric rows (including zeros) ──────────────────────────
    const valuesToInsert = rubrics.map(r => [submissionId, r.id, scoreMap[r.id] ?? 0]);

    await db.query(
      `INSERT INTO dofa_evaluation_scores (submission_id, rubric_id, score)
       VALUES ?`,
      [valuesToInsert]
    );

    const nonZero = valuesToInsert.filter(v => v[2] > 0).length;
    const total   = valuesToInsert.reduce((s, v) => s + v[2], 0);
    console.log(`  ✓ Allocated ${nonZero}/${rubrics.length} rubric(s) with scores. Grand Total: ${total.toFixed(2)}`);

    return true;
  } catch (error) {
    console.error('Auto-allocation error:', error);
    return false;
  }
};

module.exports = { autoAllocateMarks };
