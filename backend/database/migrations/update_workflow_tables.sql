-- Update existing tables for role-based workflow

-- Add department and designation to users table if not exists
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS department VARCHAR(100),
ADD COLUMN IF NOT EXISTS designation VARCHAR(100);

-- Add academic_year to submissions if not exists
ALTER TABLE submissions 
ADD COLUMN IF NOT EXISTS academic_year VARCHAR(20) DEFAULT '2025-26',
ADD COLUMN IF NOT EXISTS approved_by INT,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP NULL;

-- Add foreign key for approved_by if not exists
-- Note: This will fail silently if FK already exists
ALTER TABLE submissions 
ADD CONSTRAINT fk_submissions_approved_by 
FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL;

-- Create submission_locks table if not exists
CREATE TABLE IF NOT EXISTS submission_locks (
    id INT PRIMARY KEY AUTO_INCREMENT,
    submission_id INT NOT NULL,
    locked_by INT,
    locked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    unlocked_at TIMESTAMP NULL,
    is_locked BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
    FOREIGN KEY (locked_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Add indexes if they don't exist
CREATE INDEX idx_submissions_year_v2 ON submissions(academic_year);
