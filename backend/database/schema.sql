-- Faculty Appraisal System Database Schema

CREATE DATABASE IF NOT EXISTS faculty_appraisal;
USE faculty_appraisal;

-- Faculty Information Table
CREATE TABLE IF NOT EXISTS faculty_information (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    employee_id VARCHAR(50) UNIQUE,
    department VARCHAR(100),
    designation VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(20),
    date_of_joining DATE,
    qualifications TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Courses Taught Table
CREATE TABLE IF NOT EXISTS courses_taught (
    id INT PRIMARY KEY AUTO_INCREMENT,
    faculty_id INT,
    section VARCHAR(10),
    semester VARCHAR(50),
    course_code VARCHAR(20),
    course_name VARCHAR(255),
    program VARCHAR(100),
    credits INT,
    enrollment INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (faculty_id) REFERENCES faculty_information(id) ON DELETE CASCADE
);

-- New Courses Developed Table
CREATE TABLE IF NOT EXISTS new_courses (
    id INT PRIMARY KEY AUTO_INCREMENT,
    faculty_id INT,
    level_type VARCHAR(50),
    program VARCHAR(100),
    course_name VARCHAR(255),
    course_code VARCHAR(50),
    level VARCHAR(10),
    remarks TEXT,
    cif_file VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (faculty_id) REFERENCES faculty_information(id) ON DELETE CASCADE
);

-- Research Publications Table
CREATE TABLE IF NOT EXISTS research_publications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    faculty_id INT,
    publication_type VARCHAR(50),
    sub_type VARCHAR(50),
    title VARCHAR(500),
    year_of_publication INT,
    journal_name VARCHAR(255),
    conference_name VARCHAR(255),
    abbreviation VARCHAR(100),
    volume VARCHAR(50),
    number VARCHAR(50),
    pages_from VARCHAR(20),
    pages_to VARCHAR(20),
    date_from DATE,
    date_to DATE,
    type_of_conference VARCHAR(50),
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    publication_agency VARCHAR(255),
    title_of_book VARCHAR(255),
    publication_id VARCHAR(100),
    details TEXT,
    evidence_file VARCHAR(255) COMMENT 'Path to uploaded evidence file',
    status ENUM('draft', 'submitted') DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (faculty_id) REFERENCES faculty_information(id) ON DELETE CASCADE
);

-- Authors Table (for publications, patents, etc.)
CREATE TABLE IF NOT EXISTS authors (
    id INT PRIMARY KEY AUTO_INCREMENT,
    publication_id INT NULL,
    patent_id INT NULL,
    first_name VARCHAR(100),
    middle_name VARCHAR(100),
    last_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Editors Table (for book chapters)
CREATE TABLE IF NOT EXISTS editors (
    id INT PRIMARY KEY AUTO_INCREMENT,
    publication_id INT,
    first_name VARCHAR(100),
    middle_name VARCHAR(100),
    last_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (publication_id) REFERENCES research_publications(id) ON DELETE CASCADE
);

-- Research Grants Table
CREATE TABLE IF NOT EXISTS research_grants (
    id INT PRIMARY KEY AUTO_INCREMENT,
    faculty_id INT,
    grant_type VARCHAR(50),
    project_name VARCHAR(500),
    funding_agency VARCHAR(255),
    currency VARCHAR(10),
    grant_amount DECIMAL(15,2),
    amount_in_lakhs DECIMAL(10,2),
    duration VARCHAR(100),
    researchers VARCHAR(255),
    role VARCHAR(50),
    evidence_file VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (faculty_id) REFERENCES faculty_information(id) ON DELETE CASCADE
);

-- Submitted Proposals Table
CREATE TABLE IF NOT EXISTS submitted_proposals (
    id INT PRIMARY KEY AUTO_INCREMENT,
    faculty_id INT,
    title VARCHAR(500),
    funding_agency VARCHAR(255),
    currency VARCHAR(10),
    grant_amount DECIMAL(15,2),
    amount_in_lakhs DECIMAL(10,2),
    duration VARCHAR(100),
    submission_date DATE,
    status VARCHAR(100),
    role VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (faculty_id) REFERENCES faculty_information(id) ON DELETE CASCADE
);

-- Patents Table
CREATE TABLE IF NOT EXISTS patents (
    id INT PRIMARY KEY AUTO_INCREMENT,
    faculty_id INT,
    patent_type VARCHAR(50),
    title VARCHAR(500),
    agency VARCHAR(255),
    month DATE,
    certificate_file VARCHAR(255),
    publication_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (faculty_id) REFERENCES faculty_information(id) ON DELETE CASCADE
);

-- Paper Reviews Table
CREATE TABLE IF NOT EXISTS paper_reviews (
    id INT PRIMARY KEY AUTO_INCREMENT,
    faculty_id INT,
    review_type VARCHAR(50),
    journal_name VARCHAR(255),
    abbreviation VARCHAR(100),
    number_of_papers INT,
    first_name VARCHAR(100),
    middle_name VARCHAR(100),
    last_name VARCHAR(100),
    month_of_review DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (faculty_id) REFERENCES faculty_information(id) ON DELETE CASCADE
);

-- Technology Transfer Table
CREATE TABLE IF NOT EXISTS technology_transfer (
    id INT PRIMARY KEY AUTO_INCREMENT,
    faculty_id INT,
    title VARCHAR(500),
    description TEXT,
    agency VARCHAR(255),
    date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (faculty_id) REFERENCES faculty_information(id) ON DELETE CASCADE
);

-- Conference Sessions Table
CREATE TABLE IF NOT EXISTS conference_sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    faculty_id INT,
    conference_name VARCHAR(255),
    session_title VARCHAR(255),
    date DATE,
    location VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (faculty_id) REFERENCES faculty_information(id) ON DELETE CASCADE
);

