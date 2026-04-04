const db = require('../backend/config/database');
async function fetchRubrics() {
  try {
    const [rows] = await db.query('SELECT * FROM dofa_rubrics');
    console.log(JSON.stringify(rows, null, 2));
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
fetchRubrics();
