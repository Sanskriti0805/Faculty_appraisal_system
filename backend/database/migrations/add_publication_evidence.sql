-- Add evidence file upload capability to research publications
-- This allows uploading supporting documents for each publication

ALTER TABLE research_publications 
ADD COLUMN evidence_file VARCHAR(255) NULL COMMENT 'Path to uploaded evidence file' AFTER details;

-- Add index for faster queries
CREATE INDEX idx_publications_evidence ON research_publications(evidence_file);
