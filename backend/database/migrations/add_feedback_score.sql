-- Add feedback score column to courses_taught table
-- This allows storing student feedback scores with up to 3 decimal places (e.g., 4.567)

ALTER TABLE courses_taught 
ADD COLUMN feedback_score DECIMAL(5,3) NULL COMMENT 'Student feedback score (0.000 to 99.999)' AFTER enrollment;

-- Add index for faster queries
CREATE INDEX idx_courses_feedback ON courses_taught(feedback_score);
