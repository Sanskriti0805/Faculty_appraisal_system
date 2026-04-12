-- Add the missing tier column to paper_reviews.
-- This matches the controller insert used by the paper review form.

ALTER TABLE paper_reviews
ADD COLUMN tier VARCHAR(50) NULL AFTER review_type;
