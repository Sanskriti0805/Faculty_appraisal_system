const db = require('../config/database');
const { applyNov2026RubricUpdate } = require('../database/rubricUpdateNov2026');

// Applies the Nov 2026 rubric revision to the configured database. Safe to run more than once.
applyNov2026RubricUpdate(db)
  .then((result) => {
    console.log(result.applied ? 'Done.' : `Nothing to do (${result.reason}).`);
    process.exit(0);
  })
  .catch((err) => {
    console.error('Rubric update failed:', err.message);
    process.exit(1);
  });
