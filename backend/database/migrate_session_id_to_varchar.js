const mysql = require('mysql2/promise');
require('dotenv').config();

const NUMERIC_TYPES = new Set([
  'tinyint',
  'smallint',
  'mediumint',
  'int',
  'bigint',
  'decimal',
  'numeric',
  'float',
  'double'
]);

function wrapId(identifier) {
  return `\`${String(identifier).replace(/`/g, '``')}\``;
}

function currentAcademicYearFallback() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  if (month >= 7) {
    return `${year}-${String(year + 1).slice(-2)}`;
  }

  return `${year - 1}-${String(year).slice(-2)}`;
}

async function resolveCurrentSession(conn) {
  try {
    const [activeRows] = await conn.query(
      `SELECT academic_year
       FROM appraisal_sessions
       WHERE status = 'open'
       ORDER BY is_released DESC, created_at DESC, id DESC
       LIMIT 1`
    );

    if (activeRows.length && activeRows[0].academic_year) {
      return String(activeRows[0].academic_year).trim();
    }
  } catch (error) {
    // Ignore if table is unavailable in partially initialized environments.
  }

  try {
    const [settingRows] = await conn.query(
      "SELECT `value` FROM settings WHERE `key` = 'current_session' LIMIT 1"
    );

    if (settingRows.length && settingRows[0].value) {
      return String(settingRows[0].value).trim();
    }
  } catch (error) {
    // Ignore if settings table is unavailable in older environments.
  }

  return currentAcademicYearFallback();
}

async function run() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT, 10) || 3306
  });

  try {
    console.log('=== session_id VARCHAR migration ===\n');

    const [numericColumns] = await conn.query(
      `SELECT TABLE_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND COLUMN_NAME = 'session_id'`
    );

    const numericSessionColumns = numericColumns.filter((col) =>
      NUMERIC_TYPES.has(String(col.DATA_TYPE || '').toLowerCase())
    );

    if (numericSessionColumns.length === 0) {
      console.log('No numeric session_id columns found.');
    } else {
      console.log(`Found ${numericSessionColumns.length} numeric session_id column(s):`);
      for (const col of numericSessionColumns) {
        const nullSql = col.IS_NULLABLE === 'NO' ? 'NOT NULL' : 'NULL';
        const defaultSql = col.COLUMN_DEFAULT == null ? '' : ` DEFAULT ${conn.escape(String(col.COLUMN_DEFAULT))}`;
        const alterSql = `ALTER TABLE ${wrapId(col.TABLE_NAME)} MODIFY COLUMN ${wrapId('session_id')} VARCHAR(20) ${nullSql}${defaultSql}`;

        console.log(`- Altering ${col.TABLE_NAME}.session_id (${col.DATA_TYPE} -> VARCHAR(20))`);
        await conn.query(alterSql);
      }
    }

    const currentSession = await resolveCurrentSession(conn);
    const [allSessionColumns] = await conn.query(
      `SELECT DISTINCT TABLE_NAME
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND COLUMN_NAME = 'session_id'`
    );

    console.log(`\nBackfilling blank session_id values to: ${currentSession}`);
    for (const row of allSessionColumns) {
      const tableName = row.TABLE_NAME;
      const updateSql = `UPDATE ${wrapId(tableName)} SET ${wrapId('session_id')} = ? WHERE ${wrapId('session_id')} IS NULL OR TRIM(${wrapId('session_id')}) = ''`;
      const [result] = await conn.query(updateSql, [currentSession]);

      if (result.affectedRows > 0) {
        console.log(`- Updated ${tableName}: ${result.affectedRows} row(s)`);
      }
    }

    console.log('\nMigration complete.');
  } finally {
    await conn.end();
  }
}

run().catch((error) => {
  console.error('Migration failed:', error.message);
  process.exit(1);
});
