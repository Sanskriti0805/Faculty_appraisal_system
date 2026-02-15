-- Add status column to support draft/submit workflow
-- Run this migration to add status tracking to all tables

-- Faculty Information
ALTER TABLE faculty_information 
ADD COLUMN status ENUM('draft', 'submitted', 'approved', 'rejected') DEFAULT 'draft' AFTER qualifications,
ADD COLUMN submitted_at TIMESTAMP NULL AFTER updated_at,
ADD COLUMN approved_at TIMESTAMP NULL AFTER submitted_at;

-- Courses Taught
ALTER TABLE courses_taught 
ADD COLUMN status ENUM('draft', 'submitted') DEFAULT 'draft' AFTER enrollment;

-- New Courses
ALTER TABLE new_courses 
ADD COLUMN status ENUM('draft', 'submitted') DEFAULT 'draft' AFTER cif_file;

-- Research Publications
ALTER TABLE research_publications 
ADD COLUMN status ENUM('draft', 'submitted') DEFAULT 'draft' AFTER details;

-- Research Grants
ALTER TABLE research_grants 
ADD COLUMN status ENUM('draft', 'submitted') DEFAULT 'draft' AFTER evidence_file;

-- Submitted Proposals
ALTER TABLE submitted_proposals 
ADD COLUMN submission_status ENUM('draft', 'submitted') DEFAULT 'draft' AFTER role;

-- Patents
ALTER TABLE patents 
ADD COLUMN status ENUM('draft', 'submitted') DEFAULT 'draft' AFTER publication_id;

-- Paper Reviews
ALTER TABLE paper_reviews 
ADD COLUMN status ENUM('draft', 'submitted') DEFAULT 'draft' AFTER month_of_review;

-- Add indexes for status columns
CREATE INDEX idx_faculty_status ON faculty_information(status);
CREATE INDEX idx_courses_status ON courses_taught(status);
CREATE INDEX idx_new_courses_status ON new_courses(status);
CREATE INDEX idx_publications_status ON research_publications(status);
CREATE INDEX idx_grants_status ON research_grants(status);
CREATE INDEX idx_patents_status ON patents(status);
CREATE INDEX idx_reviews_status ON paper_reviews(status);
