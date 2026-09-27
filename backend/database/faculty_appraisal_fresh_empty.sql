-- Faculty appraisal: FRESH EMPTY DATABASE RESET
-- Generated 2026-09-28 from the current local database structure.
-- DESTRUCTIVE: erases the application tables listed below, including users.
-- Back up the target database and uploads, and stop the backend first.
-- Select the college database configured as DB_NAME before running this file.
-- No database name is hardcoded. No row data, passwords, accounts, or sessions are included.
-- MySQL 8.0+ required; source server: 8.4.6
-- All 45 tables start empty. AUTO_INCREMENT counters restart.
-- Unknown extra tables in the target database are not removed.
-- Files in backend/uploads are separate and are not erased by this SQL.
-- Recreate the administrator, departments, rubric configuration, and an appraisal session after import.
-- Dofa table spelling matches application queries on case-sensitive servers.
-- The stale submissions.academic_year default has been cleared to NULL.

SELECT DATABASE() AS database_being_reset;
SET @fresh_old_fk_checks = @@FOREIGN_KEY_CHECKS;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `appraisal_sessions`;
DROP TABLE IF EXISTS `audit_logs`;
DROP TABLE IF EXISTS `authors`;
DROP TABLE IF EXISTS `awards_honours`;
DROP TABLE IF EXISTS `conference_sessions`;
DROP TABLE IF EXISTS `consultancy`;
DROP TABLE IF EXISTS `courses_taught`;
DROP TABLE IF EXISTS `departments`;
DROP TABLE IF EXISTS `dofa_evaluation_remarks`;
DROP TABLE IF EXISTS `Dofa_evaluation_remarks`;
DROP TABLE IF EXISTS `dofa_evaluation_scores`;
DROP TABLE IF EXISTS `Dofa_evaluation_scores`;
DROP TABLE IF EXISTS `dofa_evaluation_sheet1`;
DROP TABLE IF EXISTS `Dofa_evaluation_sheet1`;
DROP TABLE IF EXISTS `dofa_evaluation_sheet2`;
DROP TABLE IF EXISTS `Dofa_evaluation_sheet2`;
DROP TABLE IF EXISTS `dofa_evaluation_sheet3`;
DROP TABLE IF EXISTS `Dofa_evaluation_sheet3`;
DROP TABLE IF EXISTS `dofa_grade_increments`;
DROP TABLE IF EXISTS `Dofa_grade_increments`;
DROP TABLE IF EXISTS `dofa_grading_parameters`;
DROP TABLE IF EXISTS `Dofa_grading_parameters`;
DROP TABLE IF EXISTS `dofa_rubrics`;
DROP TABLE IF EXISTS `Dofa_rubrics`;
DROP TABLE IF EXISTS `dofa_section_scores`;
DROP TABLE IF EXISTS `dynamic_fields`;
DROP TABLE IF EXISTS `dynamic_responses`;
DROP TABLE IF EXISTS `dynamic_sections`;
DROP TABLE IF EXISTS `edit_requests`;
DROP TABLE IF EXISTS `editors`;
DROP TABLE IF EXISTS `faculty_goals`;
DROP TABLE IF EXISTS `faculty_information`;
DROP TABLE IF EXISTS `form_fields`;
DROP TABLE IF EXISTS `institutional_contributions`;
DROP TABLE IF EXISTS `keynotes_talks`;
DROP TABLE IF EXISTS `legacy_section_entries`;
DROP TABLE IF EXISTS `new_courses`;
DROP TABLE IF EXISTS `paper_reviews`;
DROP TABLE IF EXISTS `patents`;
DROP TABLE IF EXISTS `research_grants`;
DROP TABLE IF EXISTS `research_publications`;
DROP TABLE IF EXISTS `review_comments`;
DROP TABLE IF EXISTS `rubrics`;
DROP TABLE IF EXISTS `settings`;
DROP TABLE IF EXISTS `submission_locks`;
DROP TABLE IF EXISTS `submission_scores`;
DROP TABLE IF EXISTS `submission_versions`;
DROP TABLE IF EXISTS `submissions`;
DROP TABLE IF EXISTS `submitted_proposals`;
DROP TABLE IF EXISTS `system_settings`;
DROP TABLE IF EXISTS `teaching_innovation`;
DROP TABLE IF EXISTS `technology_transfer`;
DROP TABLE IF EXISTS `users`;

CREATE TABLE `appraisal_sessions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `academic_year` varchar(20) NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `status` enum('open','closed') DEFAULT 'closed',
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `release_date` datetime DEFAULT NULL,
  `deadline` date DEFAULT NULL,
  `is_released` tinyint(1) DEFAULT '0',
  `scheduled_release` datetime DEFAULT NULL,
  `reminder_sent` tinyint(1) DEFAULT '0',
  `release_email_sent` tinyint(1) DEFAULT '0',
  `reminder_days` int DEFAULT '2',
  `reminder_time` varchar(10) DEFAULT '08:00:00',
  `final_locked` tinyint(1) NOT NULL DEFAULT '0',
  `final_locked_at` timestamp NULL DEFAULT NULL,
  `final_locked_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `appraisal_sessions_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `audit_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL COMMENT 'User who performed the action',
  `action` enum('CREATE','UPDATE','DELETE') NOT NULL COMMENT 'Type of action performed',
  `table_name` varchar(100) NOT NULL COMMENT 'Which table was affected',
  `record_id` int NOT NULL COMMENT 'ID of the affected record',
  `changes` json DEFAULT NULL COMMENT 'Before and after values of changes',
  `ip_address` varchar(45) DEFAULT NULL COMMENT 'IP address of user',
  `user_agent` varchar(500) DEFAULT NULL COMMENT 'Browser/device information',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_table_name` (`table_name`),
  KEY `idx_record_id` (`record_id`),
  KEY `idx_action` (`action`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `audit_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Audit trail for all CRUD operations';

