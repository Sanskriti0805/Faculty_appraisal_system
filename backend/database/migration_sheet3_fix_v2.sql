-- Migration: Fix Sheet 3 Rubrics Grade Increment - Remove Duplicates and Add Grade Tracking
-- Date: 2026-04-05

USE faculty_appraisal;

-- Check MySQL version and column existence
SELECT VERSION();

-- Check if final_grade column exists
SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'faculty_appraisal' 
AND TABLE_NAME = 'Dofa_evaluation_sheet3' 
AND COLUMN_NAME = 'final_grade';

-- Add final_grade column to Dofa_evaluation_sheet3 if it doesn't exist
-- Using a conditional approach for compatibility
DELIMITER $$

DROP PROCEDURE IF EXISTS add_final_grade_column$$

CREATE PROCEDURE add_final_grade_column()
BEGIN
  DECLARE column_exists INT DEFAULT 0;
  
  SELECT COUNT(*) INTO column_exists FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = 'faculty_appraisal' 
  AND TABLE_NAME = 'Dofa_evaluation_sheet3' 
  AND COLUMN_NAME = 'final_grade';
  
  IF column_exists = 0 THEN
    ALTER TABLE Dofa_evaluation_sheet3 
    ADD COLUMN final_grade VARCHAR(10) NULL AFTER academic_year;
    SELECT 'Column final_grade added' as status;
  ELSE
    SELECT 'Column final_grade already exists' as status;
  END IF;
END$$

DELIMITER ;

-- Execute the procedure
CALL add_final_grade_column();
DROP PROCEDURE add_final_grade_column;

-- Backfill final_grade data from Sheet 2
UPDATE Dofa_evaluation_sheet3 e3
SET final_grade = (
  SELECT e2.final_grade
  FROM Dofa_evaluation_sheet2 e2
  WHERE e2.submission_id = e3.submission_id
  ORDER BY e2.updated_at DESC
  LIMIT 1
)
WHERE final_grade IS NULL;

-- Remove duplicate entries (keep only the latest one per submission + grade)
DELETE FROM Dofa_evaluation_sheet3
WHERE id NOT IN (
  SELECT id FROM (
    SELECT MAX(id) as id
    FROM Dofa_evaluation_sheet3
    GROUP BY submission_id, COALESCE(final_grade, '')
  ) latest_records
);

-- Add UNIQUE constraint to prevent duplicate entries
DELIMITER $$

DROP PROCEDURE IF EXISTS add_unique_constraint$$

CREATE PROCEDURE add_unique_constraint()
BEGIN
  DECLARE constraint_exists INT DEFAULT 0;
  
  SELECT COUNT(*) INTO constraint_exists FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = 'faculty_appraisal'
  AND TABLE_NAME = 'Dofa_evaluation_sheet3'
  AND CONSTRAINT_NAME = 'unique_submission_grade';
  
  IF constraint_exists > 0 THEN
    ALTER TABLE Dofa_evaluation_sheet3 DROP INDEX unique_submission_grade;
    SELECT 'Dropped existing unique constraint' as status;
  END IF;
  
  ALTER TABLE Dofa_evaluation_sheet3
  ADD UNIQUE KEY unique_submission_grade (submission_id, final_grade);
  SELECT 'Added unique constraint' as status;
END$$

DELIMITER ;

-- Execute the procedure
CALL add_unique_constraint();
DROP PROCEDURE add_unique_constraint;

-- Verification: Check for remaining duplicates
SELECT 'Checking for duplicates (should be empty):' as check_type;
SELECT submission_id, final_grade, COUNT(*) as count
FROM Dofa_evaluation_sheet3
GROUP BY submission_id, final_grade
HAVING count > 1;

-- Show final state of Sheet 3
SELECT 'Final state of Sheet 3:' as info;
SELECT COUNT(*) as total_records, 
       COUNT(DISTINCT submission_id) as unique_submissions,
       COUNT(DISTINCT final_grade) as unique_grades
FROM Dofa_evaluation_sheet3;

SELECT 'Migration completed successfully!' as result;

