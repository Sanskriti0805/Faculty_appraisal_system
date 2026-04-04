const db = require('../config/database');

async function setupAbcd() {
  try {
    console.log('--- Setting up test user "abcd" ---');
    
    // 1. Create/Update user in 'users' table
    await db.query(`
      INSERT INTO users (name, email, password, role, department, designation)
      VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        name = VALUES(name),
        password = VALUES(password),
        role = VALUES(role),
        department = VALUES(department),
        designation = VALUES(designation)
    `, ['abcd', 'abcd@lnmiit.ac.in', 'password123', 'faculty', 'CSE', 'Assistant Professor']);

    const [userRows] = await db.query('SELECT id FROM users WHERE name = ?', ['abcd']);
    const userId = userRows[0].id;
    console.log(`User "abcd" ID: ${userId}`);

    // 2. Create/Update faculty_information
    await db.query(`
      INSERT INTO faculty_information (id, name, employee_id, department, designation, email)
      VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        name = VALUES(name),
        employee_id = VALUES(employee_id),
        department = VALUES(department),
        designation = VALUES(designation),
        email = VALUES(email)
    `, [userId, 'abcd', 'EMP-ABCD', 'CSE', 'Assistant Professor', 'abcd@lnmiit.ac.in']);

    console.log('--- Setup complete ---');
    process.exit(0);
  } catch (error) {
    console.error('Setup failed:', error);
    process.exit(1);
  }
}

setupAbcd();
