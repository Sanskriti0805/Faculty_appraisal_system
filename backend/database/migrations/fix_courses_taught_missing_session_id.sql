-- Targeted fix for Courses Taught save error:
-- Unknown column 'session_id' in 'field list'
--
-- College administrator instructions:
-- 1. Back up the college database.
-- 2. Select the SAME database configured as DB_NAME in the deployed backend.
--    In phpMyAdmin select that database before importing this file.
--    In MySQL Workbench select it as the default schema before running this file.
-- 3. Run this entire file. It adds the column only when missing.
-- 4. Confirm the final result shows session_id as varchar(20).
-- 5. Restart the backend, refresh the form, save a draft, then reload and
--    confirm that the saved course and its feedback evidence are present.
--
-- This patch does not delete, replace, or assign years to existing records.
-- Existing rows receive NULL when the column is added. The application filters
-- courses by session_id, so those legacy rows will not appear in session views
-- until the administrator maps them to their verified academic year(s).
-- Do not assign every historical row to the current year without checking.
-- If session_id already exists, its type and values are left unchanged.
-- This targets the pictured error; it is not a complete database upgrade.

SELECT DATABASE() AS selected_database;

SET @courses_session_column_exists := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'courses_taught'
      AND COLUMN_NAME = 'session_id'
);

SET @courses_session_patch_sql := IF(
    @courses_session_column_exists = 0,
    'ALTER TABLE `courses_taught` ADD COLUMN `session_id` VARCHAR(20) NULL',
    'SELECT ''courses_taught.session_id already exists; no change made'' AS result'
);

PREPARE courses_session_patch FROM @courses_session_patch_sql;
EXECUTE courses_session_patch;
DEALLOCATE PREPARE courses_session_patch;

SHOW COLUMNS FROM courses_taught LIKE 'session_id';

SELECT COUNT(*) AS legacy_courses_needing_academic_year_review
FROM courses_taught
WHERE session_id IS NULL OR session_id = '';
