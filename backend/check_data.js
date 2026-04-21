const db = require('./config/database');

async function check() {
  const [rows] = await db.query('SELECT * FROM Dofa_evaluation_sheet2');
  console.log('Sheet2 data:', rows);
  
  const [subs] = await db.query('SELECT id, status, academic_year FROM submissions');
  console.log('Submissions:', subs);

  const [session] = await db.query('SELECT * FROM appraisal_sessions');
  console.log('Sessions:', session);

  process.exit(0);
}
check().catch(console.error);
