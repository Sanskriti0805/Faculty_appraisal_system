# Fresh college database reset

Send `faculty_appraisal_fresh_empty.sql` to the college database administrator.
It replaces the 45 application tables with empty tables based on the local
database structure exported on 2026-09-28. It includes the `session_id` columns.

**Importing this file deletes existing data in those tables, including all login
accounts, faculty records, departments, sessions, submissions, and grading
configuration. MySQL table drops cannot be undone with a transaction rollback.**

## Import

1. Back up the college database and uploaded files. Stop the application backend
   and any other processes that write to this database.
2. Use MySQL 8.0 or newer. The export was verified on MySQL 8.4.6; other database
   engines and the college server have not been tested.
3. In phpMyAdmin select the database named by the deployed backend's `DB_NAME`,
   then import `faculty_appraisal_fresh_empty.sql`. In MySQL Workbench, select
   that database as the default schema and run the entire SQL file. The file
   deliberately contains no hardcoded database name.
4. Stop if the importer reports an error. A failed import may leave a partial
   reset; restore the backup if needed before resuming service.
5. Confirm that all 45 final row-count results are zero and that the course
   `session_id` column is `varchar(20)`.
6. Provision a new administrator with a secure password using the college's
   account setup process. Configure departments, staff accounts, grading rules,
   and the correct academic year/session. The SQL has no default login.
7. Restart the backend. Save a course draft, reload it, and verify its session,
   feedback score, and uploaded evidence before reopening access to faculty.

## What is blank

There are no INSERT statements, local test accounts, password hashes, saved
session IDs, submissions, or rubric rows in this export. Identity counters start
over. The old fixed `submissions.academic_year` default is cleared to NULL.
DOFA table names use the spelling expected by application queries on
case-sensitive servers.

Rubrics and grading settings must be deliberately configured after the reset.
The repository's `seed_rubrics.sql` is a separate optional configuration seed;
review it against college policy before running it. Do not run test-account or
mock-data seed scripts when setting up the clean college database.

SQL does not delete uploaded files. Archive and clear the college's configured
upload storage separately if old evidence files must also be removed. Any extra
tables that exist only on the college server are outside this export and are
not dropped; compare its table list with the target database before importing.

## Verification performed

Imported the complete file into a separate temporary local database, confirmed
all 45 tables were empty, saved and read a course with an academic-year session
ID and feedback score, and imported the file again to confirm it cleared those
validation records. The temporary database was then removed. The local
application database and the college database were not reset during preparation.

This is a structure export and a database-level course-save check, not a complete
end-to-end validation of every deployed application feature.
