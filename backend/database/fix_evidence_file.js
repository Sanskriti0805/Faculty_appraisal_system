const db = require('../config/database');
const tables = [
  'technology_transfer',
  'paper_reviews',
  'conference_sessions',
  'keynotes_talks',
  'awards_honours',
  'patents',
  'consultancy',
  'teaching_innovation',
  'institutional_contributions',
  'research_grants',
  'courses_taught',
  'research_publications'
];

async function fix() {
  console.log('=== Fixing evidence_file columns for entire project ===');
  for (const t of tables) {
    try {
      const [cols] = await db.query('SHOW COLUMNS FROM ' + t);
      const has = cols.some(c => c.Field === 'evidence_file');
      if (!has) {
        await db.query('ALTER TABLE ' + t + ' ADD COLUMN evidence_file VARCHAR(255) NULL');
        console.log('✅ Added evidence_file to:', t);
      } else {
        console.log('⏭  Already exists in:', t);
      }
    } catch(e) {
      console.log('⚠️  Error on ' + t + ':', e.message);
    }
  }
  console.log('=== All Done ===');
  process.exit(0);
}

fix();
