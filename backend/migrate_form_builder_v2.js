/**
 * Migration: Form Builder v2
 * - Adds parent_id, description to dynamic_sections
 * - Adds dynamic_section_id, scoring_type, per_unit_marks, form_type to Dofa_rubrics
 * Safe to run multiple times.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const db = require('./config/database');

async function columnExists(table, column) {
  const [rows] = await db.query(
    `SELECT COUNT(*) as cnt FROM information_schema.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  return rows[0].cnt > 0;
}

async function constraintExists(table, constraintName) {
  const [rows] = await db.query(
    `SELECT COUNT(*) as cnt FROM information_schema.TABLE_CONSTRAINTS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_NAME = ?`,
    [table, constraintName]
  );
  return rows[0].cnt > 0;
}

async function addColumnIfMissing(table, column, definition) {
  const exists = await columnExists(table, column);
  if (exists) {
    console.log(`  â­  ${table}.${column} already exists`);
    return;
  }
  await db.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
  console.log(`  âœ… ${table}.${column} added`);
}

async function addFKIfMissing(table, constraintName, sql) {
  const exists = await constraintExists(table, constraintName);
  if (exists) {
    console.log(`  â­  FK ${constraintName} already exists`);
    return;
  }
  await db.query(`ALTER TABLE \`${table}\` ADD CONSTRAINT \`${constraintName}\` ${sql}`);
  console.log(`  âœ… FK ${constraintName} added`);
}

async function migrate() {
  console.log('ðŸš€ Form Builder v2 Migration\n');

  console.log('ðŸ“Œ dynamic_sections:');
  await addColumnIfMissing('dynamic_sections', 'parent_id', 'INT DEFAULT NULL');
  await addColumnIfMissing('dynamic_sections', 'description', 'TEXT DEFAULT NULL');
  await addFKIfMissing(
    'dynamic_sections',
    'fk_section_parent',
    'FOREIGN KEY (parent_id) REFERENCES dynamic_sections(id) ON DELETE SET NULL'
  );

  console.log('\nðŸ“Œ Dofa_rubrics:');
  await addColumnIfMissing('Dofa_rubrics', 'dynamic_section_id', 'INT DEFAULT NULL');
  await addColumnIfMissing('Dofa_rubrics', 'scoring_type', "ENUM('manual','count_based','text_exists') DEFAULT 'manual'");
  await addColumnIfMissing('Dofa_rubrics', 'per_unit_marks', 'DECIMAL(5,2) DEFAULT NULL');
  await addColumnIfMissing('Dofa_rubrics', 'form_type', "ENUM('A','B') DEFAULT NULL");
  await addFKIfMissing(
    'Dofa_rubrics',
    'fk_rubric_dynamic_section',
    'FOREIGN KEY (dynamic_section_id) REFERENCES dynamic_sections(id) ON DELETE SET NULL'
  );

  console.log('\nâœ¨ Migration complete!');
  process.exit(0);
}

migrate().catch(err => {
  console.error('\nâŒ Fatal migration error:', err.message);
  process.exit(1);
});

