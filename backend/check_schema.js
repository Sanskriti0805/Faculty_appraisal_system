const db = require('./config/database');

async function check() {
  const [cols2] = await db.query('SHOW COLUMNS FROM Dofa_evaluation_sheet2');
  console.log('Sheet2 columns:', cols2.map(c => c.Field));
  
  const [cols3] = await db.query('SHOW COLUMNS FROM Dofa_evaluation_sheet3');
  console.log('Sheet3 columns:', cols3.map(c => c.Field));
  
  process.exit(0);
}
check().catch(console.error);
