const db = require('./config/database');

async function updateRole() {
  try {
    const [result] = await db.query('UPDATE users SET role = ? WHERE email = ?', ['Dofa_office', 'Dofa@test.com']);
    console.log('Role updated:', result.affectedRows, 'rows updated');
    process.exit(0);
  } catch (error) {
    console.error('Update failed:', error);
    process.exit(1);
  }
}

updateRole();

