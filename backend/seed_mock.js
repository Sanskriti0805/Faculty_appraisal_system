/**
 * seed_mock.js — Run once to insert realistic test data for the DOFA Office dashboard test.
 * Usage: node seed_mock.js
 * This inserts data for user ID 12 (Sanki) who already has a submitted submission.
 */

const db = require('./config/database');

async function seed() {
  try {
    // -- Find the submission for user 12
    const [subs] = await db.query('SELECT * FROM submissions WHERE faculty_id = 12 LIMIT 1');
    if (subs.length === 0) {
      console.log('❌ No submission found for faculty_id=12. Run the mock submission insert first.');
      process.exit(1);
    }
    const sub = subs[0];
    console.log(`✅ Found submission ID ${sub.id} for faculty 12, academic_year: ${sub.academic_year}`);

    // 1. Courses Taught
    await db.query('DELETE FROM courses_taught WHERE faculty_id = 12');
    await db.query(`INSERT INTO courses_taught (faculty_id, section, semester, course_code, course_name, program, credits, enrollment)
      VALUES
        (12, 'A', 'Odd 2024-25', 'CS101', 'Data Structures', 'B.Tech CSE', 4, 60),
        (12, 'B', 'Odd 2024-25', 'CS201', 'Algorithm Design', 'B.Tech CSE', 4, 55),
        (12, 'A', 'Even 2024-25', 'CS301', 'Machine Learning', 'M.Tech CSE', 3, 30)`);
    console.log('✅ Courses taught seeded');

    // 2. New Courses Developed
    await db.query('DELETE FROM new_courses WHERE faculty_id = 12');
    await db.query(`INSERT INTO new_courses (faculty_id, level_type, program, course_name, course_code, level)
      VALUES 
        (12, 'PG', 'M.Tech CSE', 'Deep Learning Applications', 'CS502', 'PG'),
        (12, 'UG', 'B.Tech CSE', 'Blockchain Fundamentals', 'CS415', 'UG')`);
    console.log('✅ New courses seeded');

    // 3. Research Publications
    await db.query('DELETE FROM research_publications WHERE faculty_id = 12');
    await db.query(`INSERT INTO research_publications (faculty_id, publication_type, sub_type, title, year_of_publication, journal_name)
      VALUES
        (12, 'Journal', 'Q1', 'Deep Reinforcement Learning for Edge Computing', 2024, 'IEEE Trans. on Neural Networks'),
        (12, 'Journal', 'Q2', 'Federated Learning in Healthcare Systems', 2023, 'Elsevier Applied Soft Computing'),
        (12, 'Conference', 'Tier 1', 'Privacy-Preserving ML on IoT Devices', 2024, NULL)`);
    console.log('✅ Publications seeded');

    // 4. Research Grants
    await db.query('DELETE FROM research_grants WHERE faculty_id = 12');
    await db.query(`INSERT INTO research_grants (faculty_id, grant_type, project_name, funding_agency, currency, grant_amount, amount_in_lakhs, duration, role)
      VALUES
        (12, 'Government', 'AI-based Smart Agriculture Monitoring', 'DST-SERB', 'INR', 2500000, 25.0, '3 Years', 'PI'),
        (12, 'Industry', 'ML-powered Fraud Detection System', 'TCS Innovation Labs', 'INR', 800000, 8.0, '1 Year', 'Co-PI')`);
    console.log('✅ Research grants seeded');

    // 5. Patents
    await db.query('DELETE FROM patents WHERE faculty_id = 12');
    await db.query(`INSERT INTO patents (faculty_id, patent_type, title, agency)
      VALUES
        (12, 'Granted', 'System and Method for Real-time Anomaly Detection Using ML', 'Indian Patent Office'),
        (12, 'Published', 'Privacy-aware Federated Learning Framework', 'Indian Patent Office')`);
    console.log('✅ Patents seeded');

    // 6. Awards
    await db.query('DELETE FROM awards_honours WHERE faculty_id = 12');
    await db.query(`INSERT INTO awards_honours (faculty_id, award_name, awarding_agency, year, description)
      VALUES
        (12, 'Best Paper Award', 'IEEE International Conference on AI', 2024, 'Best paper in track: Edge AI Systems'),
        (12, 'Excellence in Research', 'LNMIIT', 2023, 'Institute level research excellence award')`);
    console.log('✅ Awards seeded');

    // 7. Submitted Proposals
    await db.query('DELETE FROM submitted_proposals WHERE faculty_id = 12');
    await db.query(`INSERT INTO submitted_proposals (faculty_id, title, funding_agency, currency, grant_amount, amount_in_lakhs, duration, submission_date, status, role)
      VALUES
        (12, 'Quantum-Enhanced Cryptography for IoT', 'NITI Aayog', 'INR', 5000000, 50.0, '4 Years', '2024-01-15', 'Under Review', 'PI')`);
    console.log('✅ Proposals seeded');

    // 8. Keynotes & Talks
    await db.query('DELETE FROM keynotes_talks WHERE faculty_id = 12');
    await db.query(`INSERT INTO keynotes_talks (faculty_id, title, event_name, date, location, audience_type)
      VALUES
        (12, 'Future of Federated AI', 'NIT Jaipur Tech Symposium', '2024-03-10', 'Jaipur, Rajasthan', 'Academic'),
        (12, 'Ethical AI in Healthcare', 'IIT Jodhpur AI Summit', '2023-11-20', 'Jodhpur, Rajasthan', 'Mixed')`);
    console.log('✅ Keynotes/Talks seeded');

    // 9. Update submission status to submitted (in case it's still draft)
    await db.query(`UPDATE submissions SET status = 'submitted', submitted_at = NOW() WHERE id = ?`, [sub.id]);
    console.log(`✅ Submission ${sub.id} status set to "submitted"`);

    console.log('\n🎉 All mock data seeded successfully!');
    console.log(`   Faculty: Sanki (ID:12) | Submission ID: ${sub.id} | Year: ${sub.academic_year}`);
    console.log('   → Log in as DOFA/DOFA Office to test View, Download, Approve, Reminder.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed error:', err.message);
    process.exit(1);
  }
}

seed();
