-- Add session-level final lock columns used by DoFA lock/unlock workflow.
-- Idempotent for MySQL variants that do not support ADD COLUMN IF NOT EXISTS.

SET @db := DATABASE();

SET @exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db
    AND TABLE_NAME = 'appraisal_sessions'
    AND COLUMN_NAME = 'final_locked'
);
SET @sql := IF(
  @exists = 0,
  'ALTER TABLE appraisal_sessions ADD COLUMN final_locked TINYINT(1) NOT NULL DEFAULT 0',
  'SELECT "final_locked already exists"'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db
    AND TABLE_NAME = 'appraisal_sessions'
    AND COLUMN_NAME = 'final_locked_at'
);
SET @sql := IF(
  @exists = 0,
  'ALTER TABLE appraisal_sessions ADD COLUMN final_locked_at TIMESTAMP NULL DEFAULT NULL',
  'SELECT "final_locked_at already exists"'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db
    AND TABLE_NAME = 'appraisal_sessions'
    AND COLUMN_NAME = 'final_locked_by'
);
SET @sql := IF(
  @exists = 0,
  'ALTER TABLE appraisal_sessions ADD COLUMN final_locked_by INT NULL DEFAULT NULL',
  'SELECT "final_locked_by already exists"'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
