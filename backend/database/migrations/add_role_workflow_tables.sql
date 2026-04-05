-- Add role-based workflow tables for DOFA system

-- Users table for authentication and role management
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255),
    role ENUM('faculty', 'dofa', 'dofa_office') DEFAULT 'faculty',
    department VARCHAR(100),
    designation VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Appraisal sessions for timeline control
CREATE TABLE IF NOT EXISTS appraisal_sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    academic_year VARCHAR(20) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status ENUM('open', 'closed') DEFAULT 'closed',
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Submissions tracking for faculty appraisal workflow
CREATE TABLE IF NOT EXISTS submissions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    faculty_id INT NOT NULL,
    academic_year VARCHAR(20) NOT NULL,
    status ENUM('draft', 'submitted', 'under_review', 'approved', 'sent_back') DEFAULT 'draft',
    submitted_at TIMESTAMP NULL,
    approved_by INT,
    approved_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (faculty_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Review comments for DOFA feedback
CREATE TABLE IF NOT EXISTS review_comments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    submission_id INT NOT NULL,
    reviewer_id INT,
    reviewer_role ENUM('dofa', 'dofa_office'),
    section_name VARCHAR(255) NOT NULL DEFAULT 'General',
    section_key VARCHAR(100) NULL,
    comment TEXT NOT NULL,
    is_resolved TINYINT(1) NOT NULL DEFAULT 0,
    resolved_at TIMESTAMP NULL,
    resolved_in_version INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Submission versions for snapshot history across re-submissions
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
    FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Submission locks for DOFA office
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

-- Create indexes for better query performance
CREATE INDEX idx_users_email_workflow ON users(email);
CREATE INDEX idx_users_role_workflow ON users(role);
CREATE INDEX idx_submissions_faculty_workflow ON submissions(faculty_id);
CREATE INDEX idx_submissions_status_workflow ON submissions(status);
CREATE INDEX idx_submissions_year_workflow ON submissions(academic_year);
CREATE INDEX idx_review_comments_submission_workflow ON review_comments(submission_id);
CREATE INDEX idx_review_comments_resolved_workflow ON review_comments(is_resolved);
CREATE INDEX idx_appraisal_sessions_status_workflow ON appraisal_sessions(status);
