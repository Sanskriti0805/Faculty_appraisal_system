/**
 * Migration: Create edit_requests table for faculty section edit request workflow
 * Run: node backend/scripts/migrate_edit_requests.js
 */
const db = require('../config/database');

async function migrate() {
  try {
    // Create edit_requests table
    await db.query(`
      CREATE TABLE IF NOT EXISTS \`edit_requests\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`submission_id\` int NOT NULL,
        \`faculty_id\` int NOT NULL,
        \`requested_sections\` json NOT NULL COMMENT 'Array of section keys requested for edit',
        \`request_message\` text DEFAULT NULL,
        \`status\` enum('pending','approved','denied') DEFAULT 'pending',
        \`approved_sections\` json DEFAULT NULL COMMENT 'Array of section keys approved for edit',
        \`reviewed_by\` int DEFAULT NULL,
        \`reviewed_at\` timestamp NULL DEFAULT NULL,
        \`Dofa_note\` text DEFAULT NULL,
        \`created_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        KEY \`submission_id\` (\`submission_id\`),
        KEY \`faculty_id\` (\`faculty_id\`),
        KEY \`reviewed_by\` (\`reviewed_by\`),
        CONSTRAINT \`edit_requests_ibfk_1\` FOREIGN KEY (\`submission_id\`) REFERENCES \`submissions\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`edit_requests_ibfk_2\` FOREIGN KEY (\`faculty_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`edit_requests_ibfk_3\` FOREIGN KEY (\`reviewed_by\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);
    console.log('âœ… edit_requests table created (or already exists)');

    process.exit(0);
  } catch (error) {
    console.error('âŒ Migration failed:', error.message);
    process.exit(1);
  }
}

migrate();

