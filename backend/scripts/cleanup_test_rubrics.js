const db = require('../config/database');
async function main() {
  // Remove the 2 test rubrics (section_name = 'Research' that are not real rubrics)
  const [res] = await db.query("DELETE FROM Dofa_rubrics WHERE section_name = 'Research'");
  console.log('Deleted test rubrics:', res.affectedRows);
  
  const [count] = await db.query('SELECT COUNT(*) as c FROM Dofa_rubrics');
  console.log('Remaining rubrics:', count[0].c);
  
  // Show first few
  const [first] = await db.query('SELECT id, section_name, substring(sub_section,1,50) as sub, max_marks FROM Dofa_rubrics ORDER BY id LIMIT 10');
  first.forEach(r => console.log(r.id, r.section_name, '|', r.sub, '|', r.max_marks));
  process.exit(0);
}
main().catch(e => { console.error(e.message); process.exit(1); });

