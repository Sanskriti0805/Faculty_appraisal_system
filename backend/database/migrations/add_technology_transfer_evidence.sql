-- Add evidence file column to technology_transfer table
-- This allows uploading supporting documents for technology transfer records

-- Note: Check if technology_transfer table exists, if not this will need to be created
-- For now, creating the table with evidence support

CREATE TABLE IF NOT EXISTS technology_transfer (
    id INT PRIMARY KEY AUTO_INCREMENT,
    faculty_id INT,
    technology_name VARCHAR(255),
    description TEXT,
    transfer_date DATE,
    recipient_organization VARCHAR(255),
    evidence_file VARCHAR(255) NULL COMMENT 'Path to uploaded evidence file',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (faculty_id) REFERENCES faculty_information(id) ON DELETE CASCADE
);

