-- Update Awards and Honours table schema to support new structured format

-- Drop old table if exists and recreate with new schema
DROP TABLE IF EXISTS awards_honours;

CREATE TABLE awards_honours (
    id INT PRIMARY KEY AUTO_INCREMENT,
    faculty_id INT NOT NULL,
    honor_type ENUM('National', 'International') NOT NULL,
    award_name VARCHAR(500) NOT NULL,
    description TEXT,
    evidence_file VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (faculty_id) REFERENCES faculty_information(id) ON DELETE CASCADE
);

-- Create index for performance
CREATE INDEX idx_awards_faculty ON awards_honours(faculty_id);
