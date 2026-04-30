const db = require('../config/database');

async function bootstrapDatabaseTables() {
  try {
    // 1. Core authentication and workflow tables
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255),
        role ENUM('admin', 'faculty', 'hod', 'Dofa', 'Dofa_office') DEFAULT 'faculty',
        department VARCHAR(100),
        designation VARCHAR(100),
        salutation VARCHAR(20),
        employee_id VARCHAR(50),
        employment_type VARCHAR(50),
        date_of_joining DATE,
        password_reset_token VARCHAR(255),
        password_reset_expires DATETIME,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);

    // 2. Submissions table
    await db.query(`
      CREATE TABLE IF NOT EXISTS submissions (
        id INT PRIMARY KEY AUTO_INCREMENT,
        faculty_id INT NOT NULL,
        academic_year VARCHAR(20) NOT NULL,
        form_type VARCHAR(20) DEFAULT 'A',
        status ENUM('draft', 'submitted', 'submitted_hod', 'under_review', 'under_review_hod', 'hod_approved', 'approved', 'sent_back') DEFAULT 'draft',
        submitted_at TIMESTAMP NULL,
        approved_by INT,
        approved_at TIMESTAMP NULL,
        locked BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (faculty_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);

    // 3. Evaluation Sheet 1 (primary evaluation)
    await db.query(`
      CREATE TABLE IF NOT EXISTS Dofa_evaluation_sheet1 (
        id INT PRIMARY KEY AUTO_INCREMENT,
        submission_id INT NOT NULL,
        faculty_id INT NOT NULL,
        academic_year VARCHAR(20),
        evaluator_id INT,
        comments TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
        FOREIGN KEY (faculty_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (evaluator_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);

    // 4. Evaluation Sheet 2 (performance)
    await db.query(`
      CREATE TABLE IF NOT EXISTS Dofa_evaluation_sheet2 (
        id INT PRIMARY KEY AUTO_INCREMENT,
        submission_id INT NOT NULL,
        faculty_id INT NOT NULL,
        academic_year VARCHAR(20),
        final_grade VARCHAR(10),
        evaluator_id INT,
        comments TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_sheet2_submission (submission_id),
        FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
        FOREIGN KEY (faculty_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (evaluator_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);

    // 5. Evaluation Sheet 3 (increment and benefits)
    await db.query(`
      CREATE TABLE IF NOT EXISTS Dofa_evaluation_sheet3 (
        id INT PRIMARY KEY AUTO_INCREMENT,
        submission_id INT NOT NULL,
        faculty_id INT NOT NULL,
        academic_year VARCHAR(20),
        increment_percentage DECIMAL(5,2),
        evaluator_id INT,
        comments TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_sheet3_submission (submission_id),
        FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
        FOREIGN KEY (faculty_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (evaluator_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);

    // 6. Evaluation scores table
    await db.query(`
      CREATE TABLE IF NOT EXISTS Dofa_evaluation_scores (
        id INT PRIMARY KEY AUTO_INCREMENT,
        submission_id INT NOT NULL,
        rubric_id INT,
        score DECIMAL(10,2),
        evaluator_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_eval_score_submission_rubric (submission_id, rubric_id),
        FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
        FOREIGN KEY (evaluator_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);

    // 6a. Evaluation remarks table (used by Sheet 1 data API)
    await db.query(`
      CREATE TABLE IF NOT EXISTS Dofa_evaluation_remarks (
        id INT PRIMARY KEY AUTO_INCREMENT,
        submission_id INT NOT NULL,
        remark TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_eval_remarks_submission (submission_id),
        FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);

    // 6b. Grading parameters table (used by Sheet 2 grading logic)
    await db.query(`
      CREATE TABLE IF NOT EXISTS Dofa_grading_parameters (
        id INT PRIMARY KEY AUTO_INCREMENT,
        condition_op ENUM('>', '<', '>=', '<=', '=') NOT NULL,
        threshold_value DECIMAL(10,2) NOT NULL,
        grade VARCHAR(20) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);

    // 7. Grade increments table
    await db.query(`
      CREATE TABLE IF NOT EXISTS Dofa_grade_increments (
        id INT PRIMARY KEY AUTO_INCREMENT,
        grade VARCHAR(10),
        increment_percentage DECIMAL(5,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);

    // 7. Dynamic form tables
    await db.query(`
      CREATE TABLE IF NOT EXISTS dynamic_sections (
        id INT NOT NULL AUTO_INCREMENT,
        title VARCHAR(255) NOT NULL,
        form_type ENUM('A', 'B') DEFAULT 'A',
        sequence INT DEFAULT 0,
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS dynamic_fields (
        id INT NOT NULL AUTO_INCREMENT,
        section_id INT NOT NULL,
        field_type ENUM('text', 'number', 'textarea', 'table', 'comment') NOT NULL,
        label VARCHAR(255) NOT NULL,
        config JSON DEFAULT NULL,
        sequence INT DEFAULT 0,
        is_required TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        FOREIGN KEY (section_id) REFERENCES dynamic_sections (id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS dynamic_responses (
        id INT NOT NULL AUTO_INCREMENT,
        faculty_id INT NOT NULL,
        session_id VARCHAR(20) NOT NULL,
        field_id INT NOT NULL,
        submission_id INT DEFAULT NULL,
        value JSON DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY unique_resp_session (faculty_id, session_id, field_id, submission_id),
        FOREIGN KEY (faculty_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (field_id) REFERENCES dynamic_fields (id) ON DELETE CASCADE,
        FOREIGN KEY (submission_id) REFERENCES submissions (id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);

    // 8. Appraisal sessions
    await db.query(`
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);

    // 9. Review comments
    await db.query(`
      CREATE TABLE IF NOT EXISTS review_comments (
        id INT PRIMARY KEY AUTO_INCREMENT,
        submission_id INT NOT NULL,
        reviewer_id INT,
        reviewer_role ENUM('Dofa', 'Dofa_office'),
        section_name VARCHAR(255) NOT NULL DEFAULT 'General',
        section_key VARCHAR(100) NULL,
        comment TEXT NOT NULL,
        is_resolved TINYINT(1) NOT NULL DEFAULT 0,
        resolved_at TIMESTAMP NULL,
        resolved_in_version INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
        FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);

    await db.query(`
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);

    // 10. Submission locks
    await db.query(`
      CREATE TABLE IF NOT EXISTS submission_locks (
        id INT PRIMARY KEY AUTO_INCREMENT,
        submission_id INT NOT NULL,
        locked_by INT,
        locked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        unlocked_at TIMESTAMP NULL,
        is_locked BOOLEAN DEFAULT TRUE,
        FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
        FOREIGN KEY (locked_by) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);

    // 11. Faculty goals (Part B)
    await db.query(`
      CREATE TABLE IF NOT EXISTS faculty_goals (
        id INT PRIMARY KEY AUTO_INCREMENT,
        faculty_id INT NOT NULL,
        session_id VARCHAR(20) NOT NULL,
        submission_id INT DEFAULT NULL,
        semester VARCHAR(50),
        teaching DECIMAL(5,2) DEFAULT 0,
        research DECIMAL(5,2) DEFAULT 0,
        contribution DECIMAL(5,2) DEFAULT 0,
        outreach DECIMAL(5,2) DEFAULT 0,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (faculty_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);

    // 12. Legacy section JSON storage (for sections without dedicated relational tables)
    await db.query(`
      CREATE TABLE IF NOT EXISTS legacy_section_entries (
        id INT PRIMARY KEY AUTO_INCREMENT,
        faculty_id INT NOT NULL,
        academic_year VARCHAR(20) NOT NULL,
        session_id VARCHAR(20) NOT NULL,
        section_key VARCHAR(100) NOT NULL,
        content_json JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_legacy_section_session (faculty_id, session_id, section_key),
        FOREIGN KEY (faculty_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);

    // 13. Publication child tables used by the research publications and patents modules
    await db.query(`
      CREATE TABLE IF NOT EXISTS authors (
        id INT PRIMARY KEY AUTO_INCREMENT,
        publication_id INT DEFAULT NULL,
        patent_id INT DEFAULT NULL,
        first_name VARCHAR(100),
        middle_name VARCHAR(100),
        last_name VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS editors (
        id INT PRIMARY KEY AUTO_INCREMENT,
        publication_id INT DEFAULT NULL,
        first_name VARCHAR(100),
        middle_name VARCHAR(100),
        last_name VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);

    // Create useful indexes (safely skip if already exist)
    const indexQueries = [
      `CREATE INDEX idx_users_email ON users(email)`,
      `CREATE INDEX idx_submissions_faculty ON submissions(faculty_id)`,
      `CREATE INDEX idx_submissions_status ON submissions(status)`,
      `CREATE INDEX idx_submissions_year ON submissions(academic_year)`,
      `CREATE INDEX idx_eval_submission ON Dofa_evaluation_sheet1(submission_id)`,
      `CREATE INDEX idx_eval2_submission ON Dofa_evaluation_sheet2(submission_id)`,
      `CREATE INDEX idx_eval3_submission ON Dofa_evaluation_sheet3(submission_id)`
    ];
    for (const indexQuery of indexQueries) {
      try {
        await db.query(indexQuery);
      } catch (err) {
        // Silently ignore if index already exists
        if (!err.message.includes('Duplicate key name')) {
          console.warn('Index creation note:', err.message);
        }
      }
    }
  } catch (error) {
    console.error('[ERROR] Database bootstrap error:', error.message);
    throw error;
  }
}

// Keep old export for backwards compatibility
async function bootstrapDynamicFormTables() {
  return bootstrapDatabaseTables();
}

module.exports = { bootstrapDynamicFormTables, bootstrapDatabaseTables };

