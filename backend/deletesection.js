require('dotenv').config();
const mysql = require('mysql2/promise');

async function del() {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });
  await c.query('DELETE FROM dynamic_sections WHERE title="Test Section"');
  console.log('Deleted Test Section');
  c.end();
}

del();
