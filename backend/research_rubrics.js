const db = require('./config/database');
async function run() {
  try {
    const [rows] = await db.query('SELECT id, section_name, sub_section, max_marks FROM Dofa_rubrics');
    rows.forEach(r => {
      console.log(`${r.id} | ${r.section_name} | ${r.sub_section} | ${r.max_marks}`);
    });
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
run();

