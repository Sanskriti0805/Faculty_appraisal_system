const db = require('../config/database');

async function run() {
  try {
    const [rows] = await db.query(
      `SELECT COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'institutional_contributions'
         AND COLUMN_NAME = 'contribution_type'
       LIMIT 1`
    );

    if (rows.length === 0) {
      console.log('No column found: institutional_contributions.contribution_type');
      return;
    }

    const isNullable = String(rows[0].IS_NULLABLE || '').toUpperCase() === 'YES';
    const defaultRaw = rows[0].COLUMN_DEFAULT;
    const nullSql = isNullable ? 'NULL' : 'NOT NULL';
    const defaultSql = defaultRaw === null || defaultRaw === undefined
      ? (isNullable ? 'DEFAULT NULL' : '')
      : `DEFAULT '${String(defaultRaw).replace(/'/g, "''")}'`;

    await db.query(
      `ALTER TABLE institutional_contributions
       MODIFY COLUMN contribution_type VARCHAR(255) ${nullSql} ${defaultSql}`.trim()
    );

    console.log('Updated institutional_contributions.contribution_type to VARCHAR(255).');
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exitCode = 1;
  }
}

run();
