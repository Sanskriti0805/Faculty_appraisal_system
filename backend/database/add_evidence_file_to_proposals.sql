-- Add evidence_file column to submitted_proposals table
ALTER TABLE submitted_proposals 
ADD COLUMN evidence_file VARCHAR(255) NULL 
AFTER role;
