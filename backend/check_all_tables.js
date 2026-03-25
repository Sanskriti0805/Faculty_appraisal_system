const db = require('./config/database');
const fs = require('fs');

async function checkAllTables() {
    try {
        const [tables] = await db.query('SHOW TABLES');
        let content = "";

        for (const row of tables) {
            const tableName = Object.values(row)[0];
            const [createTable] = await db.query(`SHOW CREATE TABLE ${tableName}`);
            content += `=== ${tableName.toUpperCase()} TABLE ===\n`;
            content += createTable[0]['Create Table'] + "\n\n";
        }

        fs.writeFileSync('all_tables_schema.txt', content);
        console.log('Schema dumped to all_tables_schema.txt');
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkAllTables();