-- Keynotes and Talks Table
CREATE TABLE IF NOT EXISTS keynotes_talks (
    id INT PRIMARY KEY AUTO_INCREMENT,
    faculty_id INT,
    title VARCHAR(500),
    event_name VARCHAR(255),
    date DATE,
    location VARCHAR(255),
    audience_type VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (faculty_id) REFERENCES faculty_information(id) ON DELETE CASCADE
);

-- Awards and Honours Table
CREATE TABLE IF NOT EXISTS awards_honours (
    id INT PRIMARY KEY AUTO_INCREMENT,
    faculty_id INT,
    award_name VARCHAR(255),
    awarding_agency VARCHAR(255),
    year INT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (faculty_id) REFERENCES faculty_information(id) ON DELETE CASCADE
);

-- Consultancy Table
CREATE TABLE IF NOT EXISTS consultancy (
    id INT PRIMARY KEY AUTO_INCREMENT,
    faculty_id INT,
    organization VARCHAR(255),
    project_title VARCHAR(500),
    amount DECIMAL(15,2),
    duration VARCHAR(100),
    year INT,
    evidence_file VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (faculty_id) REFERENCES faculty_information(id) ON DELETE CASCADE
);

-- Teaching Innovation Table
CREATE TABLE IF NOT EXISTS teaching_innovation (
    id INT PRIMARY KEY AUTO_INCREMENT,
    faculty_id INT,
    title VARCHAR(255),
    description TEXT,
    implementation_date DATE,
    impact TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (faculty_id) REFERENCES faculty_information(id) ON DELETE CASCADE
);

-- Institutional Contributions Table
CREATE TABLE IF NOT EXISTS institutional_contributions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    faculty_id INT,
    contribution_type VARCHAR(100),
    title VARCHAR(255),
    description TEXT,
    year INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (faculty_id) REFERENCES faculty_information(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX idx_faculty_email ON faculty_information(email);
CREATE INDEX idx_courses_faculty ON courses_taught(faculty_id);
CREATE INDEX idx_publications_faculty ON research_publications(faculty_id);
CREATE INDEX idx_grants_faculty ON research_grants(faculty_id);
CREATE INDEX idx_patents_faculty ON patents(faculty_id);

-- Rubrics Table
CREATE TABLE IF NOT EXISTS dofa_rubrics (
    id INT PRIMARY KEY AUTO_INCREMENT,
    section_name VARCHAR(255) NOT NULL,
    sub_section VARCHAR(1000),
    max_marks DECIMAL(10, 2),
    weightage DECIMAL(10, 2) DEFAULT NULL,
    academic_year VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
