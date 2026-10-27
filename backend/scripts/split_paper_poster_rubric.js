const db = require('../config/database');

// Splits the single "Paper/Poster Presentation" rubric (2 marks) into
// "Paper Presentation" (5 marks) and "Poster Presentation" (2 marks).
// Both rows are linked to the Research Publications form (data_source), like "Journals: Peer Reviewed".
// Safe to run more than once.
async function main() {
  const section = '6. Others';

  const [combined] = await db.query(
    "SELECT id FROM Dofa_rubrics WHERE section_name = ? AND sub_section = 'Paper/Poster Presentation' ORDER BY id LIMIT 1",
    [section]
  );
  const [paper] = await db.query(
    "SELECT id FROM Dofa_rubrics WHERE section_name = ? AND sub_section = 'Paper Presentation' LIMIT 1",
    [section]
  );
  const [poster] = await db.query(
    "SELECT id FROM Dofa_rubrics WHERE section_name = ? AND sub_section = 'Poster Presentation' LIMIT 1",
    [section]
  );

  if (paper.length > 0) {
    await db.query("UPDATE Dofa_rubrics SET max_marks = 5.00, data_source = 'research_publications' WHERE id = ?", [paper[0].id]);
    console.log('Paper Presentation already exists (ID ' + paper[0].id + '), max set to 5');
  } else if (combined.length > 0) {
    // Keep the existing row (and any scores already stored against it) as the paper row.
    await db.query(
      "UPDATE Dofa_rubrics SET sub_section = 'Paper Presentation', max_marks = 5.00, data_source = 'research_publications' WHERE id = ?",
      [combined[0].id]
    );
    console.log('Renamed rubric ID ' + combined[0].id + ' to Paper Presentation (5 marks)');
  } else {
    const [result] = await db.query(
      "INSERT INTO Dofa_rubrics (section_name, sub_section, max_marks, scoring_type, data_source) VALUES (?, 'Paper Presentation', 5.00, 'manual', 'research_publications')",
      [section]
    );
    console.log('Inserted Paper Presentation with ID ' + result.insertId);
  }

  if (poster.length > 0) {
    await db.query("UPDATE Dofa_rubrics SET max_marks = 2.00, data_source = 'research_publications' WHERE id = ?", [poster[0].id]);
    console.log('Poster Presentation already exists (ID ' + poster[0].id + '), max set to 2');
  } else {
    const [result] = await db.query(
      "INSERT INTO Dofa_rubrics (section_name, sub_section, max_marks, scoring_type, data_source) VALUES (?, 'Poster Presentation', 2.00, 'manual', 'research_publications')",
      [section]
    );
    console.log('Inserted Poster Presentation with ID ' + result.insertId);
  }

  const [rows] = await db.query(
    'SELECT id, sub_section, max_marks, scoring_type, data_source FROM Dofa_rubrics WHERE section_name = ? ORDER BY id',
    [section]
  );
  console.log(JSON.stringify(rows, null, 2));
  process.exit(0);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
