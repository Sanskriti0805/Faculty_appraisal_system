const db = require('./config/database');
const bcrypt = require('bcryptjs');

async function reset() {
  try {
    const hash = await bcrypt.hash('password123', 10);
    const [result] = await db.query('UPDATE users SET password = ? WHERE email = ?', [hash, "dofa@test.com"]);
    console.log('Reset successful:', result.affectedRows, 'rows updated');
    process.exit(0);
  } catch (error) {
    console.error('Reset failed:', error);
    process.exit(1);
  }
}

reset();
