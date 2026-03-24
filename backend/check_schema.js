const db = require('./config/database');
const fs = require('fs');

async function checkSchema() {
    try {
        const [rubrics] = await db.query('SHOW CREATE TABLE rubrics');
        let content = "=== RUBRICS TABLE ===\n";
        content += rubrics[0]['Create Table'] + "\n\n";

        const [subs] = await db.query('SHOW CREATE TABLE submission_scores');
        content += "=== SUBMISSION_SCORES TABLE ===\n";
        content += subs[0]['Create Table'] + "\n";
        
        fs.writeFileSync('schema_dump.txt', content);
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkSchema();
