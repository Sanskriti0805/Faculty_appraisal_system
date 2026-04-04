const db = require('./config/database');
async function run() {
  try {
    const [users] = await db.query('DESCRIBE users');
    console.log('--- USERS ---');
    users.forEach(r => console.log(`${r.Field} | ${r.Type} | ${r.Null} | ${r.Default}`));
    
    const [faculty] = await db.query('DESCRIBE faculty_information');
    console.log('--- FACULTY_INFO ---');
    faculty.forEach(r => console.log(`${r.Field} | ${r.Type} | ${r.Null} | ${r.Default}`));
    
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
run();
