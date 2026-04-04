-- Migration: Fix email system
-- Run this against the live database to add missing columns and fix the role enum

-- 1. Fix role enum to include 'hod'
ALTER TABLE users MODIFY COLUMN role ENUM('faculty','hod','dofa','dofa_office') DEFAULT 'faculty';

-- 2. Add missing columns to users table (safe: IF NOT EXISTS)
-- Note: MySQL 8.0.15+ supports ADD COLUMN IF NOT EXISTS via workarounds
-- For compatibility, we use individual ALTER statements that will fail gracefully if column exists

-- department_id
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'department_id');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE users ADD COLUMN department_id INT', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- salutation
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'salutation');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE users ADD COLUMN salutation VARCHAR(20)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- employee_id
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'employee_id');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE users ADD COLUMN employee_id VARCHAR(50)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- employment_type
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'employment_type');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE users ADD COLUMN employment_type VARCHAR(50)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- date_of_joining
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'date_of_joining');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE users ADD COLUMN date_of_joining DATE', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- password_reset_token
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'password_reset_token');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE users ADD COLUMN password_reset_token VARCHAR(255)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- password_reset_expires
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'password_reset_expires');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE users ADD COLUMN password_reset_expires DATETIME', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3. Create departments table if it doesn't exist
CREATE TABLE IF NOT EXISTS departments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) NOT NULL UNIQUE,
  hod_email VARCHAR(255),
  hod_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

SELECT 'Migration completed successfully!' AS result;
