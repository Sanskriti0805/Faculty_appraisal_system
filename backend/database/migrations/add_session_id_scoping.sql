-- Session-based data isolation for faculty form tables.
-- Adds settings.current_session, session_id columns, and session-aware keys/indexes.

SET @db := DATABASE();

CREATE TABLE IF NOT EXISTS settings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  `key` VARCHAR(100) NOT NULL UNIQUE,
  `value` VARCHAR(255) NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO settings (`key`, `value`)
SELECT
  'current_session',
  COALESCE(
    (
      SELECT academic_year
      FROM appraisal_sessions
      WHERE status = 'open'
      ORDER BY is_released DESC, created_at DESC, id DESC
      LIMIT 1
    ),
    CONCAT(YEAR(CURDATE()) - IF(MONTH(CURDATE()) < 7, 1, 0), '-', LPAD(RIGHT(YEAR(CURDATE()) + IF(MONTH(CURDATE()) >= 7, 1, 0), 2), 2, '0'))
  )
WHERE NOT EXISTS (
  SELECT 1 FROM settings WHERE `key` = 'current_session'
);

-- ---------- Helper pattern repeated per table ----------
-- 1) Add session_id if missing
-- 2) Backfill missing session_id to current_session
-- 3) Add composite index (faculty_id, session_id) if missing

SET @current_session := (SELECT `value` FROM settings WHERE `key` = 'current_session' LIMIT 1);

