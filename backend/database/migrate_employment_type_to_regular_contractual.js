const db = require('../config/database');

async function run() {
  try {
    const [rows] = await db.query(
      `SELECT COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'employment_type'
       LIMIT 1`
    );

    if (rows.length === 0) {
      await db.query("ALTER TABLE users ADD COLUMN employment_type ENUM('regular','contractual') NULL DEFAULT NULL");
      console.log('Added users.employment_type with enum(regular, contractual).');
      return;
    }

    const column = rows[0];
    const currentColumnType = String(column.COLUMN_TYPE || '').toLowerCase();
    const isNullable = String(column.IS_NULLABLE || '').toUpperCase() === 'YES';
    const defaultRaw = column.COLUMN_DEFAULT;

    if (currentColumnType.includes("enum('fixed','contractual')") || currentColumnType.includes("enum('contractual','fixed')")) {
      const nullWidened = isNullable ? 'NULL' : 'NOT NULL';
      const defaultWidened = (() => {
        if (defaultRaw === null || defaultRaw === undefined) return isNullable ? 'DEFAULT NULL' : "DEFAULT 'fixed'";
        const lowered = String(defaultRaw).trim().toLowerCase();
        if (lowered === 'fixed' || lowered === 'regular') return "DEFAULT 'fixed'";
        if (lowered === 'contractual') return "DEFAULT 'contractual'";
        return isNullable ? 'DEFAULT NULL' : "DEFAULT 'fixed'";
      })();
      await db.query(`ALTER TABLE users MODIFY COLUMN employment_type ENUM('fixed','regular','contractual') ${nullWidened} ${defaultWidened}`);
      console.log('Temporarily widened users.employment_type enum for safe conversion.');
    }

    await db.query(
      `UPDATE users
       SET employment_type = CASE
         WHEN employment_type IS NULL OR TRIM(employment_type) = '' THEN NULL
         WHEN LOWER(TRIM(employment_type)) IN ('fixed', 'regular') THEN 'regular'
         WHEN LOWER(TRIM(employment_type)) IN ('contractual', 'contract') THEN 'contractual'
         ELSE NULL
       END`
    );

    const normalizedDefault = (() => {
      if (defaultRaw === null || defaultRaw === undefined) return null;
      const lowered = String(defaultRaw).trim().toLowerCase();
      if (lowered === 'fixed' || lowered === 'regular') return 'regular';
      if (lowered === 'contractual') return 'contractual';
      return null;
    })();

    const nullSql = isNullable ? 'NULL' : 'NOT NULL';
    const defaultSql = normalizedDefault
      ? `DEFAULT '${normalizedDefault}'`
      : (isNullable ? 'DEFAULT NULL' : "DEFAULT 'regular'");

    await db.query(`ALTER TABLE users MODIFY COLUMN employment_type ENUM('regular','contractual') ${nullSql} ${defaultSql}`);
    console.log('users.employment_type is now enum(regular, contractual).');
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exitCode = 1;
  }
}

run();
