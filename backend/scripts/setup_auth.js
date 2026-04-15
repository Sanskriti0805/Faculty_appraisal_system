/**
 * Database migration for Authentication & Registration system
 * Creates departments table, updates users table with new roles & columns,
 * and seeds an initial admin account.
 */
const db = require('../config/database');

async function migrate() {
  console.log('ðŸ”„ Starting Auth & Registration migration...\n');

  try {
    // 1. Create departments table
    console.log('1. Creating departments table...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS departments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        code VARCHAR(20) NOT NULL UNIQUE,
        hod_email VARCHAR(255),
        hod_name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('   âœ… departments table created');

    // 2. Alter users table - expand role enum
    console.log('2. Updating users table role enum...');
    await db.query(`
      ALTER TABLE users 
      MODIFY COLUMN role ENUM('faculty','Dofa','Dofa_office','admin','hod') DEFAULT 'faculty'
    `);
    console.log('   âœ… role enum updated');

    // 3. Add new columns to users table (skip if already exists)
    const columnsToAdd = [
      { name: 'employee_id', def: "VARCHAR(50) DEFAULT NULL" },
      { name: 'employment_type', def: "ENUM('fixed','contractual') DEFAULT NULL" },
      { name: 'date_of_joining', def: "DATE DEFAULT NULL" },
      { name: 'salutation', def: "ENUM('Prof','Dr','Mr','Ms') DEFAULT NULL" },
      { name: 'department_id', def: "INT DEFAULT NULL" },
      { name: 'password_reset_token', def: "VARCHAR(255) DEFAULT NULL" },
      { name: 'password_reset_expires', def: "DATETIME DEFAULT NULL" },
    ];

    console.log('3. Adding new columns to users table...');
    for (const col of columnsToAdd) {
      try {
        await db.query(`ALTER TABLE users ADD COLUMN ${col.name} ${col.def}`);
        console.log(`   âœ… Added column: ${col.name}`);
      } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
          console.log(`   â­ï¸  Column ${col.name} already exists, skipping`);
        } else {
          throw err;
        }
      }
    }

    // 4. Add FK constraint for department_id
    console.log('4. Adding FK constraint for department_id...');
    try {
      await db.query(`
        ALTER TABLE users
        ADD CONSTRAINT fk_users_department 
        FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
      `);
      console.log('   âœ… FK constraint added');
    } catch (err) {
      if (err.code === 'ER_DUP_KEYNAME' || err.message.includes('Duplicate')) {
        console.log('   â­ï¸  FK constraint already exists, skipping');
      } else {
        console.log('   âš ï¸  FK constraint warning:', err.message);
      }
    }

    // 5. Seed initial admin user
    console.log('5. Seeding admin user...');
    const [existing] = await db.query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
    if (existing.length === 0) {
      // bcryptjs not yet installed - we'll use a plain placeholder password
      // It will be hashed properly once bcryptjs is installed
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      await db.query(`
        INSERT INTO users (name, email, password, role, department) 
        VALUES ('System Admin', 'admin@lnmiit.ac.in', ?, 'admin', 'Administration')
      `, [hashedPassword]);
      console.log('   âœ… Admin user created (email: admin@lnmiit.ac.in, password: admin123)');
    } else {
      console.log('   â­ï¸  Admin user already exists');
    }

    console.log('\nðŸŽ‰ Migration completed successfully!');
  } catch (error) {
    console.error('âŒ Migration failed:', error.message);
    throw error;
  } finally {
    process.exit(0);
  }
}

migrate();

