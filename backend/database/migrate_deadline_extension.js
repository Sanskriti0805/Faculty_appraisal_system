/**
 * Migration: Deadline Extension Feature
 * Adds columns to appraisal_sessions table for tracking deadline extensions
 * Columns: original_deadline, deadline_extension_count, last_extended_at
 * Safe to run multiple times - checks if columns exist before adding
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');

async function columnExists(conn, table, column) {
  const [rows] = await conn.query(
    `SELECT COUNT(*) as cnt FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  return rows[0].cnt > 0;
}

async function addColumnIfMissing(conn, table, column, definition) {
  const exists = await columnExists(conn, table, column);
  if (exists) {
    console.log(`  ⏭️  ${table}.${column} already exists`);
    return;
  }
  await conn.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
  console.log(`  ✅ ${table}.${column} added`);
}

async function migrate() {
  let conn;
  try {
    console.log('🚀 Deadline Extension Migration\n');
    
    conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'faculty_appraisal'
    });

    console.log('📋 appraisal_sessions:');
    
    await addColumnIfMissing(
      conn,
      'appraisal_sessions',
      'original_deadline',
      'DATE DEFAULT NULL COMMENT "Original deadline before any extensions"'
    );
    
    await addColumnIfMissing(
      conn,
      'appraisal_sessions',
      'deadline_extension_count',
      'INT DEFAULT 0 COMMENT "Number of times deadline has been extended"'
    );
    
    await addColumnIfMissing(
      conn,
      'appraisal_sessions',
      'last_extended_at',
      'TIMESTAMP NULL DEFAULT NULL COMMENT "Last time deadline was extended"'
    );

    console.log('\n✅ Migration complete!');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}

migrate();
