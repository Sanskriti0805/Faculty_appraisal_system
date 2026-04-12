-- Add the missing evidence_file column to paper_reviews.
-- This matches the upload support used by the paper review form.

ALTER TABLE paper_reviews
ADD COLUMN evidence_file VARCHAR(255) NULL AFTER month_of_review;