-- courses_taught
SET @exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'courses_taught' AND COLUMN_NAME = 'session_id');
SET @sql := IF(@exists = 0, 'ALTER TABLE courses_taught ADD COLUMN session_id VARCHAR(20) NULL AFTER faculty_id', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
UPDATE courses_taught SET session_id = @current_session WHERE session_id IS NULL OR session_id = '';
SET @idx_exists := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'courses_taught' AND INDEX_NAME = 'idx_courses_taught_faculty_session');
SET @sql := IF(@idx_exists = 0, 'CREATE INDEX idx_courses_taught_faculty_session ON courses_taught (faculty_id, session_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- new_courses
SET @exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'new_courses' AND COLUMN_NAME = 'session_id');
SET @sql := IF(@exists = 0, 'ALTER TABLE new_courses ADD COLUMN session_id VARCHAR(20) NULL AFTER faculty_id', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
UPDATE new_courses SET session_id = @current_session WHERE session_id IS NULL OR session_id = '';
SET @idx_exists := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'new_courses' AND INDEX_NAME = 'idx_new_courses_faculty_session');
SET @sql := IF(@idx_exists = 0, 'CREATE INDEX idx_new_courses_faculty_session ON new_courses (faculty_id, session_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- research_publications
SET @exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'research_publications' AND COLUMN_NAME = 'session_id');
SET @sql := IF(@exists = 0, 'ALTER TABLE research_publications ADD COLUMN session_id VARCHAR(20) NULL AFTER faculty_id', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
UPDATE research_publications SET session_id = @current_session WHERE session_id IS NULL OR session_id = '';
SET @idx_exists := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'research_publications' AND INDEX_NAME = 'idx_research_publications_faculty_session');
SET @sql := IF(@idx_exists = 0, 'CREATE INDEX idx_research_publications_faculty_session ON research_publications (faculty_id, session_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- research_grants
SET @exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'research_grants' AND COLUMN_NAME = 'session_id');
SET @sql := IF(@exists = 0, 'ALTER TABLE research_grants ADD COLUMN session_id VARCHAR(20) NULL AFTER faculty_id', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
UPDATE research_grants SET session_id = @current_session WHERE session_id IS NULL OR session_id = '';
SET @idx_exists := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'research_grants' AND INDEX_NAME = 'idx_research_grants_faculty_session');
SET @sql := IF(@idx_exists = 0, 'CREATE INDEX idx_research_grants_faculty_session ON research_grants (faculty_id, session_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- submitted_proposals
SET @exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'submitted_proposals' AND COLUMN_NAME = 'session_id');
SET @sql := IF(@exists = 0, 'ALTER TABLE submitted_proposals ADD COLUMN session_id VARCHAR(20) NULL AFTER faculty_id', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
UPDATE submitted_proposals SET session_id = @current_session WHERE session_id IS NULL OR session_id = '';
SET @idx_exists := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'submitted_proposals' AND INDEX_NAME = 'idx_submitted_proposals_faculty_session');
SET @sql := IF(@idx_exists = 0, 'CREATE INDEX idx_submitted_proposals_faculty_session ON submitted_proposals (faculty_id, session_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- patents
SET @exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'patents' AND COLUMN_NAME = 'session_id');
SET @sql := IF(@exists = 0, 'ALTER TABLE patents ADD COLUMN session_id VARCHAR(20) NULL AFTER faculty_id', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
UPDATE patents SET session_id = @current_session WHERE session_id IS NULL OR session_id = '';
SET @idx_exists := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'patents' AND INDEX_NAME = 'idx_patents_faculty_session');
SET @sql := IF(@idx_exists = 0, 'CREATE INDEX idx_patents_faculty_session ON patents (faculty_id, session_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- awards_honours
SET @exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'awards_honours' AND COLUMN_NAME = 'session_id');
SET @sql := IF(@exists = 0, 'ALTER TABLE awards_honours ADD COLUMN session_id VARCHAR(20) NULL AFTER faculty_id', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
UPDATE awards_honours SET session_id = @current_session WHERE session_id IS NULL OR session_id = '';
SET @idx_exists := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'awards_honours' AND INDEX_NAME = 'idx_awards_honours_faculty_session');
SET @sql := IF(@idx_exists = 0, 'CREATE INDEX idx_awards_honours_faculty_session ON awards_honours (faculty_id, session_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- consultancy
SET @exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'consultancy' AND COLUMN_NAME = 'session_id');
SET @sql := IF(@exists = 0, 'ALTER TABLE consultancy ADD COLUMN session_id VARCHAR(20) NULL AFTER faculty_id', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
UPDATE consultancy SET session_id = @current_session WHERE session_id IS NULL OR session_id = '';
SET @idx_exists := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'consultancy' AND INDEX_NAME = 'idx_consultancy_faculty_session');
SET @sql := IF(@idx_exists = 0, 'CREATE INDEX idx_consultancy_faculty_session ON consultancy (faculty_id, session_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- paper_reviews
SET @exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'paper_reviews' AND COLUMN_NAME = 'session_id');
SET @sql := IF(@exists = 0, 'ALTER TABLE paper_reviews ADD COLUMN session_id VARCHAR(20) NULL AFTER faculty_id', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
UPDATE paper_reviews SET session_id = @current_session WHERE session_id IS NULL OR session_id = '';
SET @idx_exists := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'paper_reviews' AND INDEX_NAME = 'idx_paper_reviews_faculty_session');
SET @sql := IF(@idx_exists = 0, 'CREATE INDEX idx_paper_reviews_faculty_session ON paper_reviews (faculty_id, session_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- technology_transfer
SET @exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'technology_transfer' AND COLUMN_NAME = 'session_id');
SET @sql := IF(@exists = 0, 'ALTER TABLE technology_transfer ADD COLUMN session_id VARCHAR(20) NULL AFTER faculty_id', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
UPDATE technology_transfer SET session_id = @current_session WHERE session_id IS NULL OR session_id = '';
SET @idx_exists := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'technology_transfer' AND INDEX_NAME = 'idx_technology_transfer_faculty_session');
SET @sql := IF(@idx_exists = 0, 'CREATE INDEX idx_technology_transfer_faculty_session ON technology_transfer (faculty_id, session_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- conference_sessions
SET @exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'conference_sessions' AND COLUMN_NAME = 'session_id');
SET @sql := IF(@exists = 0, 'ALTER TABLE conference_sessions ADD COLUMN session_id VARCHAR(20) NULL AFTER faculty_id', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
UPDATE conference_sessions SET session_id = @current_session WHERE session_id IS NULL OR session_id = '';
SET @idx_exists := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'conference_sessions' AND INDEX_NAME = 'idx_conference_sessions_faculty_session');
SET @sql := IF(@idx_exists = 0, 'CREATE INDEX idx_conference_sessions_faculty_session ON conference_sessions (faculty_id, session_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- keynotes_talks
SET @exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'keynotes_talks' AND COLUMN_NAME = 'session_id');
SET @sql := IF(@exists = 0, 'ALTER TABLE keynotes_talks ADD COLUMN session_id VARCHAR(20) NULL AFTER faculty_id', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
UPDATE keynotes_talks SET session_id = @current_session WHERE session_id IS NULL OR session_id = '';
SET @idx_exists := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'keynotes_talks' AND INDEX_NAME = 'idx_keynotes_talks_faculty_session');
SET @sql := IF(@idx_exists = 0, 'CREATE INDEX idx_keynotes_talks_faculty_session ON keynotes_talks (faculty_id, session_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- teaching_innovation
SET @exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'teaching_innovation' AND COLUMN_NAME = 'session_id');
SET @sql := IF(@exists = 0, 'ALTER TABLE teaching_innovation ADD COLUMN session_id VARCHAR(20) NULL AFTER faculty_id', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
UPDATE teaching_innovation SET session_id = @current_session WHERE session_id IS NULL OR session_id = '';
SET @idx_exists := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'teaching_innovation' AND INDEX_NAME = 'idx_teaching_innovation_faculty_session');
SET @sql := IF(@idx_exists = 0, 'CREATE INDEX idx_teaching_innovation_faculty_session ON teaching_innovation (faculty_id, session_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- institutional_contributions
SET @exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'institutional_contributions' AND COLUMN_NAME = 'session_id');
SET @sql := IF(@exists = 0, 'ALTER TABLE institutional_contributions ADD COLUMN session_id VARCHAR(20) NULL AFTER faculty_id', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
UPDATE institutional_contributions SET session_id = @current_session WHERE session_id IS NULL OR session_id = '';
SET @idx_exists := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'institutional_contributions' AND INDEX_NAME = 'idx_institutional_contributions_faculty_session');
SET @sql := IF(@idx_exists = 0, 'CREATE INDEX idx_institutional_contributions_faculty_session ON institutional_contributions (faculty_id, session_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- faculty_goals
SET @exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'faculty_goals' AND COLUMN_NAME = 'session_id');
SET @sql := IF(@exists = 0, 'ALTER TABLE faculty_goals ADD COLUMN session_id VARCHAR(20) NULL AFTER faculty_id', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
UPDATE faculty_goals SET session_id = @current_session WHERE session_id IS NULL OR session_id = '';
SET @idx_exists := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'faculty_goals' AND INDEX_NAME = 'idx_faculty_goals_faculty_session');
SET @sql := IF(@idx_exists = 0, 'CREATE INDEX idx_faculty_goals_faculty_session ON faculty_goals (faculty_id, session_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- dynamic_responses
SET @exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'dynamic_responses' AND COLUMN_NAME = 'session_id');
SET @sql := IF(@exists = 0, 'ALTER TABLE dynamic_responses ADD COLUMN session_id VARCHAR(20) NULL AFTER faculty_id', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
UPDATE dynamic_responses SET session_id = @current_session WHERE session_id IS NULL OR session_id = '';
SET @idx_exists := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'dynamic_responses' AND INDEX_NAME = 'idx_dynamic_responses_faculty_session');
SET @sql := IF(@idx_exists = 0, 'CREATE INDEX idx_dynamic_responses_faculty_session ON dynamic_responses (faculty_id, session_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @uk_exists := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'dynamic_responses' AND INDEX_NAME = 'unique_resp');
SET @sql := IF(@uk_exists > 0, 'ALTER TABLE dynamic_responses DROP INDEX unique_resp', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @uk_exists := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'dynamic_responses' AND INDEX_NAME = 'unique_resp_session');
SET @sql := IF(@uk_exists = 0, 'ALTER TABLE dynamic_responses ADD UNIQUE KEY unique_resp_session (faculty_id, session_id, field_id, submission_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- legacy_section_entries
SET @exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'legacy_section_entries' AND COLUMN_NAME = 'session_id');
SET @sql := IF(@exists = 0, 'ALTER TABLE legacy_section_entries ADD COLUMN session_id VARCHAR(20) NULL AFTER academic_year', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
UPDATE legacy_section_entries SET session_id = COALESCE(NULLIF(academic_year, ''), @current_session) WHERE session_id IS NULL OR session_id = '';
SET @idx_exists := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'legacy_section_entries' AND INDEX_NAME = 'idx_legacy_section_faculty_session');
SET @sql := IF(@idx_exists = 0, 'CREATE INDEX idx_legacy_section_faculty_session ON legacy_section_entries (faculty_id, session_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @uk_exists := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'legacy_section_entries' AND INDEX_NAME = 'uq_legacy_section_year');
SET @sql := IF(@uk_exists > 0, 'ALTER TABLE legacy_section_entries DROP INDEX uq_legacy_section_year', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @uk_exists := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'legacy_section_entries' AND INDEX_NAME = 'uq_legacy_section_session');
SET @sql := IF(@uk_exists = 0, 'ALTER TABLE legacy_section_entries ADD UNIQUE KEY uq_legacy_section_session (faculty_id, session_id, section_key)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
