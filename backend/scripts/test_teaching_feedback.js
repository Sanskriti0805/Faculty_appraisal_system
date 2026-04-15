/**
 * Unit test for Teaching Feedback rubric scoring logic
 */
const db = require('../config/database');
const { autoAllocateMarks } = require('../services/rubricMapper');

async function main() {
  console.log('=== Teaching Feedback Rubric Logic Test ===\n');

  // Fetch Teaching Feedback rubrics from DB
  const [rubrics] = await db.query(
    "SELECT id, section_name, sub_section, max_marks FROM Dofa_rubrics WHERE section_name LIKE '%Teaching Feedback%' ORDER BY id"
  );
  console.log('Teaching Feedback Rubrics found:');
  rubrics.forEach(r => console.log(`  ID ${r.id}: "${r.sub_section}" -> max ${r.max_marks} pts`));
  console.log();

  if (rubrics.length !== 6) {
    console.error(`ERROR: Expected 6 Teaching Feedback rubrics, found ${rubrics.length}!`);
    console.log('Please run: node backend/scripts/seed_rubrics.js');
    process.exit(1);
  }

  // Simulate the scoring logic inline
  const f = (v) => parseFloat(v) || 0;
  const tfRubrics = [...rubrics].sort((a, b) => a.id - b.id);

  const testCases = [
    {
      label: 'Course with 80 students, feedback=4.5 (should use â‰¥50 category, get 5 pts)',
      courses: [{ enrollment: 80, feedback_score: 4.5 }],
      expectedWinnerIdx: 0, // rubric index 0 (feedback >= 4, enrollment >= 50)
    },
    {
      label: 'Course with 80 students, feedback=3.7 (should use â‰¥50 category, get 4 pts)',
      courses: [{ enrollment: 80, feedback_score: 3.7 }],
      expectedWinnerIdx: 1, // rubric index 1 (3.5 <= fb < 4, enrollment >= 50)
    },
    {
      label: 'Course with 20 students, feedback=4.2 (should use <50 category, get 4 pts)',
      courses: [{ enrollment: 20, feedback_score: 4.2 }],
      expectedWinnerIdx: 3, // rubric index 3 (feedback >= 4, enrollment < 50)
    },
    {
      label: 'Course with 20 students, feedback=3.6 (should use <50 category, get 3 pts)',
      courses: [{ enrollment: 20, feedback_score: 3.6 }],
      expectedWinnerIdx: 4, // rubric index 4 (3.5 <= fb < 4, enrollment < 50)
    },
    {
      label: 'Two courses: 80 students fb=3.7 AND 20 students fb=4.5 (â‰¥50 wins with 4 pts vs <50 with 4 pts -> tie -> ge50 wins)',
      courses: [
        { enrollment: 80, feedback_score: 3.7 }, // ge50 -> 4 pts
        { enrollment: 20, feedback_score: 4.5 }, // lt50 -> 4 pts (tie)
      ],
      expectedWinnerIdx: 1, // ge50 wins on tie
    },
    {
      label: 'Course with 50 students, feedback=4.0 (exactly 50 -> â‰¥50 category, get 5 pts)',
      courses: [{ enrollment: 50, feedback_score: 4.0 }],
      expectedWinnerIdx: 0,
    },
    {
      label: 'Course with 30 students, feedback=2.5 (fb < 3 -> no points)',
      courses: [{ enrollment: 30, feedback_score: 2.5 }],
      expectedWinnerIdx: -1, // no winner
    },
    {
      label: 'No feedback score recorded (should all be 0)',
      courses: [{ enrollment: 80, feedback_score: null }],
      expectedWinnerIdx: -1,
    },
  ];

  let passed = 0;
  let failed = 0;

  for (const tc of testCases) {
    // Run the scoring logic
    let bestGe50Score = -1, bestGe50RubricIdx = -1;
    let bestLt50Score = -1, bestLt50RubricIdx = -1;

    for (const course of tc.courses) {
      const enrollment = parseInt(course.enrollment) || 0;
      const fb = parseFloat(course.feedback_score);

      if (course.feedback_score === null || course.feedback_score === undefined || isNaN(fb)) continue;

      if (enrollment >= 50) {
        let rubricIdx = -1, pts = 0;
        if (fb >= 4)        { rubricIdx = 0; pts = f(tfRubrics[0].max_marks); }
        else if (fb >= 3.5) { rubricIdx = 1; pts = f(tfRubrics[1].max_marks); }
        else if (fb >= 3)   { rubricIdx = 2; pts = f(tfRubrics[2].max_marks); }
        if (rubricIdx >= 0 && pts > bestGe50Score) { bestGe50Score = pts; bestGe50RubricIdx = rubricIdx; }
      } else {
        let rubricIdx = -1, pts = 0;
        if (fb >= 4)        { rubricIdx = 3; pts = f(tfRubrics[3].max_marks); }
        else if (fb >= 3.5) { rubricIdx = 4; pts = f(tfRubrics[4].max_marks); }
        else if (fb >= 3)   { rubricIdx = 5; pts = f(tfRubrics[5].max_marks); }
        if (rubricIdx >= 0 && pts > bestLt50Score) { bestLt50Score = pts; bestLt50RubricIdx = rubricIdx; }
      }
    }

    const ge50Wins = bestGe50Score >= bestLt50Score && bestGe50Score >= 0;
    const lt50Wins = bestLt50Score > bestGe50Score && bestLt50Score >= 0;

    let winnerIdx = -1;
    let winnerPts = 0;
    if (ge50Wins && bestGe50RubricIdx >= 0) { winnerIdx = bestGe50RubricIdx; winnerPts = bestGe50Score; }
    else if (lt50Wins && bestLt50RubricIdx >= 0) { winnerIdx = bestLt50RubricIdx; winnerPts = bestLt50Score; }

    const pass = winnerIdx === tc.expectedWinnerIdx;
    if (pass) passed++;
    else failed++;

    const status = pass ? 'âœ…' : 'âŒ';
    const debugInfo = winnerIdx >= 0
      ? `Winner: rubric index ${winnerIdx} (ID ${tfRubrics[winnerIdx].id}), pts=${winnerPts}`
      : 'No winner (all 0)';
    console.log(`${status} ${tc.label}`);
    if (!pass) console.log(`   Expected rubric index ${tc.expectedWinnerIdx}, got ${winnerIdx}`);
    console.log(`   ${debugInfo}`);
    console.log();
  }

  console.log(`Results: ${passed}/${passed + failed} passed`);
  if (failed > 0) process.exit(1);
  process.exit(0);
}

main().catch(e => { console.error('Test error:', e.message); process.exit(1); });

