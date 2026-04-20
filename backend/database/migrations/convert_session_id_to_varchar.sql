-- Converts all numeric session_id columns to VARCHAR(20) so academic-year values
-- like '2024-25' can be stored without truncation.
-- Safe to re-run: only numeric session_id columns are altered.

SET @db := DATABASE();
SET SESSION group_concat_max_len = 1000000;

SELECT GROUP_CONCAT(
  CONCAT(
    'ALTER TABLE `', TABLE_NAME, '` MODIFY COLUMN `session_id` VARCHAR(20) ',
    CASE WHEN IS_NULLABLE = 'NO' THEN 'NOT NULL' ELSE 'NULL' END,
    CASE
      WHEN COLUMN_DEFAULT IS NULL THEN ''
      ELSE CONCAT(' DEFAULT ', QUOTE(COLUMN_DEFAULT))
    END
  )
  SEPARATOR '; '
) INTO @alter_sql
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = @db
  AND COLUMN_NAME = 'session_id'
  AND DATA_TYPE IN ('tinyint', 'smallint', 'mediumint', 'int', 'bigint', 'decimal', 'numeric', 'float', 'double');

SET @alter_sql := IFNULL(@alter_sql, 'SELECT "No numeric session_id columns found" AS message');
PREPARE stmt FROM @alter_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @current_session := COALESCE(
  (
    SELECT academic_year
    FROM appraisal_sessions
    WHERE status = 'open'
    ORDER BY is_released DESC, created_at DESC, id DESC
    LIMIT 1
  ),
  CONCAT(
    YEAR(CURDATE()) - IF(MONTH(CURDATE()) < 7, 1, 0),
    '-',
    LPAD(RIGHT(YEAR(CURDATE()) + IF(MONTH(CURDATE()) >= 7, 1, 0), 2), 2, '0')
  )
);

SELECT GROUP_CONCAT(
  CONCAT(
    'UPDATE `', TABLE_NAME, '` ',
    'SET `session_id` = ', QUOTE(@current_session), ' ',
    'WHERE `session_id` IS NULL OR TRIM(`session_id`) = '''''
  )
  SEPARATOR '; '
) INTO @fill_sql
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = @db
  AND COLUMN_NAME = 'session_id';

SET @fill_sql := IFNULL(@fill_sql, 'SELECT "No session_id columns found" AS message');
PREPARE stmt_fill FROM @fill_sql;
EXECUTE stmt_fill;
DEALLOCATE PREPARE stmt_fill;

