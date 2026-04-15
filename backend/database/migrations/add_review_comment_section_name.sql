-- Add section_name to review comments for section-wise Dofa feedback
ALTER TABLE review_comments
  ADD COLUMN IF NOT EXISTS section_name VARCHAR(255) NOT NULL DEFAULT 'General' AFTER reviewer_role;

-- Add canonical section key to unlock exact sections on send-back.
ALTER TABLE review_comments
  ADD COLUMN IF NOT EXISTS section_key VARCHAR(100) NULL AFTER section_name;

-- Track resolution lifecycle of Dofa comments when faculty re-submits.
ALTER TABLE review_comments
  ADD COLUMN IF NOT EXISTS is_resolved TINYINT(1) NOT NULL DEFAULT 0 AFTER comment;

ALTER TABLE review_comments
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP NULL AFTER is_resolved;

ALTER TABLE review_comments
  ADD COLUMN IF NOT EXISTS resolved_in_version INT NULL AFTER resolved_at;

-- Preserve older snapshots of a submission for Dofa version history.
CREATE TABLE IF NOT EXISTS submission_versions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  submission_id INT NOT NULL,
  version_number INT NOT NULL,
  snapshot_data LONGTEXT NOT NULL,
  snapshot_note VARCHAR(255) NULL,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_submission_version (submission_id, version_number),
  KEY idx_submission_versions_submission (submission_id),
  CONSTRAINT fk_submission_versions_submission FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
  CONSTRAINT fk_submission_versions_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

