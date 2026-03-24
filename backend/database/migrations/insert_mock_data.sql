-- Insert mock data for testing the role-based workflow system

-- Insert mock users
INSERT INTO users (name, email, password, role, department, designation) VALUES
('Dr. John Smith', 'john.smith@university.edu', 'password123', 'faculty', 'Computer Science', 'Associate Professor'),
('Dr. Jane Doe', 'jane.doe@university.edu', 'password123', 'faculty', 'Electrical Engineering', 'Assistant Professor'),
('Dr. Robert Brown', 'robert.brown@university.edu', 'password123', 'faculty', 'Mechanical Engineering', 'Professor'),
('DOFA Admin', 'dofa@university.edu', 'password123', 'dofa', 'Administration', 'Dean of Faculty Affairs'),
('DOFA Office Admin', 'dofa.office@university.edu', 'password123', 'dofa_office', 'Administration', 'Office Administrator');

-- Create an active appraisal session
INSERT INTO appraisal_sessions (academic_year, start_date, end_date, status, created_by) VALUES
('2025-26', '2026-01-01', '2026-06-30', 'open', 4);

-- Create sample submissions with different statuses
INSERT INTO submissions (faculty_id, academic_year, form_type, status, submitted_at, locked) VALUES
(1, '2025-26', 'A', 'submitted', '2026-03-05 10:30:00', 0),
(2, '2025-26', 'A', 'under_review', '2026-03-01 14:20:00', 0),
(3, '2025-26', 'A', 'approved', '2026-02-25 09:15:00', 1);

-- Update approved submission with approver
UPDATE submissions SET approved_by = 4, approved_at = '2026-03-08 16:45:00' WHERE id = 3;

-- Add some review comments
INSERT INTO review_comments (submission_id, reviewer_id, reviewer_role, comment) VALUES
(2, 4, 'dofa', 'Please provide more details about your research publications.'),
(3, 4, 'dofa', 'Excellent work. All requirements met.');

-- Add submission locks
INSERT INTO submission_locks (submission_id, locked_by, is_locked) VALUES
(3, 5, 1);