CREATE TABLE `authors` (
  `id` int NOT NULL AUTO_INCREMENT,
  `publication_id` int DEFAULT NULL,
  `patent_id` int DEFAULT NULL,
  `first_name` varchar(100) DEFAULT NULL,
  `middle_name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `awards_honours` (
  `id` int NOT NULL AUTO_INCREMENT,
  `faculty_id` int NOT NULL,
  `session_id` varchar(20) DEFAULT NULL,
  `honor_type` enum('National','International') NOT NULL,
  `award_name` varchar(500) NOT NULL,
  `description` text,
  `evidence_file` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_awards_faculty` (`faculty_id`),
  KEY `idx_awards_honours_faculty_session` (`faculty_id`,`session_id`),
  CONSTRAINT `awards_honours_ibfk_1` FOREIGN KEY (`faculty_id`) REFERENCES `faculty_information` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `conference_sessions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `faculty_id` int DEFAULT NULL,
  `session_id` varchar(20) DEFAULT NULL,
  `conference_name` varchar(255) DEFAULT NULL,
  `session_title` varchar(255) DEFAULT NULL,
  `date` date DEFAULT NULL,
  `location` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `role` varchar(100) DEFAULT NULL,
  `evidence_file` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_conference_sessions_faculty_session` (`faculty_id`,`session_id`),
  CONSTRAINT `conference_sessions_ibfk_1` FOREIGN KEY (`faculty_id`) REFERENCES `faculty_information` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `consultancy` (
  `id` int NOT NULL AUTO_INCREMENT,
  `faculty_id` int DEFAULT NULL,
  `session_id` varchar(20) DEFAULT NULL,
  `organization` varchar(255) DEFAULT NULL,
  `project_title` varchar(500) DEFAULT NULL,
  `role` varchar(255) DEFAULT NULL,
  `amount` decimal(15,2) DEFAULT NULL,
  `duration` varchar(100) DEFAULT NULL,
  `year` int DEFAULT NULL,
  `evidence_file` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_consultancy_faculty_session` (`faculty_id`,`session_id`),
  CONSTRAINT `consultancy_ibfk_1` FOREIGN KEY (`faculty_id`) REFERENCES `faculty_information` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `courses_taught` (
  `id` int NOT NULL AUTO_INCREMENT,
  `faculty_id` int DEFAULT NULL,
  `session_id` varchar(20) DEFAULT NULL,
  `section` varchar(10) DEFAULT NULL,
  `semester` varchar(50) DEFAULT NULL,
  `course_code` varchar(20) DEFAULT NULL,
  `course_name` varchar(255) DEFAULT NULL,
  `program` varchar(100) DEFAULT NULL,
  `credits` int DEFAULT NULL,
  `enrollment` int DEFAULT NULL,
  `percentage` varchar(20) DEFAULT NULL COMMENT 'Percentage of course taught alone',
  `status` enum('draft','submitted') DEFAULT 'draft',
  `feedback_score` decimal(5,3) DEFAULT NULL COMMENT 'Student feedback score (0.000 to 99.999)',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `remarks` varchar(255) DEFAULT NULL,
  `evidence_file` varchar(255) DEFAULT NULL,
  `project_title` varchar(500) DEFAULT NULL,
  `project_type` varchar(100) DEFAULT NULL,
  `project_role` varchar(100) DEFAULT NULL,
  `student_name` varchar(255) DEFAULT NULL,
  `project_duration` varchar(100) DEFAULT NULL,
  `project_outcome` text,
  PRIMARY KEY (`id`),
  KEY `idx_courses_faculty` (`faculty_id`),
  KEY `idx_courses_feedback` (`feedback_score`),
  KEY `idx_courses_status` (`status`),
  KEY `idx_courses_taught_faculty_session` (`faculty_id`,`session_id`),
  CONSTRAINT `courses_taught_ibfk_1` FOREIGN KEY (`faculty_id`) REFERENCES `faculty_information` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `departments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `code` varchar(20) NOT NULL,
  `hod_email` varchar(255) DEFAULT NULL,
  `hod_name` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_active` tinyint(1) DEFAULT '1',
  `is_archived` tinyint(1) NOT NULL DEFAULT '0',
  `archived_at` timestamp NULL DEFAULT NULL,
  `archived_by` int DEFAULT NULL,
  `archive_reason` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `Dofa_evaluation_remarks` (
  `id` int NOT NULL AUTO_INCREMENT,
  `submission_id` int NOT NULL,
  `remark` text,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `Dofa_evaluation_scores` (
  `id` int NOT NULL AUTO_INCREMENT,
  `submission_id` int NOT NULL,
  `rubric_id` int NOT NULL,
  `score` decimal(10,2) DEFAULT '0.00',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_sub_rubric` (`submission_id`,`rubric_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `Dofa_evaluation_sheet1` (
  `id` int NOT NULL AUTO_INCREMENT,
  `submission_id` int NOT NULL,
  `faculty_id` int NOT NULL,
  `academic_year` varchar(20) DEFAULT NULL,
  `evaluator_id` int DEFAULT NULL,
  `comments` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `faculty_id` (`faculty_id`),
  KEY `evaluator_id` (`evaluator_id`),
  KEY `idx_eval_submission` (`submission_id`),
  CONSTRAINT `Dofa_evaluation_sheet1_ibfk_1` FOREIGN KEY (`submission_id`) REFERENCES `submissions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `Dofa_evaluation_sheet1_ibfk_2` FOREIGN KEY (`faculty_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `Dofa_evaluation_sheet1_ibfk_3` FOREIGN KEY (`evaluator_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `Dofa_evaluation_sheet2` (
  `id` int NOT NULL AUTO_INCREMENT,
  `submission_id` int NOT NULL,
  `research_remarks` text,
  `overall_feedback` text,
  `teaching_feedback` text,
  `final_grade` varchar(10) DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `submission_id` (`submission_id`),
  KEY `idx_eval2_submission` (`submission_id`),
  CONSTRAINT `Dofa_evaluation_sheet2_ibfk_1` FOREIGN KEY (`submission_id`) REFERENCES `submissions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `Dofa_evaluation_sheet3` (
  `id` int NOT NULL AUTO_INCREMENT,
  `submission_id` int NOT NULL,
  `increment_percentage` decimal(5,2) DEFAULT '0.00',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `submission_id` (`submission_id`),
  KEY `idx_eval3_submission` (`submission_id`),
  CONSTRAINT `Dofa_evaluation_sheet3_ibfk_1` FOREIGN KEY (`submission_id`) REFERENCES `submissions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `Dofa_grade_increments` (
  `grade` varchar(10) NOT NULL,
  `increment_percentage` decimal(5,2) NOT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`grade`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `Dofa_grading_parameters` (
  `id` int NOT NULL AUTO_INCREMENT,
  `condition_op` varchar(10) NOT NULL,
  `threshold_value` decimal(10,2) NOT NULL,
  `grade` varchar(10) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `Dofa_rubrics` (
  `id` int NOT NULL AUTO_INCREMENT,
  `section_name` varchar(255) NOT NULL,
  `sub_section` varchar(1000) DEFAULT NULL,
  `max_marks` decimal(10,2) DEFAULT NULL,
  `weightage` decimal(10,2) DEFAULT NULL,
  `academic_year` varchar(20) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `dynamic_section_id` int DEFAULT NULL,
  `scoring_type` enum('manual','count_based','text_exists','rule') NOT NULL DEFAULT 'manual',
  `per_unit_marks` decimal(5,2) DEFAULT NULL,
  `form_type` enum('A','B') DEFAULT NULL,
  `data_source` varchar(64) DEFAULT NULL,
  `rule_config` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_rubric_dynamic_section` (`dynamic_section_id`),
  CONSTRAINT `fk_rubric_dynamic_section` FOREIGN KEY (`dynamic_section_id`) REFERENCES `dynamic_sections` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `dofa_section_scores` (
  `id` int NOT NULL AUTO_INCREMENT,
  `submission_id` int NOT NULL,
  `section_name` varchar(255) NOT NULL,
  `score` decimal(10,2) DEFAULT '0.00',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_sub_section` (`submission_id`,`section_name`(200))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `dynamic_fields` (
  `id` int NOT NULL AUTO_INCREMENT,
  `section_id` int NOT NULL,
  `field_type` enum('text','number','textarea','table','comment') NOT NULL,
  `label` varchar(255) NOT NULL,
  `config` json DEFAULT NULL,
  `sequence` int DEFAULT '0',
  `is_required` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `section_id` (`section_id`),
  CONSTRAINT `dynamic_fields_ibfk_1` FOREIGN KEY (`section_id`) REFERENCES `dynamic_sections` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `dynamic_responses` (
  `id` int NOT NULL AUTO_INCREMENT,
  `faculty_id` int NOT NULL,
  `session_id` varchar(20) DEFAULT NULL,
  `field_id` int NOT NULL,
  `submission_id` int DEFAULT NULL,
  `value` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_resp_session` (`faculty_id`,`session_id`,`field_id`,`submission_id`),
  KEY `field_id` (`field_id`),
  KEY `submission_id` (`submission_id`),
  KEY `idx_dynamic_responses_faculty_session` (`faculty_id`,`session_id`),
  CONSTRAINT `dynamic_responses_ibfk_1` FOREIGN KEY (`faculty_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `dynamic_responses_ibfk_2` FOREIGN KEY (`field_id`) REFERENCES `dynamic_fields` (`id`) ON DELETE CASCADE,
  CONSTRAINT `dynamic_responses_ibfk_3` FOREIGN KEY (`submission_id`) REFERENCES `submissions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `dynamic_sections` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `form_type` enum('A','B') DEFAULT 'A',
  `sequence` int DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `parent_id` int DEFAULT NULL,
  `description` text,
  PRIMARY KEY (`id`),
  KEY `fk_section_parent` (`parent_id`),
  CONSTRAINT `fk_section_parent` FOREIGN KEY (`parent_id`) REFERENCES `dynamic_sections` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `edit_requests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `submission_id` int NOT NULL,
  `faculty_id` int NOT NULL,
  `requested_sections` json NOT NULL COMMENT 'Array of section keys requested for edit',
  `request_message` text,
  `status` enum('pending','approved','denied') DEFAULT 'pending',
  `approved_sections` json DEFAULT NULL COMMENT 'Array of section keys approved for edit',
  `reviewed_by` int DEFAULT NULL,
  `reviewed_at` timestamp NULL DEFAULT NULL,
  `Dofa_note` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `submission_id` (`submission_id`),
  KEY `faculty_id` (`faculty_id`),
  KEY `reviewed_by` (`reviewed_by`),
  CONSTRAINT `edit_requests_ibfk_1` FOREIGN KEY (`submission_id`) REFERENCES `submissions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `edit_requests_ibfk_2` FOREIGN KEY (`faculty_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `edit_requests_ibfk_3` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `editors` (
  `id` int NOT NULL AUTO_INCREMENT,
  `publication_id` int DEFAULT NULL,
  `first_name` varchar(100) DEFAULT NULL,
  `middle_name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `publication_id` (`publication_id`),
  CONSTRAINT `editors_ibfk_1` FOREIGN KEY (`publication_id`) REFERENCES `research_publications` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `faculty_goals` (
  `id` int NOT NULL AUTO_INCREMENT,
  `faculty_id` int NOT NULL,
  `session_id` varchar(20) DEFAULT NULL,
  `semester` varchar(50) DEFAULT NULL,
  `teaching` varchar(10) DEFAULT NULL,
  `research` varchar(10) DEFAULT NULL,
  `contribution` varchar(10) DEFAULT NULL,
  `outreach` varchar(10) DEFAULT NULL,
  `description` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_faculty_goals_faculty_session` (`faculty_id`,`session_id`),
  CONSTRAINT `fk_faculty_goals_user` FOREIGN KEY (`faculty_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `faculty_information` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `employee_id` varchar(50) DEFAULT NULL,
  `department` varchar(100) DEFAULT NULL,
  `designation` varchar(100) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `date_of_joining` date DEFAULT NULL,
  `qualifications` text,
  `status` enum('draft','submitted','approved','rejected') DEFAULT 'draft',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `submitted_at` timestamp NULL DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `employee_id` (`employee_id`),
  KEY `idx_faculty_email` (`email`),
  KEY `idx_faculty_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `form_fields` (
  `id` int NOT NULL AUTO_INCREMENT,
  `form_type` enum('A','B') NOT NULL COMMENT 'Which form this field belongs to',
  `field_label` varchar(255) NOT NULL COMMENT 'Display label for the field',
  `field_name` varchar(100) NOT NULL COMMENT 'Technical field name (generated from label)',
  `field_type` enum('text','number','select','textarea','date','email') NOT NULL DEFAULT 'text',
  `required` tinyint(1) DEFAULT '0' COMMENT 'Is this field mandatory',
  `options` json DEFAULT NULL COMMENT 'Options for select fields (array of strings)',
  `order_index` int NOT NULL DEFAULT '0' COMMENT 'Display order in form',
  `is_deleted` tinyint(1) DEFAULT '0' COMMENT 'Soft delete flag',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_field_per_form` (`form_type`,`field_name`),
  KEY `idx_form_type` (`form_type`),
  KEY `idx_is_deleted` (`is_deleted`),
  KEY `idx_order` (`order_index`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Dynamic form field definitions for Forms A and B';

CREATE TABLE `institutional_contributions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `faculty_id` int DEFAULT NULL,
  `session_id` varchar(20) DEFAULT NULL,
  `contribution_type` varchar(255) DEFAULT NULL,
  `title` varchar(255) DEFAULT NULL,
  `description` text,
  `year` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `evidence_file` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_institutional_contributions_faculty_session` (`faculty_id`,`session_id`),
  CONSTRAINT `institutional_contributions_ibfk_1` FOREIGN KEY (`faculty_id`) REFERENCES `faculty_information` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `keynotes_talks` (
  `id` int NOT NULL AUTO_INCREMENT,
  `faculty_id` int DEFAULT NULL,
  `session_id` varchar(20) DEFAULT NULL,
  `title` varchar(500) DEFAULT NULL,
  `event_name` varchar(255) DEFAULT NULL,
  `date` date DEFAULT NULL,
  `location` varchar(255) DEFAULT NULL,
  `audience_type` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `event_type` varchar(100) DEFAULT NULL,
  `evidence_file` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_keynotes_talks_faculty_session` (`faculty_id`,`session_id`),
  CONSTRAINT `keynotes_talks_ibfk_1` FOREIGN KEY (`faculty_id`) REFERENCES `faculty_information` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `legacy_section_entries` (
  `id` int NOT NULL AUTO_INCREMENT,
  `faculty_id` int NOT NULL,
  `academic_year` varchar(20) NOT NULL,
  `session_id` varchar(20) DEFAULT NULL,
  `section_key` varchar(100) NOT NULL,
  `content_json` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_legacy_section_session` (`faculty_id`,`session_id`,`section_key`),
  KEY `idx_legacy_section_faculty_session` (`faculty_id`,`session_id`),
  CONSTRAINT `legacy_section_entries_ibfk_1` FOREIGN KEY (`faculty_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `new_courses` (
  `id` int NOT NULL AUTO_INCREMENT,
  `faculty_id` int DEFAULT NULL,
  `session_id` varchar(20) DEFAULT NULL,
  `level_type` varchar(50) DEFAULT NULL,
  `program` varchar(100) DEFAULT NULL,
  `course_name` varchar(255) DEFAULT NULL,
  `course_code` varchar(50) DEFAULT NULL,
  `level` varchar(10) DEFAULT NULL,
  `remarks` text,
  `cif_file` varchar(255) DEFAULT NULL,
  `status` enum('draft','submitted') DEFAULT 'draft',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_new_courses_status` (`status`),
  KEY `idx_new_courses_faculty_session` (`faculty_id`,`session_id`),
  CONSTRAINT `new_courses_ibfk_1` FOREIGN KEY (`faculty_id`) REFERENCES `faculty_information` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `paper_reviews` (
  `id` int NOT NULL AUTO_INCREMENT,
  `faculty_id` int DEFAULT NULL,
  `session_id` varchar(20) DEFAULT NULL,
  `review_type` varchar(50) DEFAULT NULL,
  `journal_name` varchar(255) DEFAULT NULL,
  `abbreviation` varchar(100) DEFAULT NULL,
  `number_of_papers` int DEFAULT NULL,
  `first_name` varchar(100) DEFAULT NULL,
  `middle_name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) DEFAULT NULL,
  `month_of_review` date DEFAULT NULL,
  `status` enum('draft','submitted') DEFAULT 'draft',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `tier` varchar(50) DEFAULT NULL,
  `evidence_file` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_reviews_status` (`status`),
  KEY `idx_paper_reviews_faculty_session` (`faculty_id`,`session_id`),
  CONSTRAINT `paper_reviews_ibfk_1` FOREIGN KEY (`faculty_id`) REFERENCES `faculty_information` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `patents` (
  `id` int NOT NULL AUTO_INCREMENT,
  `faculty_id` int DEFAULT NULL,
  `session_id` varchar(20) DEFAULT NULL,
  `patent_type` varchar(50) DEFAULT NULL,
  `title` varchar(500) DEFAULT NULL,
  `agency` varchar(255) DEFAULT NULL,
  `month` date DEFAULT NULL,
  `certificate_file` varchar(255) DEFAULT NULL,
  `publication_id` varchar(100) DEFAULT NULL,
  `status` enum('draft','submitted') DEFAULT 'draft',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_patents_faculty` (`faculty_id`),
  KEY `idx_patents_status` (`status`),
  KEY `idx_patents_faculty_session` (`faculty_id`,`session_id`),
  CONSTRAINT `patents_ibfk_1` FOREIGN KEY (`faculty_id`) REFERENCES `faculty_information` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `research_grants` (
  `id` int NOT NULL AUTO_INCREMENT,
  `faculty_id` int DEFAULT NULL,
  `session_id` varchar(20) DEFAULT NULL,
  `grant_type` varchar(50) DEFAULT NULL,
  `project_name` varchar(500) DEFAULT NULL,
  `funding_agency` varchar(255) DEFAULT NULL,
  `currency` varchar(10) DEFAULT NULL,
  `grant_amount` decimal(15,2) DEFAULT NULL,
  `amount_in_lakhs` decimal(10,2) DEFAULT NULL,
  `duration` varchar(100) DEFAULT NULL,
  `researchers` varchar(255) DEFAULT NULL,
  `role` varchar(50) DEFAULT NULL,
  `evidence_file` varchar(255) DEFAULT NULL,
  `status` enum('draft','submitted') DEFAULT 'draft',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_grants_faculty` (`faculty_id`),
  KEY `idx_grants_status` (`status`),
  KEY `idx_research_grants_faculty_session` (`faculty_id`,`session_id`),
  CONSTRAINT `research_grants_ibfk_1` FOREIGN KEY (`faculty_id`) REFERENCES `faculty_information` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `research_publications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `faculty_id` int DEFAULT NULL,
  `session_id` varchar(20) DEFAULT NULL,
  `publication_type` varchar(50) DEFAULT NULL,
  `sub_type` varchar(50) DEFAULT NULL,
  `title` varchar(500) DEFAULT NULL,
  `year_of_publication` int DEFAULT NULL,
  `journal_name` varchar(255) DEFAULT NULL,
  `conference_name` varchar(255) DEFAULT NULL,
  `abbreviation` varchar(100) DEFAULT NULL,
  `volume` varchar(50) DEFAULT NULL,
  `number` varchar(50) DEFAULT NULL,
  `pages_from` varchar(20) DEFAULT NULL,
  `pages_to` varchar(20) DEFAULT NULL,
  `date_from` date DEFAULT NULL,
  `date_to` date DEFAULT NULL,
  `type_of_conference` varchar(50) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `state` varchar(100) DEFAULT NULL,
  `country` varchar(100) DEFAULT NULL,
  `publication_agency` varchar(255) DEFAULT NULL,
  `title_of_book` varchar(255) DEFAULT NULL,
  `publication_id` varchar(100) DEFAULT NULL,
  `details` text,
  `status` enum('draft','submitted') DEFAULT 'draft',
  `evidence_file` varchar(255) DEFAULT NULL COMMENT 'Path to uploaded evidence file',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_publications_faculty` (`faculty_id`),
  KEY `idx_publications_evidence` (`evidence_file`),
  KEY `idx_publications_status` (`status`),
  KEY `idx_research_publications_faculty_session` (`faculty_id`,`session_id`),
  CONSTRAINT `research_publications_ibfk_1` FOREIGN KEY (`faculty_id`) REFERENCES `faculty_information` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `review_comments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `submission_id` int NOT NULL,
  `reviewer_id` int DEFAULT NULL,
  `reviewer_role` enum('dofa','dofa_office') DEFAULT NULL,
  `section_name` varchar(255) NOT NULL DEFAULT 'General',
  `section_key` varchar(100) DEFAULT NULL,
  `comment` text NOT NULL,
  `is_resolved` tinyint(1) NOT NULL DEFAULT '0',
  `resolved_at` timestamp NULL DEFAULT NULL,
  `resolved_in_version` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `submission_id` (`submission_id`),
  KEY `reviewer_id` (`reviewer_id`),
  CONSTRAINT `review_comments_ibfk_1` FOREIGN KEY (`submission_id`) REFERENCES `submissions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `review_comments_ibfk_2` FOREIGN KEY (`reviewer_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `rubrics` (
  `id` int NOT NULL AUTO_INCREMENT,
  `category` varchar(255) NOT NULL COMMENT 'Rubric category name',
  `description` text COMMENT 'Detailed description of the rubric',
  `weightage` decimal(5,2) NOT NULL DEFAULT '0.00' COMMENT 'Percentage weight (e.g., 25.00 for 25%)',
  `max_points` int NOT NULL DEFAULT '100' COMMENT 'Maximum points possible',
  `form_type` enum('A','B') NOT NULL COMMENT 'Which form this rubric applies to',
  `is_active` tinyint(1) DEFAULT '1' COMMENT 'Active status',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_form_type` (`form_type`),
  KEY `idx_is_active` (`is_active`),
  CONSTRAINT `chk_max_points` CHECK ((`max_points` > 0)),
  CONSTRAINT `chk_weightage` CHECK (((`weightage` >= 0) and (`weightage` <= 100)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Evaluation rubrics with weightage and scoring criteria';

CREATE TABLE `settings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `key` varchar(100) NOT NULL,
  `value` varchar(255) NOT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `key` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `submission_locks` (
  `id` int NOT NULL AUTO_INCREMENT,
  `submission_id` int NOT NULL,
  `locked_by` int DEFAULT NULL,
  `locked_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `unlocked_at` timestamp NULL DEFAULT NULL,
  `is_locked` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `submission_id` (`submission_id`),
  KEY `locked_by` (`locked_by`),
  CONSTRAINT `submission_locks_ibfk_1` FOREIGN KEY (`submission_id`) REFERENCES `submissions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `submission_locks_ibfk_2` FOREIGN KEY (`locked_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `submission_scores` (
  `id` int NOT NULL AUTO_INCREMENT,
  `submission_id` int NOT NULL COMMENT 'Foreign key to submissions',
  `rubric_id` int NOT NULL COMMENT 'Foreign key to rubrics',
  `score` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT 'Score awarded',
  `comments` text COMMENT 'Evaluator comments',
  `evaluated_by` int DEFAULT NULL COMMENT 'User ID who scored (DOFA)',
  `evaluated_at` timestamp NULL DEFAULT NULL COMMENT 'When the score was given',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_submission_rubric` (`submission_id`,`rubric_id`),
  KEY `idx_submission_id` (`submission_id`),
  KEY `idx_rubric_id` (`rubric_id`),
  KEY `idx_evaluated_by` (`evaluated_by`),
  CONSTRAINT `submission_scores_ibfk_1` FOREIGN KEY (`submission_id`) REFERENCES `submissions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `submission_scores_ibfk_2` FOREIGN KEY (`rubric_id`) REFERENCES `rubrics` (`id`) ON DELETE CASCADE,
  CONSTRAINT `submission_scores_ibfk_3` FOREIGN KEY (`evaluated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `chk_score` CHECK ((`score` >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Individual rubric scores for submissions with evaluator tracking';

CREATE TABLE `submission_versions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `submission_id` int NOT NULL,
  `version_number` int NOT NULL,
  `snapshot_data` longtext NOT NULL,
  `snapshot_note` varchar(255) DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_submission_version` (`submission_id`,`version_number`),
  KEY `idx_submission_versions_submission` (`submission_id`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `submission_versions_ibfk_1` FOREIGN KEY (`submission_id`) REFERENCES `submissions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `submission_versions_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `submissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `faculty_id` int NOT NULL COMMENT 'Foreign key to faculty table',
  `form_type` enum('A','B') NOT NULL COMMENT 'Form A or Form B',
  `status` enum('draft','submitted','submitted_hod','under_review','under_review_hod','hod_approved','approved','sent_back') DEFAULT 'draft',
  `submitted_at` timestamp NULL DEFAULT NULL COMMENT 'When the submission was submitted',
  `locked` tinyint(1) DEFAULT '0' COMMENT 'Prevents editing when true (DOFA control)',
  `total_score` decimal(10,2) DEFAULT '0.00' COMMENT 'Calculated total score',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `academic_year` varchar(20) DEFAULT NULL,
  `approved_by` int DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_faculty_id` (`faculty_id`),
  KEY `idx_form_type` (`form_type`),
  KEY `idx_status` (`status`),
  KEY `idx_locked` (`locked`),
  KEY `idx_submitted_at` (`submitted_at`),
  KEY `idx_submissions_faculty` (`faculty_id`),
  KEY `idx_submissions_status` (`status`),
  KEY `idx_submissions_faculty_workflow` (`faculty_id`),
  KEY `idx_submissions_status_workflow` (`status`),
  KEY `idx_submissions_year` (`academic_year`),
  CONSTRAINT `chk_total_score` CHECK ((`total_score` >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Faculty form submissions with status and scoring';

CREATE TABLE `submitted_proposals` (
  `id` int NOT NULL AUTO_INCREMENT,
  `faculty_id` int DEFAULT NULL,
  `session_id` varchar(20) DEFAULT NULL,
  `title` varchar(500) DEFAULT NULL,
  `funding_agency` varchar(255) DEFAULT NULL,
  `currency` varchar(10) DEFAULT NULL,
  `grant_amount` decimal(15,2) DEFAULT NULL,
  `amount_in_lakhs` decimal(10,2) DEFAULT NULL,
  `duration` varchar(100) DEFAULT NULL,
  `submission_date` date DEFAULT NULL,
  `status` varchar(100) DEFAULT NULL,
  `role` varchar(50) DEFAULT NULL,
  `evidence_file` varchar(255) DEFAULT NULL,
  `submission_status` enum('draft','submitted') DEFAULT 'draft',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_submitted_proposals_faculty_session` (`faculty_id`,`session_id`),
  CONSTRAINT `submitted_proposals_ibfk_1` FOREIGN KEY (`faculty_id`) REFERENCES `faculty_information` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `system_settings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `setting_key` varchar(100) NOT NULL COMMENT 'Unique setting identifier',
  `setting_value` text COMMENT 'Setting value (can be JSON)',
  `description` text COMMENT 'What this setting controls',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `setting_key` (`setting_key`),
  KEY `idx_setting_key` (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='System-wide configuration settings';

CREATE TABLE `teaching_innovation` (
  `id` int NOT NULL AUTO_INCREMENT,
  `faculty_id` int DEFAULT NULL,
  `session_id` varchar(20) DEFAULT NULL,
  `title` varchar(255) DEFAULT NULL,
  `description` text,
  `implementation_date` date DEFAULT NULL,
  `impact` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `evidence_file` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_teaching_innovation_faculty_session` (`faculty_id`,`session_id`),
  CONSTRAINT `teaching_innovation_ibfk_1` FOREIGN KEY (`faculty_id`) REFERENCES `faculty_information` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `technology_transfer` (
  `id` int NOT NULL AUTO_INCREMENT,
  `faculty_id` int DEFAULT NULL,
  `session_id` varchar(20) DEFAULT NULL,
  `title` varchar(500) DEFAULT NULL,
  `technology_type` varchar(64) DEFAULT NULL,
  `description` text,
  `agency` varchar(255) DEFAULT NULL,
  `date` date DEFAULT NULL,
  `evidence_file` varchar(255) DEFAULT NULL COMMENT 'Path to uploaded evidence file',
  `status` enum('draft','submitted') DEFAULT 'draft',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_technology_transfer_faculty_session` (`faculty_id`,`session_id`),
  CONSTRAINT `technology_transfer_ibfk_1` FOREIGN KEY (`faculty_id`) REFERENCES `faculty_information` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) DEFAULT NULL,
  `role` enum('admin','faculty','hod','dofa','dofa_office') DEFAULT 'faculty',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `department` varchar(100) DEFAULT NULL,
  `designation` varchar(100) DEFAULT NULL,
  `employee_id` varchar(50) DEFAULT NULL,
  `employment_type` enum('regular','contractual') DEFAULT NULL,
  `date_of_joining` date DEFAULT NULL,
  `salutation` enum('Prof','Dr','Mr','Ms') DEFAULT NULL,
  `department_id` int DEFAULT NULL,
  `password_reset_token` varchar(255) DEFAULT NULL,
  `password_reset_expires` datetime DEFAULT NULL,
  `onboarding_complete` tinyint(1) NOT NULL DEFAULT '1',
  `is_archived` tinyint(1) NOT NULL DEFAULT '0',
  `archived_at` timestamp NULL DEFAULT NULL,
  `archived_by` int DEFAULT NULL,
  `archive_reason` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_user_email` (`email`),
  KEY `idx_user_role` (`role`),
  KEY `idx_user_active` (`is_active`),
  KEY `idx_users_email` (`email`),
  KEY `idx_users_role` (`role`),
  KEY `idx_users_email_workflow` (`email`),
  KEY `idx_users_role_workflow` (`role`),
  KEY `fk_users_department` (`department_id`),
  CONSTRAINT `fk_users_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='User authentication and role-based access control';

SET FOREIGN_KEY_CHECKS = @fresh_old_fk_checks;

SELECT 45 AS expected_application_tables;
SHOW COLUMNS FROM courses_taught LIKE 'session_id';
SELECT 'appraisal_sessions' AS table_name, COUNT(*) AS row_count FROM `appraisal_sessions`;
SELECT 'audit_logs' AS table_name, COUNT(*) AS row_count FROM `audit_logs`;
SELECT 'authors' AS table_name, COUNT(*) AS row_count FROM `authors`;
SELECT 'awards_honours' AS table_name, COUNT(*) AS row_count FROM `awards_honours`;
SELECT 'conference_sessions' AS table_name, COUNT(*) AS row_count FROM `conference_sessions`;
SELECT 'consultancy' AS table_name, COUNT(*) AS row_count FROM `consultancy`;
SELECT 'courses_taught' AS table_name, COUNT(*) AS row_count FROM `courses_taught`;
SELECT 'departments' AS table_name, COUNT(*) AS row_count FROM `departments`;
SELECT 'Dofa_evaluation_remarks' AS table_name, COUNT(*) AS row_count FROM `Dofa_evaluation_remarks`;
SELECT 'Dofa_evaluation_scores' AS table_name, COUNT(*) AS row_count FROM `Dofa_evaluation_scores`;
SELECT 'Dofa_evaluation_sheet1' AS table_name, COUNT(*) AS row_count FROM `Dofa_evaluation_sheet1`;
SELECT 'Dofa_evaluation_sheet2' AS table_name, COUNT(*) AS row_count FROM `Dofa_evaluation_sheet2`;
SELECT 'Dofa_evaluation_sheet3' AS table_name, COUNT(*) AS row_count FROM `Dofa_evaluation_sheet3`;
SELECT 'Dofa_grade_increments' AS table_name, COUNT(*) AS row_count FROM `Dofa_grade_increments`;
SELECT 'Dofa_grading_parameters' AS table_name, COUNT(*) AS row_count FROM `Dofa_grading_parameters`;
SELECT 'Dofa_rubrics' AS table_name, COUNT(*) AS row_count FROM `Dofa_rubrics`;
SELECT 'dofa_section_scores' AS table_name, COUNT(*) AS row_count FROM `dofa_section_scores`;
SELECT 'dynamic_fields' AS table_name, COUNT(*) AS row_count FROM `dynamic_fields`;
SELECT 'dynamic_responses' AS table_name, COUNT(*) AS row_count FROM `dynamic_responses`;
SELECT 'dynamic_sections' AS table_name, COUNT(*) AS row_count FROM `dynamic_sections`;
SELECT 'edit_requests' AS table_name, COUNT(*) AS row_count FROM `edit_requests`;
SELECT 'editors' AS table_name, COUNT(*) AS row_count FROM `editors`;
SELECT 'faculty_goals' AS table_name, COUNT(*) AS row_count FROM `faculty_goals`;
SELECT 'faculty_information' AS table_name, COUNT(*) AS row_count FROM `faculty_information`;
SELECT 'form_fields' AS table_name, COUNT(*) AS row_count FROM `form_fields`;
SELECT 'institutional_contributions' AS table_name, COUNT(*) AS row_count FROM `institutional_contributions`;
SELECT 'keynotes_talks' AS table_name, COUNT(*) AS row_count FROM `keynotes_talks`;
SELECT 'legacy_section_entries' AS table_name, COUNT(*) AS row_count FROM `legacy_section_entries`;
SELECT 'new_courses' AS table_name, COUNT(*) AS row_count FROM `new_courses`;
SELECT 'paper_reviews' AS table_name, COUNT(*) AS row_count FROM `paper_reviews`;
SELECT 'patents' AS table_name, COUNT(*) AS row_count FROM `patents`;
SELECT 'research_grants' AS table_name, COUNT(*) AS row_count FROM `research_grants`;
SELECT 'research_publications' AS table_name, COUNT(*) AS row_count FROM `research_publications`;
SELECT 'review_comments' AS table_name, COUNT(*) AS row_count FROM `review_comments`;
SELECT 'rubrics' AS table_name, COUNT(*) AS row_count FROM `rubrics`;
SELECT 'settings' AS table_name, COUNT(*) AS row_count FROM `settings`;
SELECT 'submission_locks' AS table_name, COUNT(*) AS row_count FROM `submission_locks`;
SELECT 'submission_scores' AS table_name, COUNT(*) AS row_count FROM `submission_scores`;
SELECT 'submission_versions' AS table_name, COUNT(*) AS row_count FROM `submission_versions`;
SELECT 'submissions' AS table_name, COUNT(*) AS row_count FROM `submissions`;
SELECT 'submitted_proposals' AS table_name, COUNT(*) AS row_count FROM `submitted_proposals`;
SELECT 'system_settings' AS table_name, COUNT(*) AS row_count FROM `system_settings`;
SELECT 'teaching_innovation' AS table_name, COUNT(*) AS row_count FROM `teaching_innovation`;
SELECT 'technology_transfer' AS table_name, COUNT(*) AS row_count FROM `technology_transfer`;
SELECT 'users' AS table_name, COUNT(*) AS row_count FROM `users`;
