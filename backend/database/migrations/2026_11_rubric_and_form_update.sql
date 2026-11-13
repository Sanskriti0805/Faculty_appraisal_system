-- ============================================================================
-- Faculty Appraisal System - November 2026 rubric and form update
-- ============================================================================
-- Run this ONCE against the production database, after taking a backup:
--
--   mysql -u <user> -p <database_name> < 2026_11_rubric_and_form_update.sql
--
-- It is safe to run more than once: the rubric part is skipped when the
-- "9. PhD Thesis Reviewer/Examiner" rubric already exists, and the schema part
-- only adds what is missing.
--
-- This file does the same work the backend does automatically on startup, so
-- running it is optional. Use it if you prefer to apply database changes by hand
-- before deploying the new code.
-- ============================================================================

DROP PROCEDURE IF EXISTS apply_nov2026_update;

DELIMITER $$

CREATE PROCEDURE apply_nov2026_update()
BEGIN
  DECLARE already_applied INT DEFAULT 0;
  DECLARE rubric_rows INT DEFAULT 0;

  -- --------------------------------------------------------------------------
  -- 1. Schema changes
  -- --------------------------------------------------------------------------
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'new_courses' AND COLUMN_NAME = 'is_coordinator') THEN
    ALTER TABLE new_courses ADD COLUMN is_coordinator VARCHAR(3) NULL DEFAULT 'No';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'new_courses' AND COLUMN_NAME = 'num_sections') THEN
    ALTER TABLE new_courses ADD COLUMN num_sections INT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'new_courses' AND COLUMN_NAME = 'num_students') THEN
    ALTER TABLE new_courses ADD COLUMN num_students INT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'keynotes_talks' AND COLUMN_NAME = 'talk_level') THEN
    ALTER TABLE keynotes_talks ADD COLUMN talk_level VARCHAR(20) NULL;
  END IF;

  CREATE TABLE IF NOT EXISTS phd_thesis_reviews (
    id INT PRIMARY KEY AUTO_INCREMENT,
    faculty_id INT,
    session_id VARCHAR(20) NULL,
    review_type VARCHAR(50),
    institution_name VARCHAR(255),
    evidence_file VARCHAR(255) NULL,
    status ENUM('draft','submitted') DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    KEY idx_phd_thesis_reviews_faculty_session (faculty_id, session_id),
    FOREIGN KEY (faculty_id) REFERENCES faculty_information(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

  -- --------------------------------------------------------------------------
  -- 2. Rubric changes (skipped when already applied or when there are no rubrics)
  -- --------------------------------------------------------------------------
  SELECT COUNT(*) INTO rubric_rows FROM Dofa_rubrics;
  SELECT COUNT(*) INTO already_applied FROM Dofa_rubrics WHERE section_name = '9. PhD Thesis Reviewer/Examiner';

  IF rubric_rows > 0 AND already_applied = 0 THEN
    START TRANSACTION;

    -- Sections after the new PhD section move down by one (highest number first).
    UPDATE Dofa_rubrics SET section_name = '14. Other activities' WHERE section_name = '13. Other activities';
    UPDATE Dofa_rubrics SET section_name = '13. Other Institutional Contributions' WHERE section_name = '12. Other Institutional Contributions';
    UPDATE Dofa_rubrics SET section_name = '12. Visits/Honours/Consultancy' WHERE section_name = '11. Visits/Honours/Consultancy';
    UPDATE Dofa_rubrics SET section_name = '11. Talks and conferences' WHERE section_name = '10. Talks and conferences';
    UPDATE Dofa_rubrics SET section_name = '10. Technology Contribution' WHERE section_name = '9. Technology Contribution';

    -- 3. New courses
    UPDATE Dofa_rubrics SET sub_section = 'New Course designed and offered', max_marks = 4
      WHERE section_name = '3. New Courses designed' AND sub_section = 'New Courses designed';

    -- 5. Conference publication categories
    UPDATE Dofa_rubrics SET sub_section = 'Conference Publication: Tier 1 (B/C)', max_marks = 6 WHERE section_name = '5. Conference' AND sub_section = 'Tier 1';
    UPDATE Dofa_rubrics SET sub_section = 'Conference Publication: Tier 2', max_marks = 4 WHERE section_name = '5. Conference' AND sub_section = 'Tier 2';
    UPDATE Dofa_rubrics SET sub_section = 'Conference Publication: Tier 3', max_marks = 3 WHERE section_name = '5. Conference' AND sub_section = 'Tier 3';

    -- 7. Sponsored projects: the old ">= 20 lakh" rows become 20-50 lakh
    UPDATE Dofa_rubrics SET sub_section = 'Grants received: 20lacs<=value<50lacs (PI)', max_marks = 15
      WHERE section_name = '7. Sponsored project (approved in AY)' AND sub_section = 'Grants received: Value>=20lacs (points for each project for PI)';
    UPDATE Dofa_rubrics SET sub_section = 'Grants received: 20lacs<=value<50lacs (co-PI)', max_marks = 7.5
      WHERE section_name = '7. Sponsored project (approved in AY)' AND sub_section = 'Grants received: Values>=20lacs (points for each project for co-PI)';

    -- 10. Technology contribution
    UPDATE Dofa_rubrics SET sub_section = 'Technology developed and transferred [3/6/10/15 points]', max_marks = 15, per_unit_marks = 15
      WHERE section_name = '10. Technology Contribution' AND sub_section = 'Technology developed and transferred [3/6/10 points]';
    UPDATE Dofa_rubrics SET sub_section = 'Software developed and deployment [3/6/10/15 points]', max_marks = 15, per_unit_marks = 15
      WHERE section_name = '10. Technology Contribution' AND sub_section = 'Software developed and deployment [3/6/10 points]';

    -- 12. Honours and consultancy
    UPDATE Dofa_rubrics SET max_marks = 15 WHERE section_name = '12. Visits/Honours/Consultancy' AND sub_section = 'International Honours';
    UPDATE Dofa_rubrics SET max_marks = 10 WHERE section_name = '12. Visits/Honours/Consultancy' AND sub_section = 'National Honours';
    UPDATE Dofa_rubrics SET sub_section = 'Consultancy Project: 5 lacs<=Project Value<25 lacs (PI)', max_marks = 10
      WHERE section_name = '12. Visits/Honours/Consultancy' AND sub_section = 'Consultancy Project: Project Value >5 lacs (PI)';
    UPDATE Dofa_rubrics SET sub_section = 'Consultancy Project: 5 lacs<=Project Value<25 lacs (co-PI)', max_marks = 5
      WHERE section_name = '12. Visits/Honours/Consultancy' AND sub_section = 'Consultancy Project: Project Value >5 lacs (co-PI)';
    UPDATE Dofa_rubrics SET sub_section = 'Consultancy Project: 2 lacs<=Project Value<5 lacs (PI)', max_marks = 6
      WHERE section_name = '12. Visits/Honours/Consultancy' AND sub_section = 'Consultancy Project: 2 lacs<=Project Value<=5lacs (PI)';
    UPDATE Dofa_rubrics SET sub_section = 'Consultancy Project: 2 lacs<=Project Value<5 lacs (co-PI)', max_marks = 3
      WHERE section_name = '12. Visits/Honours/Consultancy' AND sub_section = 'Consultancy Project: 2 lacs<=Project Value<=5lacs (co-PI)';

    -- 13. Institutional contributions
    UPDATE Dofa_rubrics SET max_marks = 10 WHERE section_name = '13. Other Institutional Contributions' AND sub_section = 'Administrative Positions: Assistant Dean';
    UPDATE Dofa_rubrics SET max_marks = 7 WHERE section_name = '13. Other Institutional Contributions' AND sub_section = 'Administrative Positions: Hostel Warden/ Mess Warden';
    UPDATE Dofa_rubrics SET sub_section = 'Other Significant: Committee Member (up to a maximum of 6 points)', max_marks = 2
      WHERE section_name = '13. Other Institutional Contributions' AND sub_section = 'Other Significant: Committee Member (up to a maximum of 5 points)';
    UPDATE Dofa_rubrics SET sub_section = 'Other Significant: Member of Major responsibilities (Admissions, Accreditations, etc) [1-6 points]'
      WHERE section_name = '13. Other Institutional Contributions' AND sub_section = 'Other Significant: Member of Major responsibilities (Admissions, Accreditations, etc)';

    -- New rubric rows
    INSERT INTO Dofa_rubrics (section_name, sub_section, max_marks, scoring_type, per_unit_marks, data_source) VALUES
      ('3. New Courses designed', 'Course Coordinator (for large courses with multiple sections)', 4, 'manual', NULL, 'new_courses'),
      ('5. Conference', 'Conference Publication: A*', 10, 'manual', NULL, 'research_publications'),
      ('5. Conference', 'Conference Publication: A', 8, 'manual', NULL, 'research_publications'),
      ('7. Sponsored project (approved in AY)', 'Grants received: Value>=1cr (PI)', 25, 'manual', NULL, 'research_grants'),
      ('7. Sponsored project (approved in AY)', 'Grants received: Value>=1cr (co-PI)', 12.5, 'manual', NULL, 'research_grants'),
      ('7. Sponsored project (approved in AY)', 'Grants received: 50lacs<=value<1cr (PI)', 20, 'manual', NULL, 'research_grants'),
      ('7. Sponsored project (approved in AY)', 'Grants received: 50lacs<=value<1cr (co-PI)', 10, 'manual', NULL, 'research_grants'),
      ('9. PhD Thesis Reviewer/Examiner', 'PhD Thesis reviewer/examiner (5 points per thesis, up to a maximum of 10 points) [Tier-1/2 institutes only]', 10, 'manual', 5, 'phd_thesis_reviews'),
      ('11. Talks and conferences', 'Invited talks: Keynote (irrespective of national/international)', 10, 'manual', NULL, 'keynotes_talks'),
      ('11. Talks and conferences', 'Invited talks: International invited talk', 10, 'manual', NULL, 'keynotes_talks'),
      ('12. Visits/Honours/Consultancy', 'Consultancy Project: 25 lacs<=Project Value<=50 lacs (PI)', 15, 'manual', NULL, 'consultancy'),
      ('12. Visits/Honours/Consultancy', 'Consultancy Project: 25 lacs<=Project Value<=50 lacs (co-PI)', 7.5, 'manual', NULL, 'consultancy'),
      ('12. Visits/Honours/Consultancy', 'Consultancy Project: Project Value >50 lacs (PI)', 20, 'manual', NULL, 'consultancy'),
      ('12. Visits/Honours/Consultancy', 'Consultancy Project: Project Value >50 lacs (co-PI)', 10, 'manual', NULL, 'consultancy');

    COMMIT;
    SELECT 'Rubric update applied.' AS result;
  ELSE
    SELECT 'Rubric update skipped (already applied, or no rubric rows).' AS result;
  END IF;
END$$

DELIMITER ;

CALL apply_nov2026_update();
DROP PROCEDURE apply_nov2026_update;

-- Check: this should list 14 inserted rows plus the renamed ones
-- SELECT id, section_name, sub_section, max_marks FROM Dofa_rubrics ORDER BY id;
