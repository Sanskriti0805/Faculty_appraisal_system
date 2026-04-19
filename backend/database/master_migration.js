const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT) || 3306
  });

  try {
    console.log('=== v2.0 Master Migration ===\n');

    // 1. Departments Table
    console.log('1. Ensuring departments table exists...');
    await conn.query(`
      CREATE TABLE IF NOT EXISTS departments (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        code VARCHAR(50) NOT NULL UNIQUE,
        hod_email VARCHAR(255),
        hod_name VARCHAR(255),
        is_archived TINYINT(1) DEFAULT 0,
        archived_at TIMESTAMP NULL,
        archived_by INT NULL,
        archive_reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   Done.');

    // 2. Users Table Updates
    console.log('2. Updating users table schema...');
    await conn.query(
      "ALTER TABLE users MODIFY COLUMN role ENUM('admin','faculty','hod','dofa','dofa_office') DEFAULT 'faculty'"
    );

    const userCols = [
      ['department_id', 'INT NULL'],
      ['salutation', 'VARCHAR(20) NULL'],
      ['employee_id', 'VARCHAR(50) NULL'],
      ['employment_type', 'VARCHAR(50) NULL'],
      ['date_of_joining', 'DATE NULL'],
      ['onboarding_complete', 'TINYINT(1) DEFAULT 0'],
      ['password_reset_token', 'VARCHAR(255) NULL'],
      ['password_reset_expires', 'DATETIME NULL'],
      ['is_archived', 'TINYINT(1) DEFAULT 0'],
      ['archived_at', 'TIMESTAMP NULL'],
      ['archived_by', 'INT NULL'],
      ['archive_reason', 'TEXT']
    ];

    for (const [name, def] of userCols) {
      const [rows] = await conn.query(
        'SELECT COUNT(*) as c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = "users" AND COLUMN_NAME = ?',
        [name]
      );
      if (rows[0].c === 0) {
        await conn.query(`ALTER TABLE users ADD COLUMN ${name} ${def}`);
        console.log(`   Added to users: ${name}`);
      }
    }

    // 3. Appraisal Sessions Updates
    console.log('3. Updating appraisal_sessions table schema...');
    const sessionCols = [
      ['is_released', 'TINYINT(1) DEFAULT 0'],
      ['release_date', 'TIMESTAMP NULL'],
      ['scheduled_release', 'TIMESTAMP NULL'],
      ['release_email_sent', 'TINYINT(1) DEFAULT 0'],
      ['reminder_sent', 'TINYINT(1) DEFAULT 0'],
      ['deadline', 'DATE NULL'],
      ['reminder_days', 'INT DEFAULT 2'],
      ['reminder_time', 'TIME DEFAULT "08:00:00"']
    ];

    for (const [name, def] of sessionCols) {
      const [rows] = await conn.query(
        'SELECT COUNT(*) as c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = "appraisal_sessions" AND COLUMN_NAME = ?',
        [name]
      );
      if (rows[0].c === 0) {
        await conn.query(`ALTER TABLE appraisal_sessions ADD COLUMN ${name} ${def}`);
        console.log(`   Added to sessions: ${name}`);
      }
    }

    // 4. Submissions Updates
    console.log('4. Updating submissions table schema...');
    const subCols = [
      ['academic_year', 'VARCHAR(20) DEFAULT "2025-26"'],
      ['approved_by', 'INT NULL'],
      ['approved_at', 'TIMESTAMP NULL'],
      ['locked', 'TINYINT(1) DEFAULT 0']
    ];

    for (const [name, def] of subCols) {
      const [rows] = await conn.query(
        'SELECT COUNT(*) as c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = "submissions" AND COLUMN_NAME = ?',
        [name]
      );
      if (rows[0].c === 0) {
        await conn.query(`ALTER TABLE submissions ADD COLUMN ${name} ${def}`);
        console.log(`   Added to submissions: ${name}`);
      }
    }

    // 5. Activity Tables Updates
    console.log('5. Updating activity tables schema...');
    const activityTables = [
      {
        name: 'conference_sessions',
        columns: [
          ['role', 'VARCHAR(255) NULL'],
          ['evidence_file', 'VARCHAR(255) NULL']
        ]
      },
      {
        name: 'keynotes_talks',
        columns: [
          ['event_type', 'VARCHAR(255) NULL'],
          ['evidence_file', 'VARCHAR(255) NULL']
        ]
      },
      {
        name: 'teaching_innovation',
        columns: [
          ['evidence_file', 'VARCHAR(255) NULL']
        ]
      },
      {
        name: 'institutional_contributions',
        columns: [
          ['evidence_file', 'VARCHAR(255) NULL']
        ]
      },
      {
        name: 'awards_honours',
        columns: [
          ['honor_type', 'VARCHAR(50) NULL'],
          ['evidence_file', 'VARCHAR(255) NULL']
        ]
      }
    ];

    for (const table of activityTables) {
      console.log(`   Checking ${table.name}...`);
      for (const [colName, colDef] of table.columns) {
        const [rows] = await conn.query(
          'SELECT COUNT(*) as c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
          [table.name, colName]
        );
        if (rows[0].c === 0) {
          await conn.query(`ALTER TABLE ${table.name} ADD COLUMN ${colName} ${colDef}`);
          console.log(`     Added to ${table.name}: ${colName}`);
        }
      }
    }

    console.log('\n=== Master Migration Complete! ===');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  } finally {
    await conn.end();
  }
}

run();
