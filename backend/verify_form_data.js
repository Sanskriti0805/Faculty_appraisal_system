const db = require('./config/database');

async function verifyFormData(searchQuery = 'abcd') {
  try {
    // 1. Get user details
    const [users] = await db.query('SELECT * FROM users WHERE name LIKE ? OR email LIKE ?', [`%${searchQuery}%`, `%${searchQuery}%`]);
    
    if (users.length === 0) {
      console.log(`❌ User matching "${searchQuery}" not found in database.`);
      const [allUsers] = await db.query('SELECT name, email, role FROM users LIMIT 10');
      console.log('\nAvailable users (first 10):');
      console.table(allUsers);
      process.exit(1);
    }

    const user = users[0];
    const facultyId = user.id;
    console.log(`\n🔍 Found User: ${user.name}`);
    console.log(`📧 Email: ${user.email}`);
    console.log(`🆔 ID: ${facultyId}\n`);

    // 2. Check dynamic responses
    const [responses] = await db.query(`
      SELECT 
        s.title AS section_title,
        f.label AS field_label,
        f.field_type,
        r.value,
        r.updated_at
      FROM dynamic_responses r
      JOIN dynamic_fields f ON r.field_id = f.id
      JOIN dynamic_sections s ON f.section_id = s.id
      WHERE r.faculty_id = ?
      ORDER BY s.sequence, f.sequence
    `, [facultyId]);

    if (responses.length === 0) {
      console.log('⚠️ No dynamic responses found for this user in dynamic_responses table.');
    } else {
      console.log(`✅ Found ${responses.length} responses in dynamic_responses:`);
      
      let currentSection = '';
      responses.forEach(row => {
        if (row.section_title !== currentSection) {
          currentSection = row.section_title;
          console.log(`\n--- SECTION: ${currentSection} ---`);
        }
        
        let displayValue = row.value;
        if (typeof row.value === 'string') {
            try {
                displayValue = JSON.parse(row.value);
            } catch (e) {
                displayValue = row.value;
            }
        }
        
        console.log(`[${row.field_label}]:`, typeof displayValue === 'object' ? JSON.stringify(displayValue, null, 2) : displayValue);
      });
    }

    // 3. Check traditional submission tables
    const standardTables = [
        'publications', 'courses_taught', 'grants', 'patents', 
        'awards', 'reviews', 'innovation', 'consultancy', 'activities'
    ];
    
    console.log('\n--- Checking Standard Tables ---');
    for (const table of standardTables) {
        try {
            const [rows] = await db.query(`SELECT * FROM ${table} WHERE faculty_id = ?`, [facultyId]);
            if (rows.length > 0) {
                console.log(`✅ [${table}]: Found ${rows.length} records`);
            } else {
                console.log(`⚪ [${table}]: 0 records`);
            }
        } catch (e) {
            // Table might not exist or schema is different
        }
    }

    // 4. Check main submissions table
    try {
        const [submissions] = await db.query('SELECT * FROM submissions WHERE faculty_id = ?', [facultyId]);
        if (submissions.length > 0) {
            console.log(`\n✅ Submissions Table: Found ${submissions.length} submission(s)`);
            console.table(submissions.map(s => ({ id: s.id, status: s.status, updated_at: s.updated_at })));
        } else {
            console.log('\n⚠️ No entries in "submissions" table for this user.');
        }
    } catch (e) {}

    process.exit(0);
  } catch (error) {
    console.error('❌ Error verifying data:', error.message);
    process.exit(1);
  }
}

const query = process.argv[2] || 'abcd';
verifyFormData(query);
