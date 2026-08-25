const db = require('../config/database');

async function main() {
  console.log('--- Checking for LUSIP/Mini Project rubric ---');
  const [existing] = await db.query(
    "SELECT id, section_name, sub_section, max_marks FROM Dofa_rubrics WHERE section_name = '2. Research Guidance' AND (sub_section LIKE '%LUSIP%' OR sub_section LIKE '%Mini Project%')"
  );

  if (existing.length > 0) {
    console.log('Already exists:', existing);
    await db.query(
      "UPDATE Dofa_rubrics SET max_marks = 1.00, per_unit_marks = 1.00 WHERE id = ?",
      [existing[0].id]
    );
    console.log('Updated existing rubric ID:', existing[0].id);
  } else {
    // Insert after the other Research Guidance rubrics
    const [result] = await db.query(
      "INSERT INTO Dofa_rubrics (section_name, sub_section, max_marks, scoring_type, per_unit_marks, data_source) VALUES (?, ?, ?, ?, ?, ?)",
      ['2. Research Guidance', 'LUSIP/Mini Project', 1.00, 'manual', 1.00, 'courses_taught']
    );
    console.log('Inserted new rubric with ID:', result.insertId);
  }

  const [allGuidance] = await db.query(
    "SELECT id, section_name, sub_section, max_marks, scoring_type, per_unit_marks FROM Dofa_rubrics WHERE section_name = '2. Research Guidance' ORDER BY id"
  );
  console.log('\nCurrent Research Guidance Rubrics in DB:\n', JSON.stringify(allGuidance, null, 2));

  process.exit(0);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
