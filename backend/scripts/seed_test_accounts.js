/**
 * Seed Test Accounts
 * Creates one user per role: faculty, hod, dofa, dofa_office, admin
 * Safe to re-run — upserts existing accounts
 */
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
require('dotenv').config();

// employment_type ENUM: 'fixed' | 'contractual'
// salutation ENUM:      'Prof' | 'Dr' | 'Mr' | 'Ms'
const ACCOUNTS = [
  {
    name: 'Test Faculty',
    email: 'faculty@test.com',
    password: 'Faculty@123',
    role: 'faculty',
    department: 'Computer Science',
    designation: 'Assistant Professor',
    salutation: 'Dr',
    employee_id: 'FAC001',
    employment_type: 'fixed',
  },
  {
    name: 'Test HOD',
    email: 'hod@test.com',
    password: 'Hod@1234',
    role: 'hod',
    department: 'Computer Science',
    designation: 'Head of Department',
    salutation: 'Prof',
    employee_id: 'HOD001',
    employment_type: 'fixed',
  },
  {
    name: 'Test DOFA',
    email: 'dofa@test.com',
    password: 'Dofa@123',
    role: 'dofa',
    department: 'Administration',
    designation: 'Dean of Faculty Affairs',
    salutation: 'Prof',
    employee_id: 'DOFA01',
    employment_type: 'fixed',
  },
  {
    name: 'Test DOFA Office',
    email: 'dofaoffice@test.com',
    password: 'DofaOffice@123',
    role: 'dofa_office',
    department: 'Administration',
    designation: 'DOFA Office Staff',
    salutation: 'Mr',
    employee_id: 'DOFAOFF01',
    employment_type: 'fixed',
  },
  {
    name: 'Test Admin',
    email: 'admin@test.com',
    password: 'Admin@123',
    role: 'admin',
    department: 'Administration',
    designation: 'System Administrator',
    salutation: 'Mr',
    employee_id: 'ADMIN01',
    employment_type: 'fixed',
  },
];

async function seed() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT) || 3306,
  });

  console.log('\n=== Seeding Test Accounts ===\n');

  for (const acc of ACCOUNTS) {
    const hashed = await bcrypt.hash(acc.password, 10);

    const [existing] = await conn.query(
      'SELECT id FROM users WHERE email = ? AND role = ?',
      [acc.email, acc.role]
    );

    if (existing.length > 0) {
      await conn.query(
        `UPDATE users SET
          password = ?, name = ?, department = ?, designation = ?,
          salutation = ?, employee_id = ?, employment_type = ?
         WHERE email = ? AND role = ?`,
        [hashed, acc.name, acc.department, acc.designation,
         acc.salutation, acc.employee_id, acc.employment_type,
         acc.email, acc.role]
      );
      console.log(`  ✔ Updated  [${acc.role.padEnd(12)}]  ${acc.email}`);
    } else {
      await conn.query(
        `INSERT INTO users
          (name, email, password, role, department, designation, salutation, employee_id, employment_type)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [acc.name, acc.email, hashed, acc.role,
         acc.department, acc.designation, acc.salutation,
         acc.employee_id, acc.employment_type]
      );
      console.log(`  ✔ Created  [${acc.role.padEnd(12)}]  ${acc.email}`);
    }
  }

  await conn.end();

  console.log('\n╔══════════════╦═══════════════════════╦══════════════════╗');
  console.log('║ Role         ║ Email                 ║ Password         ║');
  console.log('╠══════════════╬═══════════════════════╬══════════════════╣');
  for (const acc of ACCOUNTS) {
    const role = acc.role.padEnd(12);
    const email = acc.email.padEnd(21);
    const pass = acc.password.padEnd(16);
    console.log(`║ ${role} ║ ${email} ║ ${pass} ║`);
  }
  console.log('╚══════════════╩═══════════════════════╩══════════════════╝');
  console.log('\nAll accounts ready! Login at http://localhost:5173\n');
}

seed().catch(e => {
  console.error('Seed failed:', e.message);
  process.exit(1);
});
