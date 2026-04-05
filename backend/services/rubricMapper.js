const db = require('../config/database');

/**
 * Auto-allocates marks per rubric for a submitted faculty appraisal.
 * Logic: granular mapping of each rubric to specific DB data.
 * Teaching Feedback & Research Guidance → 0 (no supporting data in DB).
 * All unmatched rubrics → 0 (inserted explicitly for complete record).
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

    // ── Helper: safely parse float ─────────────────────────────────────────
    const f = (v) => parseFloat(v) || 0;

    // ── Build score map: rubricId → score ──────────────────────────────────
    const scoreMap = {};

    for (const rubric of rubrics) {
      const sec = rubric.section_name.toLowerCase();
      const sub = (rubric.sub_section || '').toLowerCase();
      const max = f(rubric.max_marks);
      let score = 0;

      // ── 1. Teaching Feedback (IDs 1-6) ────────────────────────────────
      // No feedback_score column in DB → award 0
      if (sec.includes('teaching feedback')) {
        score = 0;
      }

      // ── 2. Research Guidance (IDs 7-10) ───────────────────────────────
      // No guidance table in DB → award 0
      else if (sec.includes('research guidance')) {
        score = 0;
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
      else if (sec.includes('conference')) {
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
          score = techTransfer.filter(t =>
            (t.description || '').toLowerCase().includes('software') ||
            (t.title || '').toLowerCase().includes('software')
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
        if (sub.includes('convenor') && !sub.includes('co-convenor')) {
          score = sessions.filter(s =>
            (s.session_title || '').toLowerCase().includes('convenor') ||
            (s.conference_name || '').toLowerCase().includes('workshop') ||
            (s.conference_name || '').toLowerCase().includes('fdp')
          ).length > 0 ? max : 0;
        } else if (sub.includes('co-convenor')) {
          score = sessions.filter(s =>
            (s.session_title || '').toLowerCase().includes('co-convenor')
          ).length > 0 ? max : 0;
        } else if (sub.includes('organizing committee')) {
          score = sessions.filter(s =>
            (s.session_title || '').toLowerCase().includes('organizing')
          ).length > 0 ? max : 0;
        } else if (sub.includes('fdp') || (sub.includes('invited') && sub.includes('fdp'))) {
          const fdpTalks = talks.filter(t =>
            (t.event_name || '').toLowerCase().includes('fdp') ||
            (t.event_name || '').toLowerCase().includes('conference')
          );
          score = Math.min(fdpTalks.length * max, 10);
        } else if (sub.includes('invited')) {
          score = Math.min(talks.length * max, 5);
        } else if (sub.includes('pc chair') || sub.includes('session chair') || sub.includes('general chair')) {
          score = sessions.filter(s =>
            (s.session_title || '').toLowerCase().includes('chair')
          ).length > 0 ? max : 0;
        } else if (sub.includes('tpc') || sub.includes('other member')) {
          score = sessions.filter(s =>
            (s.session_title || '').toLowerCase().includes('member') ||
            (s.session_title || '').toLowerCase().includes('tpc')
          ).length > 0 ? max : 0;
        } else {
          score = (talks.length > 0 || sessions.length > 0) ? max : 0;
        }
      }

      // ── 12. Visits / Honours / Consultancy ────────────────────────────
      else if (sec.includes('visits') || sec.includes('honours') || sec.includes('consultancy')) {
        if (sub.includes('visits') || sub.includes('collaborative')) {
          score = Math.min(contribs.filter(c =>
            (c.contribution_type || '').toLowerCase().includes('visit')
          ).length * max, 10);
        } else if (sub.includes('international honours')) {
          score = awards.filter(a =>
            (a.award_name || '').toLowerCase().includes('international') ||
            (a.awarding_agency || '').toLowerCase().includes('international')
          ).length > 0 ? max : 0;
        } else if (sub.includes('national honours')) {
          score = awards.filter(a =>
            (a.award_name || '').toLowerCase().includes('national') ||
            (a.awarding_agency || '').toLowerCase().includes('india')
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
        const adminTitles = {
          'dean':               58,
          'associate dean':     59,
          'assistant dean':     60,
          'hod':                61,
          'chief warden':       62,
          'associate chief warden': 63,
          'warden':             64,
          'assistant warden':   65,
          'centre lead':        66,
          'centre co-lead':     67,
          'chairperson':        68,
          'convenor':           69,
          'committee member':   70,
          'faculty mentor':     71,
          'major responsibilities': 72,
          'certificate programme': 73,
          'scholarly articles': 74,
        };

        // Match by sub_section keywords to contribution_type
        let matched = false;
        for (const [keyword, rubId] of Object.entries(adminTitles)) {
          if (rubric.id === rubId || sub.includes(keyword)) {
            const found = contribs.filter(c =>
              (c.contribution_type || '').toLowerCase().includes(keyword) ||
              (c.title || '').toLowerCase().includes(keyword)
            );
            if (found.length > 0) {
              if (sub.includes('committee member') || sub.includes('scholarly') || sub.includes('faculty mentor')) {
                score = Math.min(found.length * max, 5); // capped
              } else {
                score = max;
              }
              matched = true;
            }
            break;
          }
        }
        if (!matched) score = 0;
      }

      // ── 14. Other Activities ──────────────────────────────────────────
      else if (sec.includes('other activities')) {
        // Check activity data — if no specific table just check institutional misc
        score = 0; // no other_activities table yet
      }

      scoreMap[rubric.id] = Math.min(score, max); // never exceed max
    }

    // ── Upsert all 75 rows (including zeros) ──────────────────────────────
    const valuesToInsert = rubrics.map(r => [submissionId, r.id, scoreMap[r.id] ?? 0]);

    await db.query(
      `INSERT INTO dofa_evaluation_scores (submission_id, rubric_id, score)
       VALUES ?
       ON DUPLICATE KEY UPDATE score = VALUES(score)`,
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
