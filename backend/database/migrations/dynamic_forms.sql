-- Migration to support dynamic forms (Form Builder)
CREATE DATABASE IF NOT EXISTS `faculty_appraisal`;
USE `faculty_appraisal`;

CREATE TABLE IF NOT EXISTS `dynamic_sections` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(255) NOT NULL,
  `form_type` ENUM('A', 'B') DEFAULT 'A',
  `sequence` INT DEFAULT 0,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `dynamic_fields` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `section_id` INT NOT NULL,
  `field_type` ENUM('text', 'number', 'textarea', 'table', 'comment') NOT NULL,
  `label` VARCHAR(255) NOT NULL,
  `config` JSON DEFAULT NULL, -- For table columns, etc.
  `sequence` INT DEFAULT 0,
  `is_required` TINYINT(1) DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`section_id`) REFERENCES `dynamic_sections` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `dynamic_responses` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `faculty_id` INT NOT NULL,
  `field_id` INT NOT NULL,
  `submission_id` INT DEFAULT NULL,
  `value` JSON DEFAULT NULL, -- For table data, or simple values
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_resp` (`faculty_id`, `field_id`, `submission_id`),
  FOREIGN KEY (`faculty_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`field_id`) REFERENCES `dynamic_fields` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`submission_id`) REFERENCES `submissions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
